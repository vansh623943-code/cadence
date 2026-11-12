import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Priority, Subject, Task } from '../types/study';
import { toLocalDateStr } from '../utils/dateUtils';

interface TaskModalProps {
  open: boolean;
  initialTask: Task | null;
  defaultDate?: string;
  subjects: Subject[];
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'completed' | 'createdAt' | 'completedAt'>, existingId?: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  open,
  initialTask,
  defaultDate,
  subjects,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState(toLocalDateStr());
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (initialTask) {
      setTitle(initialTask.title);
      setSubjectId(initialTask.subjectId);
      setPriority(initialTask.priority);
      setDueDate(initialTask.dueDate);
      setEstimatedMinutes(initialTask.estimatedMinutes);
      setNotes(initialTask.notes);
    } else {
      setTitle('');
      setSubjectId(subjects[0]?.id ?? '');
      setPriority('medium');
      setDueDate(defaultDate || toLocalDateStr());
      setEstimatedMinutes(30);
      setNotes('');
    }
  }, [open, initialTask, defaultDate, subjects]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Please enter a task title.');
      return;
    }
    if (!dueDate) {
      setError('Please select a due date.');
      return;
    }
    onSave(
      {
        title: trimmed,
        subjectId: subjectId || (subjects[0]?.id ?? ''),
        priority,
        dueDate,
        estimatedMinutes: Math.max(5, Math.min(480, Number(estimatedMinutes) || 25)),
        notes: notes.trim(),
      },
      initialTask?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <h2 id="task-modal-title" className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            {initialTask ? 'Edit Task' : 'New Study Task'}
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="task-title" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Task Title
            </label>
            <input
              id="task-title"
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Complete Calculus problem set 4"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-subject"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Subject
              </label>
              <select
                id="task-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">No subject</option>
                {subjects.map((subj) => (
                  <option key={subj.id} value={subj.id}>
                    {subj.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-priority"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-due-date"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Due Date
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="task-est-time"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Estimated Time (minutes)
              </label>
              <input
                id="task-est-time"
                type="number"
                min={5}
                max={480}
                step={5}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-notes" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Notes (optional)
            </label>
            <textarea
              id="task-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key chapters, formulas to review, or assignment links..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {initialTask ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
