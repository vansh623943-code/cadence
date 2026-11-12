import React from 'react';
import { AlertTriangle, FolderInput, Trash2, X } from 'lucide-react';
import { Subject } from '../types/study';

interface DeleteSubjectModalProps {
  subject: Subject | null;
  taskCount: number;
  examCount: number;
  onClose: () => void;
  onDeleteAndMoveTasks: (subjectId: string) => void;
  onDeleteWithTasks: (subjectId: string) => void;
}

export const DeleteSubjectModal: React.FC<DeleteSubjectModalProps> = ({
  subject,
  taskCount,
  examCount,
  onClose,
  onDeleteAndMoveTasks,
  onDeleteWithTasks,
}) => {
  if (!subject) return null;

  const hasLinkedItems = taskCount > 0 || examCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-subject-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="delete-subject-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Delete &ldquo;{subject.name}&rdquo;?
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {hasLinkedItems
                  ? `This subject currently has ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}${
                      examCount > 0 ? ` and ${examCount} ${examCount === 1 ? 'exam' : 'exams'}` : ''
                    }. Choose what to do with its items:`
                  : 'This subject has no tasks assigned. Are you sure you want to delete it?'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {hasLinkedItems ? (
          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={() => onDeleteAndMoveTasks(subject.id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40"
            >
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Move tasks to &ldquo;No subject&rdquo;
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Keep your tasks &amp; exams, remove the subject label
                </div>
              </div>
              <FolderInput className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            </button>

            <button
              type="button"
              onClick={() => onDeleteWithTasks(subject.id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50/70 px-4 py-3 text-left transition-colors hover:bg-rose-100/80 dark:border-rose-900/60 dark:bg-rose-950/30 dark:hover:bg-rose-950/50"
            >
              <div>
                <div className="text-sm font-medium text-rose-700 dark:text-rose-300">
                  Delete subject and its {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </div>
                <div className="text-xs text-rose-600/80 dark:text-rose-400/80">
                  Permanently remove the subject and all tasks assigned to it
                </div>
              </div>
              <Trash2 className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            </button>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onDeleteAndMoveTasks(subject.id)}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              Delete Subject
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
