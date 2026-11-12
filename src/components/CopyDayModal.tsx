import React, { useEffect, useState } from 'react';
import { Copy, Plus, Trash2, X } from 'lucide-react';
import { addDays, formatShortDate } from '../utils/dateUtils';

interface CopyDayModalProps {
  open: boolean;
  sourceDate: string;
  blockCount: number;
  onClose: () => void;
  onCopyToDates: (targetDates: string[]) => void;
}

export const CopyDayModal: React.FC<CopyDayModalProps> = ({
  open,
  sourceDate,
  blockCount,
  onClose,
  onCopyToDates,
}) => {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [datePickerVal, setDatePickerVal] = useState('');

  useEffect(() => {
    if (!open) return;
    const tomorrow = addDays(sourceDate, 1);
    setSelectedDates([tomorrow]);
    setDatePickerVal(addDays(sourceDate, 2));
  }, [open, sourceDate]);

  if (!open) return null;

  const addTargetDate = (d: string) => {
    if (!d || d === sourceDate) return;
    setSelectedDates((prev) => (prev.includes(d) ? prev : [...prev, d].sort()));
  };

  const quickNext7 = () => {
    const next7 = Array.from({ length: 7 }, (_, i) => addDays(sourceDate, i + 1));
    setSelectedDates(next7);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copy-day-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 id="copy-day-title" className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Copy {formatShortDate(sourceDate)} Schedule
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Duplicate {blockCount} {blockCount === 1 ? 'block' : 'blocks'} onto one or more dates
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addTargetDate(addDays(sourceDate, 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              + Next day
            </button>
            <button
              type="button"
              onClick={() => addTargetDate(addDays(sourceDate, 7))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              + Same day next week
            </button>
            <button
              type="button"
              onClick={quickNext7}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Next 7 days
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={datePickerVal}
              onChange={(e) => setDatePickerVal(e.target.value)}
              aria-label="Add target date"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => addTargetDate(datePickerVal)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add date</span>
            </button>
          </div>

          <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            {selectedDates.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-400">Select at least one destination date.</p>
            ) : (
              selectedDates.map((d) => (
                <div
                  key={d}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60"
                >
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {d} ({formatShortDate(d)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDates((prev) => prev.filter((x) => x !== d))}
                    aria-label={`Remove ${d}`}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedDates.length === 0}
            onClick={() => {
              onCopyToDates(selectedDates);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
          >
            <Copy className="h-4 w-4" />
            <span>Copy to {selectedDates.length} {selectedDates.length === 1 ? 'day' : 'days'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
