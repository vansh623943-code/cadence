import React from 'react';

interface EmptyStateProps {
  illustration: 'tasks' | 'exams' | 'subjects' | 'stats';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
        {illustration === 'tasks' && (
          <svg viewBox="0 0 64 64" fill="none" className="h-12 w-12" aria-hidden="true">
            <rect x="12" y="10" width="40" height="44" rx="6" stroke="currentColor" strokeWidth="2.5" />
            <path d="M22 24H42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M22 34H38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M22 44H32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="46" cy="46" r="10" className="fill-indigo-600 dark:fill-indigo-500" />
            <path d="M42 46L45 49L50 43" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {illustration === 'exams' && (
          <svg viewBox="0 0 64 64" fill="none" className="h-12 w-12" aria-hidden="true">
            <rect x="10" y="14" width="44" height="38" rx="6" stroke="currentColor" strokeWidth="2.5" />
            <path d="M10 25H54" stroke="currentColor" strokeWidth="2.5" />
            <path d="M22 10V18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M42 10V18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="38" r="7" stroke="currentColor" strokeWidth="2.5" />
            <path d="M32 34.5V38L34.5 40" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        )}
        {illustration === 'subjects' && (
          <svg viewBox="0 0 64 64" fill="none" className="h-12 w-12" aria-hidden="true">
            <path
              d="M14 16C14 13.7909 15.7909 12 18 12H30V50H18C15.7909 50 14 48.2091 14 46V16Z"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path
              d="M34 12H46C48.2091 12 50 13.7909 50 16V46C50 48.2091 48.2091 50 46 50H34V12Z"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path d="M20 22H25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M39 22H44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
        {illustration === 'stats' && (
          <svg viewBox="0 0 64 64" fill="none" className="h-12 w-12" aria-hidden="true">
            <path d="M12 50H52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="16" y="34" width="8" height="16" rx="2" stroke="currentColor" strokeWidth="2.5" />
            <rect x="28" y="24" width="8" height="26" rx="2" stroke="currentColor" strokeWidth="2.5" />
            <rect x="40" y="14" width="8" height="36" rx="2" className="fill-indigo-600/20" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        )}
      </div>
      <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
