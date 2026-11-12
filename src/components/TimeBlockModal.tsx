import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, Repeat, Trash2, X } from 'lucide-react';
import { BlockType, Subject, TimeBlock } from '../types/study';
import {
  BLOCK_TYPE_META,
  checkBlockOverlap,
  doesBlockCrossMidnight,
  getBlockDurationMinutes,
} from '../utils/dayPlannerUtils';
import { formatMinutesReadable, toLocalDateStr } from '../utils/dateUtils';

interface TimeBlockModalProps {
  open: boolean;
  initialBlock: TimeBlock | null;
  defaultDate: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  allBlocks: TimeBlock[];
  subjects: Subject[];
  onClose: () => void;
  onSaveSingle: (
    blockData: Omit<TimeBlock, 'id'>,
    existingId?: string
  ) => void;
  onSaveAllRepeats: (
    templateGroupId: string,
    updates: Pick<TimeBlock, 'title' | 'type' | 'subjectId' | 'startTime' | 'endTime' | 'notes' | 'alarmAtStart' | 'alarm5MinBefore'>
  ) => void;
  onDelete: (blockId: string, deleteAllRepeats?: boolean) => void;
}

const BLOCK_TYPES: BlockType[] = ['study', 'break', 'meal', 'exercise', 'sleep', 'other'];

export const TimeBlockModal: React.FC<TimeBlockModalProps> = ({
  open,
  initialBlock,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  allBlocks,
  subjects,
  onClose,
  onSaveSingle,
  onSaveAllRepeats,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<BlockType>('study');
  const [customColor, setCustomColor] = useState(BLOCK_TYPE_META.study.color);
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(toLocalDateStr());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [alarmAtStart, setAlarmAtStart] = useState(true);
  const [alarm5MinBefore, setAlarm5MinBefore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initialBlock) {
      setTitle(initialBlock.title);
      setType(initialBlock.type);
      setCustomColor(initialBlock.customColor || BLOCK_TYPE_META[initialBlock.type].color);
      setSubjectId(initialBlock.subjectId);
      setDate(initialBlock.date);
      setStartTime(initialBlock.startTime);
      setEndTime(initialBlock.endTime === '24:00' ? '00:00' : initialBlock.endTime);
      setNotes(initialBlock.notes);
      setAlarmAtStart(initialBlock.alarmAtStart);
      setAlarm5MinBefore(initialBlock.alarm5MinBefore);
    } else {
      setTitle('');
      setType('study');
      setCustomColor(BLOCK_TYPE_META.study.color);
      setSubjectId('');
      setDate(defaultDate || toLocalDateStr());
      setStartTime(defaultStartTime || '09:00');
      setEndTime(defaultEndTime || '10:00');
      setNotes('');
      setAlarmAtStart(true);
      setAlarm5MinBefore(false);
    }
  }, [open, initialBlock, defaultDate, defaultStartTime, defaultEndTime]);

  const repeatCount = useMemo(() => {
    if (!initialBlock?.templateGroupId) return 0;
    return allBlocks.filter((b) => b.templateGroupId === initialBlock.templateGroupId).length;
  }, [allBlocks, initialBlock]);

  const overlappingBlocks = useMemo(() => {
    if (!open || !date || !startTime || !endTime) return [];
    const effectiveEnd = endTime === '00:00' && startTime !== '00:00' ? '24:00' : endTime;
    return checkBlockOverlap(
      {
        id: initialBlock?.id || '__new__',
        date,
        startTime,
        endTime: effectiveEnd,
      },
      allBlocks
    );
  }, [open, date, startTime, endTime, initialBlock, allBlocks]);

  if (!open) return null;

  const effectiveEnd = endTime === '00:00' && startTime !== '00:00' ? '24:00' : endTime;
  const crossesMidnight = doesBlockCrossMidnight(startTime, effectiveEnd);
  const durationMins = getBlockDurationMinutes(startTime, effectiveEnd);

  const buildPayload = (): Omit<TimeBlock, 'id'> | null => {
    const trimmed = title.trim() || BLOCK_TYPE_META[type].label;
    if (!date || !startTime || !endTime) {
      setError('Please select a date, start time, and end time.');
      return null;
    }
    return {
      title: trimmed,
      type,
      customColor,
      subjectId,
      date,
      startTime,
      endTime: effectiveEnd,
      notes: notes.trim(),
      alarmAtStart,
      alarm5MinBefore,
      templateGroupId: initialBlock?.templateGroupId,
    };
  };

  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    onSaveSingle(payload, initialBlock?.id);
    onClose();
  };

  const handleSubmitAllRepeats = () => {
    if (!initialBlock?.templateGroupId) return;
    const payload = buildPayload();
    if (!payload) return;
    onSaveAllRepeats(initialBlock.templateGroupId, {
      title: payload.title,
      type: payload.type,
      subjectId: payload.subjectId,
      startTime: payload.startTime,
      endTime: payload.endTime,
      notes: payload.notes,
      alarmAtStart: payload.alarmAtStart,
      alarm5MinBefore: payload.alarm5MinBefore,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="time-block-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <h2
            id="time-block-modal-title"
            className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {initialBlock ? 'Edit Time Block' : 'Add Time Block'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitSingle} className="mt-5 space-y-4">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </p>
          )}

          {overlappingBlocks.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-semibold">Schedule overlap detected:</span> overlaps with{' '}
                {overlappingBlocks.map((b) => `"${b.title}" (${b.startTime}–${b.endTime})`).join(', ')}.
              </div>
            </div>
          )}

          <div>
            <label htmlFor="block-title" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Block Title
            </label>
            <input
              id="block-title"
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g., ${BLOCK_TYPE_META[type].label} session`}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="block-type" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Type
              </label>
              <select
                id="block-type"
                value={type}
                onChange={(e) => {
                  const nextType = e.target.value as BlockType;
                  setType(nextType);
                  setCustomColor(BLOCK_TYPE_META[nextType].color);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {BLOCK_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {BLOCK_TYPE_META[bt].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="block-color" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Color
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                <input
                  id="block-color"
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="h-7 w-7 cursor-pointer border-0 bg-transparent p-0"
                />
                <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{customColor}</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="block-subject"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Subject (optional)
              </label>
              <select
                id="block-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">No subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="block-date" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Start Date
              </label>
              <input
                id="block-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="block-start" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Start Time
              </label>
              <input
                id="block-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="block-end" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                End Time
              </label>
              <input
                id="block-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Duration: <span className="font-mono font-medium tabular-nums">{formatMinutesReadable(durationMins)}</span>
            {crossesMidnight && (
              <span className="ml-2 font-medium text-indigo-600 dark:text-indigo-400">
                · Crosses midnight (ends next day)
              </span>
            )}
          </p>

          <div>
            <label htmlFor="block-notes" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Notes (optional)
            </label>
            <textarea
              id="block-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Chapters, exercises, or reminders..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Bell className="h-3.5 w-3.5 text-indigo-500" />
              <span>Block Alarms</span>
            </div>
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Ring alarm when block starts</span>
              <input
                type="checkbox"
                checked={alarmAtStart}
                onChange={(e) => setAlarmAtStart(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
              <span>Also remind 5 minutes before</span>
              <input
                type="checkbox"
                checked={alarm5MinBefore}
                onChange={(e) => setAlarm5MinBefore(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {initialBlock && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(initialBlock.id, false);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                  {repeatCount > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(initialBlock.id, true);
                        onClose();
                      }}
                      className="rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400"
                    >
                      Delete all repeats ({repeatCount})
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              {repeatCount > 1 && (
                <button
                  type="button"
                  onClick={handleSubmitAllRepeats}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                >
                  <Repeat className="h-3.5 w-3.5" />
                  <span>Edit all repeats</span>
                </button>
              )}
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {initialBlock ? (repeatCount > 1 ? 'Save this day' : 'Save Block') : 'Add Block'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
