import React from 'react';
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
  Moon,
  Plus,
  Settings,
  Sun,
  Timer,
} from 'lucide-react';
import { InfoPageId, NavTab } from '../types/study';
import { formatClock } from '../utils/dateUtils';
import { INFO_PAGES } from '../utils/infoRoutes';
import { PWAInstallControl } from './PWAInstallControl';
import { SettingsTab } from './SettingsModal';

interface SidebarProps {
  activeTab: NavTab;
  activeInfoPage: InfoPageId | null;
  onSelectTab: (tab: NavTab) => void;
  onSelectInfoPage: (page: InfoPageId) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenNewTask: () => void;
  onOpenSettings: (tab?: SettingsTab) => void;
  timerRunning: boolean;
  timerSecondsLeft: number;
  timerModeLabel: string;
}

const NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Home', icon: LayoutDashboard },
  { id: 'planner', label: 'Planner', mobileLabel: 'Planner', icon: CalendarDays },
  { id: 'dayPlanner', label: 'Day Planner', mobileLabel: 'Day Plan', icon: CalendarClock },
  { id: 'timer', label: 'Focus Timer', mobileLabel: 'Timer', icon: Timer },
  { id: 'stats', label: 'Stats', mobileLabel: 'Stats', icon: BarChart3 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  activeInfoPage,
  onSelectTab,
  onSelectInfoPage,
  theme,
  onToggleTheme,
  onOpenNewTask,
  onOpenSettings,
  timerRunning,
  timerSecondsLeft,
  timerModeLabel,
}) => {
  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="flex items-center justify-between px-6 py-5">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab('dashboard');
            }}
            className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            Kilostudy Planner
          </a>
        </div>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onOpenNewTask}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4" />
            <span className="whitespace-nowrap">New Task</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = !activeInfoPage && activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.id === 'timer' && timerRunning && (
                  <span className="font-mono text-xs tabular-nums text-indigo-600 dark:text-indigo-400">
                    {formatClock(timerSecondsLeft)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live timer summary when browsing other tabs */}
        {timerRunning && activeTab !== 'timer' && (
          <div className="mx-3 mb-3 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/40">
            <button
              type="button"
              onClick={() => onSelectTab('timer')}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{timerModeLabel} running</div>
                <div className="font-mono text-lg font-semibold tabular-nums text-indigo-900 dark:text-indigo-100">
                  {formatClock(timerSecondsLeft)}
                </div>
              </div>
              <Timer className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </button>
          </div>
        )}

        <div className="space-y-1.5 border-t border-slate-200 p-3 dark:border-slate-800">
          <PWAInstallControl variant="sidebar" />

          <button
            type="button"
            onClick={onToggleTheme}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <span className="flex items-center gap-3">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSettings('sounds')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>

          <div className="px-3 pt-1 text-[11px] text-slate-400 dark:text-slate-500">
            <span>Space: Timer</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>N: New task</span>
          </div>

          <nav
            aria-label="Resources and legal links"
            className="flex flex-wrap gap-x-2.5 gap-y-1 border-t border-slate-200 px-3 pt-2.5 text-[11px] dark:border-slate-800"
          >
            {INFO_PAGES.map((page) => {
              const isCurrent = activeInfoPage === page.id;
              return (
                <a
                  key={page.id}
                  href={page.path}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectInfoPage(page.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`transition-colors ${
                    isCurrent
                      ? 'font-semibold text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400'
                  }`}
                >
                  {page.label}
                </a>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('dashboard');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
        >
          Kilostudy Planner
        </a>

        <div className="flex items-center gap-2">
          <PWAInstallControl variant="compact" />
          {timerRunning && activeTab !== 'timer' && (
            <button
              type="button"
              onClick={() => onSelectTab('timer')}
              className="rounded-lg bg-indigo-50 px-2.5 py-1.5 font-mono text-xs font-medium tabular-nums text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300"
            >
              {formatClock(timerSecondsLeft)}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenNewTask}
            aria-label="New task"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Task</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onOpenSettings('sounds')}
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = !activeInfoPage && activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex min-h-[54px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
