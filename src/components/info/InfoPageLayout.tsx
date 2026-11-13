import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { InfoPageId } from '../../types/study';
import { INFO_PAGES } from '../../utils/infoRoutes';

interface InfoPageLayoutProps {
  currentPage: InfoPageId;
  onBack: () => void;
  onNavigateInfo: (page: InfoPageId) => void;
  children: React.ReactNode;
}

export const InfoPageLayout: React.FC<InfoPageLayoutProps> = ({
  currentPage,
  onBack,
  onNavigateInfo,
  children,
}) => {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Kilostudy Planner</span>
        </button>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 lg:p-10 dark:border-slate-800 dark:bg-slate-900">
        {children}
      </article>

      <footer className="rounded-xl border border-slate-200 bg-white/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Kilostudy Planner · Student Study Planner &amp; Pomodoro Timer
          </span>
          <nav aria-label="Footer pages" className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {INFO_PAGES.map((page) => {
              const active = page.id === currentPage;
              return (
                <a
                  key={page.id}
                  href={page.path}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateInfo(page.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`text-xs font-medium transition-colors ${
                    active
                      ? 'text-indigo-600 underline underline-offset-4 dark:text-indigo-400'
                      : 'text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400'
                  }`}
                >
                  {page.label}
                </a>
              );
            })}
          </nav>
        </div>
      </footer>
    </div>
  );
};
