import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  BellOff,
  Calendar,
  Coffee,
  Plus,
  Repeat,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { BlockType, Subject, TimeBlock } from '../types/study';
import { SUBJECT_COLORS } from '../data/seedData';
import {
  BLOCK_TYPE_META,
  WizardMealConfig,
  addMinutesToClock,
  analyzeScheduleRows,
  doesBlockCrossMidnight,
  generateNext24HoursPlan,
  getBlockDurationMinutes,
  timeToMinutes,
} from '../utils/dayPlannerUtils';
import { addDays, formatMinutesReadable, formatShortDate, toLocalDateStr } from '../utils/dateUtils';

interface Next24HoursModalProps {
  open: boolean;
  defaultDate: string;
  subjects: Subject[];
  onClose: () => void;
  onAddSubject: (name: string, color: string) => void;
  onDeleteSubject: (subject: Subject) => void;
  onSaveManualBlocks: (
    blocks: Array<Omit<TimeBlock, 'id'>>,
    targetDates: string[],
    replaceExisting: boolean
  ) => void;
  onSaveAutoBlocks: (blocks: TimeBlock[], replaceNext24h: boolean) => void;
}

interface BuilderRow {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: BlockType;
  color: string;
  subjectId: string;
  alarmAtStart: boolean;
  enabled: boolean;
}

const QUICK_CHIPS: Array<{ label: string; type: BlockType; defaultMinutes: number }> = [
  { label: 'Wake up', type: 'other', defaultMinutes: 30 },
  { label: 'Breakfast', type: 'meal', defaultMinutes: 30 },
  { label: 'Study', type: 'study', defaultMinutes: 60 },
  { label: 'Break', type: 'break', defaultMinutes: 15 },
  { label: 'Lunch', type: 'meal', defaultMinutes: 45 },
  { label: 'Washroom', type: 'other', defaultMinutes: 15 },
  { label: 'Dinner', type: 'meal', defaultMinutes: 45 },
  { label: 'Sleep', type: 'sleep', defaultMinutes: 480 },
];

const DEFAULT_MEALS: WizardMealConfig[] = [
  { enabled: true, label: 'Breakfast', time: '08:00', durationMinutes: 30 },
  { enabled: true, label: 'Lunch', time: '12:30', durationMinutes: 45 },
  { enabled: true, label: 'Dinner', time: '19:00', durationMinutes: 45 },
];

function makeRowId(): string {
  return `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const Next24HoursModal: React.FC<Next24HoursModalProps> = ({
  open,
  defaultDate,
  subjects,
  onClose,
  onAddSubject,
  onDeleteSubject,
  onSaveManualBlocks,
  onSaveAutoBlocks,
}) => {
  // Default to Manual Mode
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');

  // Inline Subject Creator State (no hard-coded subjects!)
  const [showSubjectPanel, setShowSubjectPanel] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjColor, setNewSubjColor] = useState(SUBJECT_COLORS[0].hex);

  // Manual Mode State
  const [manualRows, setManualRows] = useState<BuilderRow[]>([]);
  const [breakHelperMinutes, setBreakHelperMinutes] = useState(15);
  const [targetDate, setTargetDate] = useState(defaultDate || toLocalDateStr());
  const [multiDateEnabled, setMultiDateEnabled] = useState(false);
  const [extraDates, setExtraDates] = useState<string[]>([]);
  const [extraDateInput, setExtraDateInput] = useState('');
  const [replaceTargetDays, setReplaceTargetDays] = useState(false);

  // Auto Mode State
  const [autoStep, setAutoStep] = useState<'inputs' | 'preview'>('inputs');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [totalStudyHours, setTotalStudyHours] = useState(6);
  const [sessionLength, setSessionLength] = useState(50);
  const [breakLength, setBreakLength] = useState(10);
  const [meals, setMeals] = useState<WizardMealConfig[]>(DEFAULT_MEALS);
  const [subjectWeights, setSubjectWeights] = useState<Record<string, number>>({});
  const [alarmAtStart, setAlarmAtStart] = useState(true);
  const [alarm5MinBefore, setAlarm5MinBefore] = useState(false);
  const [autoPreviewRows, setAutoPreviewRows] = useState<Array<BuilderRow & { date: string; alarm5MinBefore: boolean }>>([]);
  const [replaceNext24h, setReplaceNext24h] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('manual');
    setAutoStep('inputs');
    setTargetDate(defaultDate || toLocalDateStr());
    setMultiDateEnabled(false);
    setExtraDates([]);
    setExtraDateInput(addDays(defaultDate || toLocalDateStr(), 1));
    setShowSubjectPanel(false);
    setNewSubjName('');

    setManualRows((prev) =>
      prev.length > 0
        ? prev
        : [
            {
              id: makeRowId(),
              title: 'Study',
              startTime: '09:00',
              endTime: '11:00',
              type: 'study',
              color: BLOCK_TYPE_META.study.color,
              subjectId: '',
              alarmAtStart: true,
              enabled: true,
            },
          ]
    );
  }, [open, defaultDate]);

  // Sync subject weights strictly with user's actual subjects
  useEffect(() => {
    setSubjectWeights((prev) => {
      const next: Record<string, number> = {};
      subjects.forEach((s) => {
        next[s.id] = prev[s.id] ?? 1;
      });
      return next;
    });
  }, [subjects]);

  const manualAnalysis = useMemo(
    () => analyzeScheduleRows(manualRows.filter((r) => r.enabled)),
    [manualRows]
  );

  const autoAnalysis = useMemo(
    () => analyzeScheduleRows(autoPreviewRows.filter((r) => r.enabled)),
    [autoPreviewRows]
  );

  if (!open) return null;

  const handleCreateInlineSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubjName.trim();
    if (!trimmed) return;
    onAddSubject(trimmed, newSubjColor);
    setNewSubjName('');
  };

  // Manual row actions
  const getNextStartTime = (): string => {
    if (manualRows.length === 0) return '07:00';
    const last = manualRows[manualRows.length - 1];
    return last.endTime === '24:00' ? '00:00' : last.endTime;
  };

  const addManualRow = (preset?: { label: string; type: BlockType; defaultMinutes: number }) => {
    const start = getNextStartTime();
    const dur = preset?.defaultMinutes ?? 60;
    const end = addMinutesToClock(start, dur);
    const rowType: BlockType = preset?.type ?? 'study';
    setManualRows((prev) => [
      ...prev,
      {
        id: makeRowId(),
        title: preset?.label ?? 'Activity',
        startTime: start,
        endTime: end,
        type: rowType,
        color: BLOCK_TYPE_META[rowType].color,
        subjectId: '',
        alarmAtStart: true,
        enabled: true,
      },
    ]);
  };

  const addBreakAfterLast = () => {
    const start = getNextStartTime();
    const mins = Math.max(5, Math.min(180, Number(breakHelperMinutes) || 15));
    const end = addMinutesToClock(start, mins);
    setManualRows((prev) => [
      ...prev,
      {
        id: makeRowId(),
        title: 'Break',
        startTime: start,
        endTime: end,
        type: 'break',
        color: BLOCK_TYPE_META.break.color,
        subjectId: '',
        alarmAtStart: true,
        enabled: true,
      },
    ]);
  };

  const repeatLastPattern = () => {
    if (manualRows.length === 0) return;
    // If last two rows are Study + Break, repeat the pair; otherwise repeat the last row
    const len = manualRows.length;
    const isStudyBreakPair =
      len >= 2 && manualRows[len - 2].type === 'study' && manualRows[len - 1].type === 'break';
    const patternRows = isStudyBreakPair ? [manualRows[len - 2], manualRows[len - 1]] : [manualRows[len - 1]];

    let cursorStart = getNextStartTime();
    const appended: BuilderRow[] = patternRows.map((src) => {
      const dur = getBlockDurationMinutes(src.startTime, src.endTime);
      const nextEnd = addMinutesToClock(cursorStart, dur);
      const copy: BuilderRow = {
        ...src,
        id: makeRowId(),
        startTime: cursorStart,
        endTime: nextEnd,
      };
      cursorStart = nextEnd;
      return copy;
    });

    setManualRows((prev) => [...prev, ...appended]);
  };

  const updateManualRow = (id: string, patch: Partial<BuilderRow>) => {
    setManualRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const moveManualRow = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= manualRows.length) return;
    setManualRows((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const deleteManualRow = (id: string) => {
    setManualRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSaveManual = () => {
    const activeRows = manualRows.filter((r) => r.enabled);
    if (activeRows.length === 0) return;

    const allDates = multiDateEnabled
      ? Array.from(new Set([targetDate, ...extraDates])).sort()
      : [targetDate];

    const blocksPayload: Array<Omit<TimeBlock, 'id'>> = activeRows.map((r) => ({
      date: targetDate, // Replaced per target date in App handler
      startTime: r.startTime,
      endTime: r.endTime === '00:00' && r.startTime !== '00:00' ? '24:00' : r.endTime,
      title: r.title.trim() || BLOCK_TYPE_META[r.type].label,
      type: r.type,
      customColor: r.color,
      subjectId: r.subjectId,
      notes: '',
      alarmAtStart: r.alarmAtStart,
      alarm5MinBefore: false,
    }));

    onSaveManualBlocks(blocksPayload, allDates, replaceTargetDays);
    onClose();
  };

  // Auto mode generation
  const handleGenerateAuto = (e: React.FormEvent) => {
    e.preventDefault();
    const generated = generateNext24HoursPlan({
      wakeTime,
      sleepTime,
      totalStudyHours,
      sessionLengthMinutes: sessionLength,
      breakLengthMinutes: breakLength,
      meals,
      subjectWeights,
      subjects,
      alarmAtStart,
      alarm5MinBefore,
    });

    setAutoPreviewRows(
      generated.map((b) => ({
        id: b.id,
        date: b.date,
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
        type: b.type,
        color: b.customColor || BLOCK_TYPE_META[b.type].color,
        subjectId: b.subjectId,
        alarmAtStart: b.alarmAtStart,
        alarm5MinBefore: b.alarm5MinBefore,
        enabled: true,
      }))
    );
    setAutoStep('preview');
  };

  const handleSaveAuto = () => {
    const finalBlocks: TimeBlock[] = autoPreviewRows
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime === '00:00' && r.startTime !== '00:00' ? '24:00' : r.endTime,
        title: r.title.trim() || BLOCK_TYPE_META[r.type].label,
        type: r.type,
        customColor: r.color,
        subjectId: r.subjectId,
        notes: '',
        alarmAtStart: r.alarmAtStart,
        alarm5MinBefore: r.alarm5MinBefore,
      }));
    onSaveAutoBlocks(finalBlocks, replaceNext24h);
    onClose();
  };

  const lastRow = manualRows[manualRows.length - 1];

  // Build ordered rows + inline Free Time gap markers for Manual Mode
  const sortedForGaps = [...manualRows].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
  const gapAfterIdMap = new Map<string, { minutes: number; start: string; end: string }>();
  for (let i = 0; i < sortedForGaps.length - 1; i++) {
    const cur = sortedForGaps[i];
    const nxt = sortedForGaps[i + 1];
    if (!cur.enabled || !nxt.enabled) continue;
    const curCrosses = doesBlockCrossMidnight(cur.startTime, cur.endTime);
    if (curCrosses) continue;
    const curEnd = timeToMinutes(cur.endTime);
    const nxtStart = timeToMinutes(nxt.startTime);
    if (nxtStart > curEnd) {
      gapAfterIdMap.set(cur.id, {
        minutes: nxtStart - curEnd,
        start: cur.endTime,
        end: nxt.startTime,
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Top Bar with Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-4">
            <h2
              id="wizard-modal-title"
              className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Plan Next 24 Hours
            </h2>

            <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'manual'}
                onClick={() => setMode('manual')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  mode === 'manual'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                Manual mode
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'auto'}
                onClick={() => setMode('auto')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  mode === 'auto'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                Auto mode
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSubjectPanel((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Subjects ({subjects.length})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close wizard"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Inline Subjects Panel (User's Own Subjects Only) */}
        {showSubjectPanel && (
          <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Subjects
              </span>
              <form onSubmit={handleCreateInlineSubject} className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={newSubjColor}
                  onChange={(e) => setNewSubjColor(e.target.value)}
                  aria-label="New subject color"
                  className="h-7 w-7 cursor-pointer rounded border border-slate-200 bg-transparent p-0 dark:border-slate-700"
                />
                <input
                  type="text"
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  placeholder="New subject name..."
                  className="w-44 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={!newSubjName.trim()}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add subject</span>
                </button>
              </form>
            </div>

            {subjects.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                No subjects created yet. Add your own courses above to tag blocks by subject.
              </p>
            ) : (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <div
                    key={s.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: s.color }}
                      aria-hidden="true"
                    />
                    <span>{s.name}</span>
                    <button
                      type="button"
                      onClick={() => onDeleteSubject(s)}
                      aria-label={`Delete subject ${s.name}`}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MANUAL MODE */}
        {mode === 'manual' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {/* Quick-add activity chips */}
              <div>
                <div className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Quick-add activity (auto-fills start time from previous row)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => addManualRow(chip)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/60"
                    >
                      <Plus className="h-3 w-3 opacity-70" />
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlap Warning */}
              {manualAnalysis.overlappingIds.size > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Some rows overlap in time. Adjust start/end times below if unintended.</span>
                </div>
              )}

              {/* Row-by-Row Builder List */}
              <div className="space-y-2">
                {manualRows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Click any quick-add chip above or &ldquo;+ Add row&rdquo; below to start building your day.
                  </div>
                ) : (
                  manualRows.map((row, index) => {
                    const isOverlapping = manualAnalysis.overlappingIds.has(row.id);
                    const crosses = doesBlockCrossMidnight(row.startTime, row.endTime);
                    const dur = getBlockDurationMinutes(row.startTime, row.endTime);
                    const gapAfter = gapAfterIdMap.get(row.id);

                    return (
                      <React.Fragment key={row.id}>
                        <div
                          className={`flex flex-wrap items-center gap-2 rounded-xl border p-2.5 transition-colors ${
                            isOverlapping
                              ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
                              : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40'
                          }`}
                        >
                          {/* Color Picker */}
                          <input
                            type="color"
                            value={row.color}
                            onChange={(e) => updateManualRow(row.id, { color: e.target.value })}
                            title="Block color"
                            aria-label="Row color"
                            className="h-7 w-7 shrink-0 cursor-pointer rounded border border-slate-200 bg-transparent p-0 dark:border-slate-700"
                          />

                          {/* Activity Name */}
                          <input
                            type="text"
                            value={row.title}
                            onChange={(e) => updateManualRow(row.id, { title: e.target.value })}
                            placeholder="Activity name..."
                            aria-label="Activity name"
                            className="min-w-[140px] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />

                          {/* Type */}
                          <select
                            value={row.type}
                            onChange={(e) => {
                              const nextType = e.target.value as BlockType;
                              updateManualRow(row.id, {
                                type: nextType,
                                color: BLOCK_TYPE_META[nextType].color,
                              });
                            }}
                            aria-label="Activity type"
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          >
                            {Object.entries(BLOCK_TYPE_META).map(([k, meta]) => (
                              <option key={k} value={k}>
                                {meta.label}
                              </option>
                            ))}
                          </select>

                          {/* Start - End */}
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={row.startTime}
                              onChange={(e) => updateManualRow(row.id, { startTime: e.target.value })}
                              aria-label="Start time"
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                            <span className="text-xs text-slate-400">–</span>
                            <input
                              type="time"
                              value={row.endTime === '24:00' ? '00:00' : row.endTime}
                              onChange={(e) => updateManualRow(row.id, { endTime: e.target.value })}
                              aria-label="End time"
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                            <span className="w-12 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                              {formatMinutesReadable(dur)}
                              {crosses ? ' +1d' : ''}
                            </span>
                          </div>

                          {/* Subject */}
                          <select
                            value={row.subjectId}
                            onChange={(e) => updateManualRow(row.id, { subjectId: e.target.value })}
                            aria-label="Subject"
                            className="max-w-[140px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          >
                            <option value="">No subject</option>
                            {subjects.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>

                          {/* Alarm Toggle */}
                          <button
                            type="button"
                            onClick={() => updateManualRow(row.id, { alarmAtStart: !row.alarmAtStart })}
                            aria-label={row.alarmAtStart ? 'Disable alarm' : 'Enable alarm'}
                            title={row.alarmAtStart ? 'Alarm ON' : 'Alarm OFF'}
                            className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                              row.alarmAtStart
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'
                            }`}
                          >
                            {row.alarmAtStart ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                          </button>

                          {/* Reorder & Delete */}
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveManualRow(index, -1)}
                              aria-label="Move row up"
                              className="rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === manualRows.length - 1}
                              onClick={() => moveManualRow(index, 1)}
                              aria-label="Move row down"
                              className="rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteManualRow(row.id)}
                              aria-label={`Delete ${row.title}`}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Free Time Gap Indicator */}
                        {gapAfter && (
                          <div className="flex items-center gap-2 px-3 py-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                            <span className="font-mono tabular-nums">
                              Free time: {formatMinutesReadable(gapAfter.minutes)} ({gapAfter.start} – {gapAfter.end})
                            </span>
                            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              {/* Row Actions: + Add row, Add a break after this, Repeat last pattern */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => addManualRow()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add row</span>
                </button>

                {lastRow && lastRow.type === 'study' && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <button
                      type="button"
                      onClick={addBreakAfterLast}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
                    >
                      <Coffee className="h-3.5 w-3.5" />
                      <span>Add a break after this</span>
                    </button>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      step={5}
                      aria-label="Break length in minutes"
                      value={breakHelperMinutes}
                      onChange={(e) => setBreakHelperMinutes(Number(e.target.value))}
                      className="w-12 rounded border border-emerald-200 bg-white px-1.5 py-0.5 font-mono text-xs tabular-nums text-slate-900 dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">m</span>
                  </div>
                )}

                {manualRows.length > 0 && (
                  <button
                    type="button"
                    onClick={repeatLastPattern}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Repeat className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Repeat last row&apos;s pattern</span>
                  </button>
                )}
              </div>

              {/* Live 24h Mini-Timeline Preview + Total Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    24-Hour Mini-Timeline Preview
                  </span>
                  <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    <span>
                      Study:{' '}
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {formatMinutesReadable(manualAnalysis.studyMinutes)}
                      </strong>
                    </span>
                    <span>
                      Break:{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {formatMinutesReadable(manualAnalysis.breakMinutes)}
                      </strong>
                    </span>
                    <span>
                      Free:{' '}
                      <strong>{formatMinutesReadable(manualAnalysis.freeMinutes)}</strong>
                    </span>
                  </div>
                </div>

                <div className="relative h-7 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-200/70 dark:border-slate-700 dark:bg-slate-900">
                  {manualAnalysis.normalizedIntervals.map((seg) => {
                    const leftPct = (seg.startMin / 1440) * 100;
                    const widthPct = Math.max(0.8, ((seg.endMin - seg.startMin) / 1440) * 100);
                    return (
                      <div
                        key={seg.row.id}
                        title={`${seg.row.title} (${seg.row.startTime}–${seg.row.endTime})`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: seg.row.color,
                        }}
                        className="absolute inset-y-0 border-r border-white/40 opacity-90"
                      />
                    );
                  })}
                </div>
                <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
              </div>

              {/* Target Date + Multi-date option */}
              <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <label htmlFor="manual-target-date" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Save for Date
                    </label>
                    <input
                      id="manual-target-date"
                      type="date"
                      value={targetDate}
                      onChange={(e) => e.target.value && setTargetDate(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={multiDateEnabled}
                        onChange={(e) => setMultiDateEnabled(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <span>Apply to multiple dates</span>
                    </label>

                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={replaceTargetDays}
                        onChange={(e) => setReplaceTargetDays(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <span>Replace existing blocks on target date(s)</span>
                    </label>
                  </div>
                </div>

                {multiDateEnabled && (
                  <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        value={extraDateInput}
                        onChange={(e) => setExtraDateInput(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (extraDateInput && extraDateInput !== targetDate && !extraDates.includes(extraDateInput)) {
                            setExtraDates((prev) => [...prev, extraDateInput].sort());
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add date</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next3 = [1, 2, 3].map((i) => addDays(targetDate, i));
                          setExtraDates((prev) => Array.from(new Set([...prev, ...next3])).sort());
                        }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        + Next 3 days
                      </button>
                    </div>

                    {extraDates.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {extraDates.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <span>{formatShortDate(d)}</span>
                            <button
                              type="button"
                              onClick={() => setExtraDates((prev) => prev.filter((x) => x !== d))}
                              className="text-slate-400 hover:text-rose-600"
                              aria-label={`Remove ${d}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {manualRows.filter((r) => r.enabled).length} blocks ready
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={manualRows.filter((r) => r.enabled).length === 0}
                  onClick={handleSaveManual}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  Save to Day Planner
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AUTO MODE */}
        {mode === 'auto' && autoStep === 'inputs' && (
          <form onSubmit={handleGenerateAuto} className="flex-1 space-y-5 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="wiz-wake" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Wake Time
                </label>
                <input
                  id="wiz-wake"
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="wiz-sleep" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Sleep Time
                </label>
                <input
                  id="wiz-sleep"
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="wiz-hours" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Total Study Hours
                </label>
                <input
                  id="wiz-hours"
                  type="number"
                  min={0.5}
                  max={16}
                  step={0.5}
                  value={totalStudyHours}
                  onChange={(e) => setTotalStudyHours(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="wiz-sess" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Study Session Length (min)
                </label>
                <input
                  id="wiz-sess"
                  type="number"
                  min={15}
                  max={180}
                  step={5}
                  value={sessionLength}
                  onChange={(e) => setSessionLength(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label htmlFor="wiz-break" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Break Length (min)
                </label>
                <input
                  id="wiz-break"
                  type="number"
                  min={5}
                  max={60}
                  step={5}
                  value={breakLength}
                  onChange={(e) => setBreakLength(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Meal Times */}
            <div>
              <span className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">Meal Times</span>
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                {meals.map((meal, idx) => (
                  <div key={meal.label} className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={meal.enabled}
                        onChange={(e) =>
                          setMeals((prev) =>
                            prev.map((m, i) => (i === idx ? { ...m, enabled: e.target.checked } : m))
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{meal.label}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        disabled={!meal.enabled}
                        value={meal.time}
                        onChange={(e) =>
                          setMeals((prev) =>
                            prev.map((m, i) => (i === idx ? { ...m, time: e.target.value } : m))
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <input
                        type="number"
                        min={15}
                        max={120}
                        step={5}
                        disabled={!meal.enabled}
                        value={meal.durationMinutes}
                        onChange={(e) =>
                          setMeals((prev) =>
                            prev.map((m, i) =>
                              i === idx ? { ...m, durationMinutes: Number(e.target.value) || 30 } : m
                            )
                          )
                        }
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-xs tabular-nums text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User's Own Subjects + Inline Add/Delete */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Your Subjects &amp; Weights (0 = skip · 1–5 = priority)
                </span>
                <button
                  type="button"
                  onClick={() => setShowSubjectPanel(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add subject</span>
                </button>
              </div>

              {subjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No subjects yet — study blocks will be scheduled as &ldquo;Focused Study&rdquo;, or click &ldquo;+ Add subject&rdquo; above.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {subjects.map((subj) => {
                    const weight = subjectWeights[subj.id] ?? 1;
                    return (
                      <div key={subj.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: subj.color }}
                            aria-hidden="true"
                          />
                          <span className="text-sm text-slate-800 dark:text-slate-200">{subj.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={5}
                            step={1}
                            aria-label={`${subj.name} weight`}
                            value={weight}
                            onChange={(e) =>
                              setSubjectWeights((prev) => ({
                                ...prev,
                                [subj.id]: Number(e.target.value),
                              }))
                            }
                            className="w-24 accent-indigo-600 dark:accent-indigo-400"
                          />
                          <span className="w-4 text-right font-mono text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                            {weight}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteSubject(subj)}
                            aria-label={`Delete ${subj.name}`}
                            className="rounded p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Alarm Defaults */}
            <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={alarmAtStart}
                  onChange={(e) => setAlarmAtStart(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>Alarm when block starts</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={alarm5MinBefore}
                  onChange={(e) => setAlarm5MinBefore(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>Remind 5 min before</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <Sparkles className="h-4 w-4" />
                <span>Generate Preview</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* AUTO MODE: FULLY EDITABLE PREVIEW */}
        {mode === 'auto' && autoStep === 'preview' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-slate-600 dark:text-slate-300">
                  Toggle individual blocks ON/OFF, adjust any start/end time, or add custom rows.
                </span>
                <div className="flex items-center gap-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  <span>Study: {formatMinutesReadable(autoAnalysis.studyMinutes)}</span>
                  <span>Break: {formatMinutesReadable(autoAnalysis.breakMinutes)}</span>
                </div>
              </div>

              {autoPreviewRows.map((row) => {
                const dur = getBlockDurationMinutes(row.startTime, row.endTime);
                return (
                  <div
                    key={row.id}
                    className={`flex flex-wrap items-center gap-2 rounded-xl border p-2.5 transition-opacity ${
                      row.enabled
                        ? 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40'
                        : 'border-slate-200 bg-slate-100/60 opacity-55 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) =>
                        setAutoPreviewRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, enabled: e.target.checked } : r))
                        )
                      }
                      aria-label={`Include ${row.title}`}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    <input
                      type="color"
                      value={row.color}
                      onChange={(e) =>
                        setAutoPreviewRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, color: e.target.value } : r))
                        )
                      }
                      className="h-6 w-6 shrink-0 cursor-pointer rounded border border-slate-200 bg-transparent p-0 dark:border-slate-700"
                    />
                    <span className="w-14 shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {formatShortDate(row.date)}
                    </span>
                    <input
                      type="time"
                      value={row.startTime}
                      onChange={(e) =>
                        setAutoPreviewRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, startTime: e.target.value } : r))
                        )
                      }
                      className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-400">–</span>
                    <input
                      type="time"
                      value={row.endTime === '24:00' ? '00:00' : row.endTime}
                      onChange={(e) =>
                        setAutoPreviewRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, endTime: e.target.value } : r))
                        )
                      }
                      className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <span className="w-10 font-mono text-[11px] tabular-nums text-slate-500">
                      {formatMinutesReadable(dur)}
                    </span>
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) =>
                        setAutoPreviewRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, title: e.target.value } : r))
                        )
                      }
                      className="min-w-[130px] flex-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <select
                      value={row.subjectId}
                      onChange={(e) =>
                        setAutoPreviewRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, subjectId: e.target.value } : r))
                        )
                      }
                      className="max-w-[120px] rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="">No subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setAutoPreviewRows((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, alarmAtStart: !r.alarmAtStart } : r))
                        )
                      }
                      aria-label="Toggle alarm"
                      className={`rounded border p-1 ${
                        row.alarmAtStart
                          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'border-slate-200 text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {row.alarmAtStart ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoPreviewRows((prev) => prev.filter((r) => r.id !== row.id))}
                      aria-label={`Remove ${row.title}`}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  const last = autoPreviewRows[autoPreviewRows.length - 1];
                  const start = last ? (last.endTime === '24:00' ? '00:00' : last.endTime) : '09:00';
                  setAutoPreviewRows((prev) => [
                    ...prev,
                    {
                      id: makeRowId(),
                      date: last?.date || toLocalDateStr(),
                      title: 'Custom Study Block',
                      startTime: start,
                      endTime: addMinutesToClock(start, 45),
                      type: 'study',
                      color: BLOCK_TYPE_META.study.color,
                      subjectId: '',
                      alarmAtStart: true,
                      alarm5MinBefore: false,
                      enabled: true,
                    },
                  ]);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add block</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={replaceNext24h}
                  onChange={(e) => setReplaceNext24h(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span>Clear existing blocks in the next 24h first</span>
              </label>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setAutoStep('inputs')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={autoPreviewRows.filter((r) => r.enabled).length === 0}
                  onClick={handleSaveAuto}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  Save to Day Planner ({autoPreviewRows.filter((r) => r.enabled).length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
