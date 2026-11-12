import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Info,
  Layers,
  Monitor,
  Plus,
  Sparkles,
} from 'lucide-react';
import { DayTemplate, Subject, TimeBlock } from '../types/study';
import {
  BLOCK_TYPE_META,
  TimelineBlockSegment,
  computeDaySummary,
  getBlockTimestamps,
  getTimelineSegmentsForDate,
  minutesToTime,
} from '../utils/dayPlannerUtils';
import {
  addDays,
  formatMinutesReadable,
  formatReadableDate,
  toLocalDateStr,
} from '../utils/dateUtils';
import { useWakeLock } from '../hooks/useWakeLock';
import { TimeBlockModal } from './TimeBlockModal';
import { Next24HoursModal } from './Next24HoursModal';
import { CopyDayModal } from './CopyDayModal';
import { TemplatesModal } from './TemplatesModal';
import { ExportIcsModal } from './ExportIcsModal';

interface DayPlannerViewProps {
  timeBlocks: TimeBlock[];
  dayTemplates: DayTemplate[];
  subjects: Subject[];
  onSaveSingleBlock: (data: Omit<TimeBlock, 'id'>, existingId?: string) => void;
  onSaveAllRepeatBlocks: (
    templateGroupId: string,
    updates: Pick<
      TimeBlock,
      'title' | 'type' | 'subjectId' | 'startTime' | 'endTime' | 'notes' | 'alarmAtStart' | 'alarm5MinBefore'
    >
  ) => void;
  onDeleteBlock: (blockId: string, deleteAllRepeats?: boolean) => void;
  onSaveWizardBlocks: (blocks: TimeBlock[], replaceNext24h: boolean) => void;
  onSaveManualWizardBlocks: (
    blocks: Array<Omit<TimeBlock, 'id'>>,
    targetDates: string[],
    replaceExisting: boolean
  ) => void;
  onAddSubject: (name: string, color: string) => void;
  onRequestDeleteSubject: (subject: Subject) => void;
  onCopyDayBlocks: (sourceDate: string, targetDates: string[]) => void;
  onSaveTemplate: (name: string, blocks: DayTemplate['blocks']) => void;
  onUpdateTemplate: (template: DayTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onApplyTemplate: (template: DayTemplate, targetDates: string[], templateGroupId: string) => void;
  onRequestAlarmPermissions: () => Promise<NotificationPermission | 'unsupported'>;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

const HOUR_HEIGHT = 54; // px per hour -> 24 * 54 = 1296px
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const DayPlannerView: React.FC<DayPlannerViewProps> = ({
  timeBlocks,
  dayTemplates,
  subjects,
  onSaveSingleBlock,
  onSaveAllRepeatBlocks,
  onDeleteBlock,
  onSaveWizardBlocks,
  onSaveManualWizardBlocks,
  onAddSubject,
  onRequestDeleteSubject,
  onCopyDayBlocks,
  onSaveTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onApplyTemplate,
  onRequestAlarmPermissions,
  onNotify,
}) => {
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateStr());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Modals
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [defaultStartTime, setDefaultStartTime] = useState('09:00');
  const [defaultEndTime, setDefaultEndTime] = useState('10:00');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Desktop drag state for moving / resizing non-carryover blocks
  const [dragState, setDragState] = useState<{
    block: TimeBlock;
    mode: 'move' | 'resize';
    originY: number;
    origStartMin: number;
    origEndMin: number;
    currentStartMin: number;
    currentEndMin: number;
    hasMoved: boolean;
  } | null>(null);

  const wakeLock = useWakeLock();
  const [notifPerm, setNotifPerm] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const today = toLocalDateStr(new Date(nowMs));
  const isToday = selectedDate === today;

  // Update "now" indicator every 15s
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  // Scroll timeline near 07:00 or current time on initial mount
  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    const now = new Date();
    const targetHour = Math.max(0, now.getHours() - 2);
    el.scrollTop = targetHour * HOUR_HEIGHT;
  }, []);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const segments = useMemo(
    () => getTimelineSegmentsForDate(timeBlocks, selectedDate),
    [timeBlocks, selectedDate]
  );

  const summary = useMemo(() => computeDaySummary(segments), [segments]);

  const selectedDayOwnedBlocks = useMemo(
    () => timeBlocks.filter((b) => b.date === selectedDate),
    [timeBlocks, selectedDate]
  );

  // Current & Next block status relative to real Date.now()
  const { currentBlock, nextBlock, nextInMinutes } = useMemo(() => {
    let curr: TimeBlock | null = null;
    let next: TimeBlock | null = null;
    let nextStart = Infinity;

    for (const b of timeBlocks) {
      const { startMs, endMs } = getBlockTimestamps(b);
      if (nowMs >= startMs && nowMs < endMs) {
        curr = b;
      } else if (startMs > nowMs && startMs < nextStart) {
        nextStart = startMs;
        next = b;
      }
    }

    const mins = next ? Math.max(1, Math.round((nextStart - nowMs) / 60000)) : null;
    return { currentBlock: curr, nextBlock: next, nextInMinutes: mins };
  }, [timeBlocks, nowMs]);

  const nowMinutes = useMemo(() => {
    const d = new Date(nowMs);
    return d.getHours() * 60 + d.getMinutes();
  }, [nowMs]);

  // Handle desktop pointer drag move/resize
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaY = e.clientY - dragState.originY;
      const deltaMins = Math.round((deltaY / HOUR_HEIGHT) * 60 / 15) * 15;
      const moved = Math.abs(deltaY) > 4;

      if (dragState.mode === 'move') {
        const dur = dragState.origEndMin - dragState.origStartMin;
        const nextStart = Math.max(0, Math.min(1440 - dur, dragState.origStartMin + deltaMins));
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                currentStartMin: nextStart,
                currentEndMin: nextStart + dur,
                hasMoved: prev.hasMoved || moved,
              }
            : null
        );
      } else {
        const nextEnd = Math.max(
          dragState.origStartMin + 15,
          Math.min(1440, dragState.origEndMin + deltaMins)
        );
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                currentEndMin: nextEnd,
                hasMoved: prev.hasMoved || moved,
              }
            : null
        );
      }
    };

    const handlePointerUp = () => {
      if (dragState.hasMoved) {
        const nextStartStr = minutesToTime(dragState.currentStartMin);
        const nextEndStr = minutesToTime(dragState.currentEndMin);
        if (nextStartStr !== dragState.block.startTime || nextEndStr !== dragState.block.endTime) {
          onSaveSingleBlock(
            {
              ...dragState.block,
              startTime: nextStartStr,
              endTime: nextEndStr,
            },
            dragState.block.id
          );
        }
      } else {
        setEditingBlock(dragState.block);
        setBlockModalOpen(true);
      }
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, onSaveSingleBlock]);

  const openCreateAtHour = (hour: number) => {
    setEditingBlock(null);
    setDefaultStartTime(`${String(hour).padStart(2, '0')}:00`);
    setDefaultEndTime(hour === 23 ? '23:59' : `${String(hour + 1).padStart(2, '0')}:00`);
    setBlockModalOpen(true);
  };

  const handleEnableNotifications = async () => {
    const res = await onRequestAlarmPermissions();
    setNotifPerm(res);
    if (res === 'granted') {
      onNotify('Browser notifications enabled for block alarms.');
    } else if (res === 'denied') {
      onNotify('Notifications are blocked in browser settings.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Date Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Day Planner
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {formatReadableDate(selectedDate)}
            {isToday && <span className="ml-2 font-medium text-indigo-600 dark:text-indigo-400">· Today</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Stepper */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              aria-label="Previous day"
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              aria-label="Next day"
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            aria-label="Jump to date"
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />

          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700 whitespace-nowrap dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Plan next 24 hours</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingBlock(null);
              setDefaultStartTime('09:00');
              setDefaultEndTime('10:00');
              setBlockModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Block</span>
          </button>
        </div>
      </div>

      {/* Live Now / Next + Day Summary Strip */}
      <section className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <div className="p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Schedule Pulse</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-1.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {currentBlock ? `Now: ${currentBlock.title}` : nextBlock ? `Next: ${nextBlock.title}` : 'No upcoming blocks'}
          </div>
          <p className="mt-0.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {nextBlock && nextInMinutes !== null
              ? currentBlock
                ? `Next: ${nextBlock.title} in ${formatMinutesReadable(nextInMinutes)}`
                : `Starts in ${formatMinutesReadable(nextInMinutes)}`
              : currentBlock
                ? `Until ${currentBlock.endTime}`
                : 'Add or generate blocks below'}
          </p>
        </div>

        <div className="p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Study Hours</div>
          <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
            {formatMinutesReadable(summary.studyMinutes)}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {segments.filter((s) => s.block.type === 'study').length} study blocks
          </p>
        </div>

        <div className="p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Break Hours</div>
          <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMinutesReadable(summary.breakMinutes)}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Scheduled recovery</p>
        </div>

        <div className="p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Free Time</div>
          <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formatMinutesReadable(summary.freeMinutes)}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {summary.overlapCount > 0 ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Overlap warning ({summary.overlapCount} blocks)
              </span>
            ) : (
              'Out of 24 hours'
            )}
          </p>
        </div>
      </section>

      {/* Main Grid: Vertical Timeline + Right Controls Rail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Timeline Column */}
        <div className="space-y-4 lg:col-span-8">
          {segments.length === 0 && (
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 text-center sm:flex-row sm:text-left dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                    Nothing scheduled for {isToday ? 'today' : selectedDate}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Auto-build your schedule from now, apply a template, or click any hour slot below.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 whitespace-nowrap dark:bg-indigo-500"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Plan next 24 hours</span>
              </button>
            </div>
          )}

          {/* 00:00 - 24:00 Vertical Timeline */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>00:00 – 24:00 Timeline · Tap block to edit, drag to move/resize</span>
              <span className="font-mono tabular-nums">{segments.length} blocks</span>
            </div>

            <div
              ref={timelineScrollRef}
              className="relative h-[640px] overflow-y-auto select-none"
            >
              <div className="relative" style={{ height: 24 * HOUR_HEIGHT }}>
                {/* Hour Grid Rows */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    className="absolute inset-x-0 flex border-b border-slate-100 dark:border-slate-800/80"
                  >
                    <div className="w-16 shrink-0 border-r border-slate-100 pr-2.5 pt-1 text-right font-mono text-[11px] tabular-nums text-slate-400 dark:border-slate-800 dark:text-slate-500">
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreateAtHour(hour)}
                      aria-label={`Add block at ${String(hour).padStart(2, '0')}:00`}
                      className="flex-1 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                    />
                  </div>
                ))}

                {/* Current Time "Now" Line */}
                {isToday && (
                  <div
                    style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                    className="pointer-events-none absolute left-14 right-0 z-20 flex items-center"
                  >
                    <span className="h-2.5 w-2.5 -translate-x-1 rounded-full bg-rose-600 dark:bg-rose-500" />
                    <div className="h-[2px] flex-1 bg-rose-600 dark:bg-rose-500" />
                  </div>
                )}

                {/* Scheduled Time Blocks */}
                <div className="pointer-events-none absolute inset-y-0 left-16 right-2">
                  {segments.map((seg: TimelineBlockSegment) => {
                    const isDraggingThis = dragState?.block.id === seg.block.id && !seg.isCarryOver;
                    const startMin = isDraggingThis ? dragState.currentStartMin : seg.segmentStartMin;
                    const endMin = isDraggingThis ? dragState.currentEndMin : seg.segmentEndMin;

                    const topPx = (startMin / 60) * HOUR_HEIGHT;
                    const heightPx = Math.max(24, ((endMin - startMin) / 60) * HOUR_HEIGHT);
                    const meta = BLOCK_TYPE_META[seg.block.type];
                    const subj = seg.block.subjectId ? subjectMap.get(seg.block.subjectId) : undefined;

                    const colWidthPct = 100 / seg.totalColumns;
                    const leftPct = seg.column * colWidthPct;

                    const { startMs, endMs } = getBlockTimestamps(seg.block);
                    const isCurrent = nowMs >= startMs && nowMs < endMs;

                    const blockCustomColor = seg.block.customColor;
                    const inlineCustomStyle = blockCustomColor
                      ? {
                          backgroundColor: `${blockCustomColor}1E`,
                          borderColor: `${blockCustomColor}66`,
                        }
                      : undefined;

                    return (
                      <div
                        key={`${seg.block.id}-${seg.isCarryOver ? 'carry' : 'main'}`}
                        style={{
                          top: topPx + 1,
                          height: heightPx - 2,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${colWidthPct}% - 4px)`,
                          ...inlineCustomStyle,
                        }}
                        onPointerDown={(e) => {
                          if (seg.isCarryOver) {
                            setEditingBlock(seg.block);
                            setBlockModalOpen(true);
                            return;
                          }
                          e.stopPropagation();
                          setDragState({
                            block: seg.block,
                            mode: 'move',
                            originY: e.clientY,
                            origStartMin: seg.segmentStartMin,
                            origEndMin: seg.segmentEndMin,
                            currentStartMin: seg.segmentStartMin,
                            currentEndMin: seg.segmentEndMin,
                            hasMoved: false,
                          });
                        }}
                        className={`pointer-events-auto absolute z-10 flex cursor-pointer flex-col justify-between overflow-hidden rounded-lg border px-2.5 py-1.5 transition-shadow ${
                          blockCustomColor
                            ? 'text-slate-900 dark:text-slate-100'
                            : `${meta.bgLight} ${meta.bgDark} ${meta.borderClass} ${meta.textClass}`
                        } ${isCurrent ? 'ring-2 ring-indigo-600 dark:ring-indigo-400' : ''} ${
                          isDraggingThis ? 'z-30 opacity-90 shadow-lg' : 'hover:shadow-sm'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate text-xs font-semibold leading-tight">
                              {seg.block.title}
                            </span>
                            <div className="flex shrink-0 items-center gap-1">
                              {seg.hasOverlap && (
                                <span title="Overlapping block">
                                  <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                </span>
                              )}
                              {(seg.block.alarmAtStart || seg.block.alarm5MinBefore) && (
                                <Bell className="h-3 w-3 opacity-70" />
                              )}
                            </div>
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] opacity-80">
                            <span className="font-mono tabular-nums">
                              {seg.isCarryOver
                                ? `00:00 – ${seg.block.endTime} (from yesterday)`
                                : `${minutesToTime(startMin)} – ${
                                    seg.crossesMidnight ? `${seg.block.endTime} (+1d)` : minutesToTime(endMin)
                                  }`}
                            </span>
                            {subj && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1 truncate font-medium">
                                  <span
                                    className="h-2 w-2 rounded-sm"
                                    style={{ backgroundColor: subj.color }}
                                    aria-hidden="true"
                                  />
                                  {subj.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Bottom Resize Handle (desktop) */}
                        {!seg.isCarryOver && heightPx >= 34 && (
                          <div
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setDragState({
                                block: seg.block,
                                mode: 'resize',
                                originY: e.clientY,
                                origStartMin: seg.segmentStartMin,
                                origEndMin: seg.segmentEndMin,
                                currentStartMin: seg.segmentStartMin,
                                currentEndMin: seg.segmentEndMin,
                                hasMoved: false,
                              });
                            }}
                            title="Drag to resize duration"
                            className="mt-auto h-1.5 w-full cursor-ns-resize rounded-full opacity-40 hover:bg-current hover:opacity-75"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail: Copy / Templates / Calendar Export / Wake Lock / Honest Alarm Notice */}
        <div className="space-y-4 lg:col-span-4">
          {/* Quick Actions Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Schedule Tools
            </h2>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                disabled={selectedDayOwnedBlocks.length === 0}
                onClick={() => setCopyOpen(true)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2.5">
                  <Copy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Copy this day to...</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">{selectedDayOwnedBlocks.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplatesOpen(true)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Templates &amp; Repeat</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">{dayTemplates.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2.5">
                  <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Export to Calendar (.ics)</span>
                </span>
                <CalendarPlus className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </section>

          {/* Alarm Reliability & Wake Lock */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Alarms &amp; Screen Wake Lock
            </h2>

            <div className="mt-3 space-y-3">
              <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                <span className="flex items-center gap-2.5 font-medium text-slate-800 dark:text-slate-200">
                  <Monitor className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Keep screen on so alarms work</span>
                </span>
                <input
                  type="checkbox"
                  disabled={!wakeLock.isSupported}
                  checked={wakeLock.enabled}
                  onChange={wakeLock.toggle}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 disabled:opacity-50"
                />
              </label>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Wake Lock status:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {!wakeLock.isSupported
                    ? 'Not supported by this browser'
                    : wakeLock.enabled
                      ? wakeLock.isActive
                        ? 'Active (screen stays awake)'
                        : 'Pending tab focus'
                      : 'Off'}
                </span>
              </p>

              {notifPerm === 'default' && (
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                >
                  Enable Browser Notifications
                </button>
              )}

              <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <div>
                  Alarms are guaranteed while the app is open. For alarms when the app is closed, use{' '}
                  <button
                    type="button"
                    onClick={() => setExportOpen(true)}
                    className="font-semibold text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400"
                  >
                    Export to Calendar
                  </button>
                  .
                </div>
              </div>
            </div>
          </section>

          {/* Block Type Legend */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Block Types
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {Object.entries(BLOCK_TYPE_META).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: meta.color }}
                    aria-hidden="true"
                  />
                  <span>{meta.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      <TimeBlockModal
        open={blockModalOpen}
        initialBlock={editingBlock}
        defaultDate={selectedDate}
        defaultStartTime={defaultStartTime}
        defaultEndTime={defaultEndTime}
        allBlocks={timeBlocks}
        subjects={subjects}
        onClose={() => setBlockModalOpen(false)}
        onSaveSingle={onSaveSingleBlock}
        onSaveAllRepeats={onSaveAllRepeatBlocks}
        onDelete={onDeleteBlock}
      />

      <Next24HoursModal
        open={wizardOpen}
        defaultDate={selectedDate}
        subjects={subjects}
        onClose={() => setWizardOpen(false)}
        onAddSubject={onAddSubject}
        onDeleteSubject={onRequestDeleteSubject}
        onSaveManualBlocks={onSaveManualWizardBlocks}
        onSaveAutoBlocks={onSaveWizardBlocks}
      />

      <CopyDayModal
        open={copyOpen}
        sourceDate={selectedDate}
        blockCount={selectedDayOwnedBlocks.length}
        onClose={() => setCopyOpen(false)}
        onCopyToDates={(dates) => onCopyDayBlocks(selectedDate, dates)}
      />

      <TemplatesModal
        open={templatesOpen}
        currentDate={selectedDate}
        currentDayBlocks={selectedDayOwnedBlocks}
        templates={dayTemplates}
        subjects={subjects}
        onClose={() => setTemplatesOpen(false)}
        onSaveTemplate={onSaveTemplate}
        onUpdateTemplate={onUpdateTemplate}
        onDeleteTemplate={onDeleteTemplate}
        onApplyTemplate={onApplyTemplate}
      />

      <ExportIcsModal
        open={exportOpen}
        selectedDate={selectedDate}
        allBlocks={timeBlocks}
        templates={dayTemplates}
        subjects={subjects}
        onClose={() => setExportOpen(false)}
        onNotify={onNotify}
      />
    </div>
  );
};
