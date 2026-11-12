import { useCallback, useEffect, useRef, useState } from 'react';
import { BlockType, TimeBlock, TimerSettings } from '../types/study';
import { getBlockTimestamps } from '../utils/dayPlannerUtils';
import {
  playAlarm,
  requestNotificationPermission,
  sendBlockNotification,
  stopAlarm,
} from '../utils/soundAndNotify';

export interface ActiveBlockAlarm {
  key: string;
  title: string;
  subtitle: string;
  block: TimeBlock;
  kind: 'start' | 'pre5' | 'snooze';
}

interface SnoozeEntry {
  id: string;
  triggerAtMs: number;
  block: TimeBlock;
}

const FIRED_STORAGE_KEY = 'cadence-fired-block-alarms-v1';

function loadFiredSet(): Set<string> {
  try {
    const raw = window.localStorage.getItem(FIRED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr.slice(-300));
  } catch {
    return new Set();
  }
}

function saveFiredSet(set: Set<string>) {
  try {
    const arr = Array.from(set).slice(-300);
    window.localStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Ignore quota errors
  }
}

function resolveTuneForBlock(type: BlockType, settings: TimerSettings): string {
  const perType = settings.blockTypeTunes?.[type];
  if (perType) return perType;
  if (type === 'break') return settings.breakEndTuneId || 'temple-bell';
  return settings.focusEndTuneId || 'soft-chime';
}

export function useBlockAlarms(blocks: TimeBlock[], settings: TimerSettings) {
  const [activeBlockAlarm, setActiveBlockAlarm] = useState<ActiveBlockAlarm | null>(null);
  const firedRef = useRef<Set<string>>(loadFiredSet());
  const snoozesRef = useRef<SnoozeEntry[]>([]);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const triggerAlarm = useCallback((entry: ActiveBlockAlarm) => {
    const cfg = settingsRef.current;
    setActiveBlockAlarm(entry);

    if (cfg.soundEnabled) {
      const tuneId = resolveTuneForBlock(entry.block.type, cfg);
      playAlarm({
        tuneId,
        volume: cfg.alarmVolume ?? 0.75,
        duration: cfg.alarmDuration ?? '3s',
        label: entry.title,
        isPreview: false,
      }).catch(() => {});
    }

    if (cfg.notificationsEnabled) {
      sendBlockNotification(entry.title, entry.subtitle, entry.key).catch(() => {});
    }
  }, []);

  // Check every second against Date.now() + recompute on visibilitychange
  useEffect(() => {
    const checkAlarms = () => {
      const nowMs = Date.now();
      const GRACE_WINDOW_MS = 45 * 1000;

      // 1. Check scheduled blocks
      for (const block of blocksRef.current) {
        if (!block.alarmAtStart && !block.alarm5MinBefore) continue;
        const { startMs } = getBlockTimestamps(block);

        if (block.alarm5MinBefore) {
          const preMs = startMs - 5 * 60 * 1000;
          const preKey = `${block.id}:pre5:${preMs}`;
          if (!firedRef.current.has(preKey) && nowMs >= preMs && nowMs - preMs <= GRACE_WINDOW_MS) {
            firedRef.current.add(preKey);
            saveFiredSet(firedRef.current);
            triggerAlarm({
              key: preKey,
              title: `In 5 min: ${block.title}`,
              subtitle: `Starts at ${block.startTime}`,
              block,
              kind: 'pre5',
            });
          }
        }

        if (block.alarmAtStart) {
          const startKey = `${block.id}:start:${startMs}`;
          if (!firedRef.current.has(startKey) && nowMs >= startMs && nowMs - startMs <= GRACE_WINDOW_MS) {
            firedRef.current.add(startKey);
            saveFiredSet(firedRef.current);
            triggerAlarm({
              key: startKey,
              title: `Starting now: ${block.title}`,
              subtitle: `${block.startTime} – ${block.endTime}`,
              block,
              kind: 'start',
            });
          }
        }
      }

      // 2. Check snoozed alarms
      if (snoozesRef.current.length > 0) {
        const remaining: SnoozeEntry[] = [];
        for (const sn of snoozesRef.current) {
          if (nowMs >= sn.triggerAtMs) {
            triggerAlarm({
              key: sn.id,
              title: `Snoozed: ${sn.block.title}`,
              subtitle: `${sn.block.startTime} – ${sn.block.endTime}`,
              block: sn.block,
              kind: 'snooze',
            });
          } else {
            remaining.push(sn);
          }
        }
        snoozesRef.current = remaining;
      }
    };

    checkAlarms();
    const intervalId = window.setInterval(checkAlarms, 1000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAlarms();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [triggerAlarm]);

  const dismissBlockAlarm = useCallback(() => {
    stopAlarm();
    setActiveBlockAlarm(null);
  }, []);

  const snoozeBlockAlarm = useCallback((minutes: number = 5) => {
    stopAlarm();
    setActiveBlockAlarm((curr) => {
      if (curr) {
        snoozesRef.current.push({
          id: `snooze-${Date.now().toString(36)}`,
          triggerAtMs: Date.now() + minutes * 60 * 1000,
          block: curr.block,
        });
      }
      return null;
    });
  }, []);

  const requestAlarmPermissions = useCallback(async () => {
    return requestNotificationPermission();
  }, []);

  return {
    activeBlockAlarm,
    dismissBlockAlarm,
    snoozeBlockAlarm,
    requestAlarmPermissions,
  };
}
