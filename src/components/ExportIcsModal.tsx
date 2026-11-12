import React, { useEffect, useState } from 'react';
import { Calendar, Download, Info, X } from 'lucide-react';
import { DayTemplate, Subject, TimeBlock } from '../types/study';
import { addDays, formatShortDate } from '../utils/dateUtils';
import {
  downloadIcsFile,
  generateIcsForBlocks,
  generateIcsForTemplate,
} from '../utils/icsExport';

interface ExportIcsModalProps {
  open: boolean;
  selectedDate: string;
  allBlocks: TimeBlock[];
  templates: DayTemplate[];
  subjects: Subject[];
  onClose: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

const WEEKDAYS = [
  { iso: 1, label: 'Mon' },
  { iso: 2, label: 'Tue' },
  { iso: 3, label: 'Wed' },
  { iso: 4, label: 'Thu' },
  { iso: 5, label: 'Fri' },
  { iso: 6, label: 'Sat' },
  { iso: 7, label: 'Sun' },
];

export const ExportIcsModal: React.FC<ExportIcsModalProps> = ({
  open,
  selectedDate,
  allBlocks,
  templates,
  subjects,
  onClose,
  onNotify,
}) => {
  const [scope, setScope] = useState<'day' | 'range' | 'template'>('day');
  const [rangeStart, setRangeStart] = useState(selectedDate);
  const [rangeEnd, setRangeEnd] = useState(addDays(selectedDate, 6));
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [tplStartDate, setTplStartDate] = useState(selectedDate);
  const [tplEndDate, setTplEndDate] = useState('');
  const [tplWeekdays, setTplWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    if (!open) return;
    setRangeStart(selectedDate);
    setRangeEnd(addDays(selectedDate, 6));
    setTplStartDate(selectedDate);
    if (!templateId && templates[0]) {
      setTemplateId(templates[0].id);
    }
  }, [open, selectedDate, templates, templateId]);

  if (!open) return null;

  const toggleWd = (iso: number) => {
    setTplWeekdays((prev) =>
      prev.includes(iso) ? prev.filter((x) => x !== iso) : [...prev, iso].sort()
    );
  };

  const handleDownload = () => {
    if (scope === 'day') {
      const dayBlocks = allBlocks.filter((b) => b.date === selectedDate);
      if (dayBlocks.length === 0) {
        onNotify(`No blocks scheduled on ${formatShortDate(selectedDate)}.`, 'error');
        return;
      }
      const ics = generateIcsForBlocks(dayBlocks, subjects, `Cadence (${selectedDate})`);
      downloadIcsFile(ics, `cadence-${selectedDate}.ics`);
      onNotify('Calendar (.ics) file downloaded.');
      onClose();
      return;
    }

    if (scope === 'range') {
      const rangeBlocks = allBlocks.filter((b) => b.date >= rangeStart && b.date <= rangeEnd);
      if (rangeBlocks.length === 0) {
        onNotify('No blocks found in that date range.', 'error');
        return;
      }
      const ics = generateIcsForBlocks(
        rangeBlocks,
        subjects,
        `Cadence (${rangeStart} to ${rangeEnd})`
      );
      downloadIcsFile(ics, `cadence-${rangeStart}-to-${rangeEnd}.ics`);
      onNotify('Calendar (.ics) file downloaded.');
      onClose();
      return;
    }

    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl || tpl.blocks.length === 0) {
      onNotify('Select a template with at least one block.', 'error');
      return;
    }
    const ics = generateIcsForTemplate(
      tpl,
      tplStartDate,
      tplWeekdays,
      tplEndDate || undefined,
      subjects
    );
    downloadIcsFile(ics, `cadence-${tpl.name.toLowerCase().replace(/\s+/g, '-')}.ics`);
    onNotify('Repeating template (.ics) downloaded.');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ics-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 id="ics-modal-title" className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Export to Calendar (.ics)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                { id: 'day', label: 'Selected Day' },
                { id: 'range', label: 'Date Range' },
                { id: 'template', label: 'Template' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScope(s.id)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  scope === s.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {scope === 'day' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
              Exports{' '}
              <span className="font-mono font-semibold tabular-nums">
                {allBlocks.filter((b) => b.date === selectedDate).length}
              </span>{' '}
              blocks on <strong>{formatShortDate(selectedDate)}</strong> with their start &amp; 5-min reminder alarms.
            </div>
          )}

          {scope === 'range' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">From</label>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">To</label>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
          )}

          {scope === 'template' && (
            <div className="space-y-3">
              {templates.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-800">
                  Save a template first to export a repeating calendar schedule.
                </p>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Template</label>
                    <select
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.blocks.length} blocks)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Repeat on
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((wd) => (
                        <button
                          key={wd.iso}
                          type="button"
                          onClick={() => toggleWd(wd.iso)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                            tplWeekdays.includes(wd.iso)
                              ? 'bg-indigo-600 text-white'
                              : 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {wd.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={tplStartDate}
                        onChange={(e) => setTplStartDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        End Date (optional)
                      </label>
                      <input
                        type="date"
                        value={tplEndDate}
                        onChange={(e) => setTplEndDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 text-xs leading-relaxed text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>Download the file, open it on your phone, and add it to Google Calendar.</span>
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
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500"
          >
            <Download className="h-4 w-4" />
            <span>Download .ics</span>
          </button>
        </div>
      </div>
    </div>
  );
};
