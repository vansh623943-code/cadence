import React, { useEffect, useState } from 'react';
import { CalendarPlus, Check, Edit3, Plus, Repeat, Save, Trash2, X } from 'lucide-react';
import { BlockType, DayTemplate, Subject, TemplateBlockItem, TimeBlock } from '../types/study';
import {
  BLOCK_TYPE_META,
  getDatesInRange,
  getWeekdayIso,
} from '../utils/dayPlannerUtils';
import { addDays, formatShortDate } from '../utils/dateUtils';

interface TemplatesModalProps {
  open: boolean;
  currentDate: string;
  currentDayBlocks: TimeBlock[];
  templates: DayTemplate[];
  subjects: Subject[];
  onClose: () => void;
  onSaveTemplate: (name: string, blocks: TemplateBlockItem[]) => void;
  onUpdateTemplate: (template: DayTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onApplyTemplate: (template: DayTemplate, targetDates: string[], templateGroupId: string) => void;
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

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  open,
  currentDate,
  currentDayBlocks,
  templates,
  subjects,
  onClose,
  onSaveTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onApplyTemplate,
}) => {
  const [newName, setNewName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DayTemplate | null>(null);

  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyMode, setApplyMode] = useState<'single' | 'range' | 'repeat'>('single');
  const [singleDate, setSingleDate] = useState(currentDate);
  const [rangeStart, setRangeStart] = useState(currentDate);
  const [rangeEnd, setRangeEnd] = useState(addDays(currentDate, 4));
  const [repeatStart, setRepeatStart] = useState(currentDate);
  const [repeatEnd, setRepeatEnd] = useState('');
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    if (!open) return;
    setNewName('');
    setEditingTemplateId(null);
    setEditDraft(null);
    setApplyingId(null);
    setSingleDate(currentDate);
    setRangeStart(currentDate);
    setRangeEnd(addDays(currentDate, 4));
    setRepeatStart(currentDate);
  }, [open, currentDate]);

  if (!open) return null;

  const handleSaveCurrentDay = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || currentDayBlocks.length === 0) return;

    const items: TemplateBlockItem[] = currentDayBlocks.map((b, i) => ({
      id: `tb-${Date.now().toString(36)}-${i}`,
      title: b.title,
      type: b.type,
      subjectId: b.subjectId,
      startTime: b.startTime,
      endTime: b.endTime,
      notes: b.notes,
      alarmAtStart: b.alarmAtStart,
      alarm5MinBefore: b.alarm5MinBefore,
    }));
    onSaveTemplate(trimmed, items);
    setNewName('');
  };

  const toggleWeekday = (iso: number) => {
    setRepeatWeekdays((prev) =>
      prev.includes(iso) ? prev.filter((x) => x !== iso) : [...prev, iso].sort()
    );
  };

  const handleExecuteApply = (tpl: DayTemplate) => {
    let targetDates: string[] = [];
    if (applyMode === 'single') {
      targetDates = singleDate ? [singleDate] : [];
    } else if (applyMode === 'range') {
      if (rangeStart && rangeEnd && rangeEnd >= rangeStart) {
        targetDates = getDatesInRange(rangeStart, rangeEnd, 90);
      }
    } else {
      const effectiveEnd = repeatEnd && repeatEnd >= repeatStart ? repeatEnd : addDays(repeatStart, 27);
      const candidates = getDatesInRange(repeatStart, effectiveEnd, 90);
      targetDates = candidates.filter((d) => repeatWeekdays.includes(getWeekdayIso(d)));
      onUpdateTemplate({
        ...tpl,
        repeatRule: {
          weekdays: repeatWeekdays,
          startDate: repeatStart,
          endDate: repeatEnd || undefined,
        },
      });
    }

    if (targetDates.length === 0) return;
    const groupId = `grp-${tpl.id}-${Date.now().toString(36)}`;
    onApplyTemplate(tpl, targetDates, groupId);
    setApplyingId(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="templates-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 id="templates-modal-title" className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Schedule Templates &amp; Repeat
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Save routines and apply them to single dates, ranges, or weekly repeats
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close templates"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Save Current Day as Template */}
          <form
            onSubmit={handleSaveCurrentDay}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Save {formatShortDate(currentDate)} ({currentDayBlocks.length} blocks) as Template
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder='e.g., "Weekday routine" or "Exam week"'
                disabled={currentDayBlocks.length === 0}
                className="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={currentDayBlocks.length === 0 || !newName.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500"
              >
                <Save className="h-4 w-4" />
                <span>Save Template</span>
              </button>
            </div>
            {currentDayBlocks.length === 0 && (
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                Add at least one block to {formatShortDate(currentDate)} before saving as a template.
              </p>
            )}
          </form>

          {/* Saved Templates List */}
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Saved Templates ({templates.length})
            </h3>

            {templates.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                No templates saved yet. Build a day schedule and save it above to reuse it anytime.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {templates.map((tpl) => {
                  const isEditing = editingTemplateId === tpl.id && editDraft;
                  const isApplying = applyingId === tpl.id;

                  return (
                    <div
                      key={tpl.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editDraft.name}
                              onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editDraft.name.trim()) {
                                  onUpdateTemplate({ ...editDraft, name: editDraft.name.trim() });
                                }
                                setEditingTemplateId(null);
                                setEditDraft(null);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTemplateId(null);
                                setEditDraft(null);
                              }}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="space-y-2">
                            {editDraft.blocks.map((tb, idx) => (
                              <div key={tb.id} className="flex flex-wrap items-center gap-2 text-xs">
                                <input
                                  type="time"
                                  value={tb.startTime}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      blocks: editDraft.blocks.map((item, i) =>
                                        i === idx ? { ...item, startTime: e.target.value } : item
                                      ),
                                    })
                                  }
                                  className="rounded border border-slate-200 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-800"
                                />
                                <input
                                  type="time"
                                  value={tb.endTime === '24:00' ? '00:00' : tb.endTime}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      blocks: editDraft.blocks.map((item, i) =>
                                        i === idx
                                          ? {
                                              ...item,
                                              endTime: e.target.value === '00:00' ? '24:00' : e.target.value,
                                            }
                                          : item
                                      ),
                                    })
                                  }
                                  className="rounded border border-slate-200 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-800"
                                />
                                <input
                                  type="text"
                                  value={tb.title}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      blocks: editDraft.blocks.map((item, i) =>
                                        i === idx ? { ...item, title: e.target.value } : item
                                      ),
                                    })
                                  }
                                  className="min-w-[130px] flex-1 rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                                />
                                <select
                                  value={tb.type}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      blocks: editDraft.blocks.map((item, i) =>
                                        i === idx ? { ...item, type: e.target.value as BlockType } : item
                                      ),
                                    })
                                  }
                                  className="rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                                >
                                  {Object.entries(BLOCK_TYPE_META).map(([k, meta]) => (
                                    <option key={k} value={k}>
                                      {meta.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={tb.subjectId}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      blocks: editDraft.blocks.map((item, i) =>
                                        i === idx ? { ...item, subjectId: e.target.value } : item
                                      ),
                                    })
                                  }
                                  className="rounded border border-slate-200 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
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
                                    setEditDraft({
                                      ...editDraft,
                                      blocks: editDraft.blocks.filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="rounded p-1 text-slate-400 hover:text-rose-600"
                                  aria-label="Remove block from template"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                setEditDraft({
                                  ...editDraft,
                                  blocks: [
                                    ...editDraft.blocks,
                                    {
                                      id: `tb-${Date.now().toString(36)}`,
                                      title: 'Study Session',
                                      type: 'study',
                                      subjectId: '',
                                      startTime: '09:00',
                                      endTime: '10:00',
                                      notes: '',
                                      alarmAtStart: true,
                                      alarm5MinBefore: false,
                                    },
                                  ],
                                })
                              }
                              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add block to template</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="font-medium text-slate-900 dark:text-slate-100">{tpl.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {tpl.blocks.length} {tpl.blocks.length === 1 ? 'block' : 'blocks'}
                                {tpl.repeatRule && tpl.repeatRule.weekdays.length > 0 && (
                                  <>
                                    {' · Repeats '}
                                    {tpl.repeatRule.weekdays
                                      .map((w) => WEEKDAYS.find((x) => x.iso === w)?.label)
                                      .filter(Boolean)
                                      .join(', ')}
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isApplying) {
                                    setApplyingId(null);
                                  } else {
                                    setApplyingId(tpl.id);
                                    if (tpl.repeatRule?.weekdays.length) {
                                      setRepeatWeekdays(tpl.repeatRule.weekdays);
                                    }
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                              >
                                <CalendarPlus className="h-3.5 w-3.5" />
                                <span>Apply / Repeat</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTemplateId(tpl.id);
                                  setEditDraft(JSON.parse(JSON.stringify(tpl)) as DayTemplate);
                                }}
                                aria-label={`Edit ${tpl.name}`}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTemplate(tpl.id)}
                                aria-label={`Delete ${tpl.name}`}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {isApplying && (
                            <div className="mt-4 space-y-3 border-t border-slate-200 pt-3.5 dark:border-slate-800">
                              <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                                {(
                                  [
                                    { id: 'single', label: 'Single date' },
                                    { id: 'range', label: 'Date range' },
                                    { id: 'repeat', label: 'Repeat weekly' },
                                  ] as const
                                ).map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setApplyMode(m.id)}
                                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                      applyMode === m.id
                                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                                        : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>

                              {applyMode === 'single' && (
                                <div className="flex items-center gap-3">
                                  <input
                                    type="date"
                                    value={singleDate}
                                    onChange={(e) => setSingleDate(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                                  />
                                </div>
                              )}

                              {applyMode === 'range' && (
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span>From</span>
                                  <input
                                    type="date"
                                    value={rangeStart}
                                    onChange={(e) => setRangeStart(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                                  />
                                  <span>to</span>
                                  <input
                                    type="date"
                                    value={rangeEnd}
                                    onChange={(e) => setRangeEnd(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                                  />
                                </div>
                              )}

                              {applyMode === 'repeat' && (
                                <div className="space-y-3">
                                  <div className="flex flex-wrap gap-1.5">
                                    {WEEKDAYS.map((wd) => {
                                      const active = repeatWeekdays.includes(wd.iso);
                                      return (
                                        <button
                                          key={wd.iso}
                                          type="button"
                                          onClick={() => toggleWeekday(wd.iso)}
                                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                            active
                                              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                                              : 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                                          }`}
                                        >
                                          {wd.label}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <label className="flex items-center gap-1.5">
                                      <span>Starts</span>
                                      <input
                                        type="date"
                                        value={repeatStart}
                                        onChange={(e) => setRepeatStart(e.target.value)}
                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800"
                                      />
                                    </label>
                                    <label className="flex items-center gap-1.5">
                                      <span>End date (optional, defaults 4 wks)</span>
                                      <input
                                        type="date"
                                        value={repeatEnd}
                                        onChange={(e) => setRepeatEnd(e.target.value)}
                                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800"
                                      />
                                    </label>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleExecuteApply(tpl)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500"
                                >
                                  <Repeat className="h-3.5 w-3.5" />
                                  <span>Apply Schedule</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
