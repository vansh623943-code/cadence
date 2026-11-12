import { useCallback, useEffect, useRef, useState } from 'react';
import { TimerMode, TimerSettings } from '../types/study';
import { formatClock } from '../utils/dateUtils';
import {
  playAlarm,
  requestNotificationPermission,
  sendStudyNotification,
  unlockAudioContext,
} from '../utils/soundAndNotify';

interface UseTimerOptions {
  settings: TimerSettings;
  onFocusComplete: (durationMinutes: number) => void;
  defaultTitleOverride?: string;
}

const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

const DEFAULT_TITLE = 'Cadence — Study Planner, Timetable & Pomodoro Timer';

export function useTimer({ settings, onFocusComplete, defaultTitleOverride }: UseTimerOptions) {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMinutes * 60);
  const [completedFocusInCycle, setCompletedFocusInCycle] = useState(0);

  const endTimeRef = useRef<number | null>(null);
  const hasStartedCurrentRef = useRef(false);
  const onFocusCompleteRef = useRef(onFocusComplete);
  onFocusCompleteRef.current = onFocusComplete;

  const getDurationSeconds = useCallback(
    (targetMode: TimerMode): number => {
      if (targetMode === 'focus') return Math.max(1, settings.focusMinutes) * 60;
      if (targetMode === 'shortBreak') return Math.max(1, settings.shortBreakMinutes) * 60;
      return Math.max(1, settings.longBreakMinutes) * 60;
    },
    [settings.focusMinutes, settings.shortBreakMinutes, settings.longBreakMinutes]
  );

  useEffect(() => {
    if (!isRunning && !hasStartedCurrentRef.current) {
      setSecondsLeft(getDurationSeconds(mode));
    }
  }, [getDurationSeconds, isRunning, mode]);

  const handleSessionFinished = useCallback(
    (finishedMode: TimerMode) => {
      endTimeRef.current = null;
      hasStartedCurrentRef.current = false;

      if (settings.soundEnabled) {
        const tuneId =
          finishedMode === 'focus'
            ? settings.focusEndTuneId || 'soft-chime'
            : settings.breakEndTuneId || 'temple-bell';
        playAlarm({
          tuneId,
          volume: settings.alarmVolume ?? 0.75,
          duration: settings.alarmDuration ?? '3s',
          label: finishedMode === 'focus' ? 'Focus session complete' : 'Break complete',
          isPreview: false,
        }).catch(() => {});
      }

      if (finishedMode === 'focus') {
        onFocusCompleteRef.current(settings.focusMinutes);
        const nextCycleCount = completedFocusInCycle + 1;
        const interval = Math.max(1, settings.longBreakInterval);
        const isLongBreak = nextCycleCount >= interval;
        const nextMode: TimerMode = isLongBreak ? 'longBreak' : 'shortBreak';

        setCompletedFocusInCycle(isLongBreak ? 0 : nextCycleCount);

        if (settings.notificationsEnabled) {
          sendStudyNotification(
            'Focus session complete',
            isLongBreak
              ? `Great work! Take a ${settings.longBreakMinutes}-minute long break.`
              : `Session logged. Time for a ${settings.shortBreakMinutes}-minute break.`
          );
        }

        const nextDuration = getDurationSeconds(nextMode);
        setMode(nextMode);
        setSecondsLeft(nextDuration);

        if (settings.autoStartBreaks) {
          endTimeRef.current = Date.now() + nextDuration * 1000;
          hasStartedCurrentRef.current = true;
          setIsRunning(true);
        } else {
          setIsRunning(false);
        }
      } else {
        if (settings.notificationsEnabled) {
          sendStudyNotification('Break complete', 'Ready for your next focus session.');
        }
        const nextDuration = getDurationSeconds('focus');
        setMode('focus');
        setSecondsLeft(nextDuration);
        setIsRunning(false);
      }
    },
    [
      completedFocusInCycle,
      getDurationSeconds,
      settings.alarmDuration,
      settings.alarmVolume,
      settings.autoStartBreaks,
      settings.breakEndTuneId,
      settings.focusEndTuneId,
      settings.focusMinutes,
      settings.longBreakInterval,
      settings.longBreakMinutes,
      settings.notificationsEnabled,
      settings.shortBreakMinutes,
      settings.soundEnabled,
    ]
  );

  useEffect(() => {
    if (!isRunning) return;

    const syncRemaining = () => {
      if (endTimeRef.current === null) return;
      const diffMs = endTimeRef.current - Date.now();
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        handleSessionFinished(mode);
      }
    };

    syncRemaining();
    const intervalId = window.setInterval(syncRemaining, 250);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncRemaining();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isRunning, mode, handleSessionFinished]);

  useEffect(() => {
    const idleTitle = defaultTitleOverride || DEFAULT_TITLE;
    const total = getDurationSeconds(mode);
    if (isRunning || (hasStartedCurrentRef.current && secondsLeft < total)) {
      document.title = `${formatClock(secondsLeft)} - ${MODE_LABELS[mode]} · Cadence`;
    } else {
      document.title = idleTitle;
    }
    return () => {
      document.title = idleTitle;
    };
  }, [isRunning, secondsLeft, mode, getDurationSeconds, defaultTitleOverride]);

  const start = useCallback(() => {
    unlockAudioContext();
    if (settings.notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      requestNotificationPermission().catch(() => {});
    }
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    hasStartedCurrentRef.current = true;
    setIsRunning(true);
  }, [secondsLeft, settings.notificationsEnabled]);

  const pause = useCallback(() => {
    if (endTimeRef.current !== null) {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }
    endTimeRef.current = null;
    setIsRunning(false);
  }, []);

  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  const reset = useCallback(() => {
    endTimeRef.current = null;
    hasStartedCurrentRef.current = false;
    setIsRunning(false);
    setSecondsLeft(getDurationSeconds(mode));
  }, [getDurationSeconds, mode]);

  const switchMode = useCallback(
    (nextMode: TimerMode) => {
      endTimeRef.current = null;
      hasStartedCurrentRef.current = false;
      setIsRunning(false);
      setMode(nextMode);
      setSecondsLeft(getDurationSeconds(nextMode));
    },
    [getDurationSeconds]
  );

  const skip = useCallback(() => {
    endTimeRef.current = null;
    hasStartedCurrentRef.current = false;
    setIsRunning(false);

    if (mode === 'focus') {
      const nextCycleCount = completedFocusInCycle + 1;
      const interval = Math.max(1, settings.longBreakInterval);
      const isLongBreak = nextCycleCount >= interval;
      const nextMode: TimerMode = isLongBreak ? 'longBreak' : 'shortBreak';
      setCompletedFocusInCycle(isLongBreak ? 0 : nextCycleCount);
      setMode(nextMode);
      setSecondsLeft(getDurationSeconds(nextMode));
    } else {
      setMode('focus');
      setSecondsLeft(getDurationSeconds('focus'));
    }
  }, [completedFocusInCycle, getDurationSeconds, mode, settings.longBreakInterval]);

  const totalSeconds = getDurationSeconds(mode);
  const progress = totalSeconds > 0 ? Math.min(1, Math.max(0, (totalSeconds - secondsLeft) / totalSeconds)) : 0;

  return {
    mode,
    modeLabel: MODE_LABELS[mode],
    isRunning,
    secondsLeft,
    totalSeconds,
    progress,
    completedFocusInCycle,
    start,
    pause,
    toggle,
    reset,
    skip,
    switchMode,
  };
}
