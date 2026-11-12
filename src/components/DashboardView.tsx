import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Check,
  Clock,
  Flame,
  Play,
  Plus,
  Quote,
  RefreshCw,
} from 'lucide-react';
import { Exam, NavTab, Priority, StudySession, Subject, Task } from '../types/study';
import { getDailyQuote } from '../data/seedData';
import {
  computeStreaks,
  daysBetween,
  formatClock,
  formatMinutesReadable,
  formatReadableDate,
  formatShortDate,
  getGreeting,
  toLocalDateStr,
} from '../utils/dateUtils';
import { EmptyState } from './EmptyState';

interface DashboardViewProps {
  tasks: Task[];
  subjects: Subject[];
  exams: Exam[];
  sessions: StudySession[];
  timerRunning: boolean;
  timerSecondsLeft: number;
  timerModeLabel: string;
  onToggleTask: (taskId: string) => void;
  onOpenNewTask: () => void;
  onNavigate: (tab: NavTab) => void;
  onFocusTask: (task: Task) => void;
}

const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  high: { label: 'High', className: 'text-rose-600 dark:text-rose-400' },
  medium: { label: 'Medium', className: 'text-amber-600 dark:text-amber-400' },
  low: { label: 'Low', className: 'text-slate-500 dark:text-slate-400' },
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  subjects,
  exams,
  sessions,
  timerRunning,
  timerSecondsLeft,
  timerModeLabel,
  onToggleTask,
  onOpenNewTask,
  onNavigate,
  onFocusTask,
}) => {
  const [quoteOffset, setQuoteOffset] = useState(0);
  const today = toLocalDateStr();
  const quote = getDailyQuote(quoteOffset);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const todayFocusMinutes = useMemo(
    () => sessions.filter((s) => s.date === today).reduce((sum, s) => sum + s.durationMinutes, 0),
    [sessions, today]
  );

  const { currentStreak } = useMemo(
    () => computeStreaks(sessions.map((s) => s.date)),
    [sessions]
  );

  const todayTasks = useMemo(() => {
    const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return tasks
      .filter((t) => t.dueDate === today || (!t.completed && t.dueDate < today))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const aOverdue = !a.completed && a.dueDate < today;
        const bOverdue = !b.completed && b.dueDate < today;
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        return priorityRank[a.priority] - priorityRank[b.priority];
      });
  }, [tasks, today]);

  const completedTodayCount = useMemo(
    () => todayTasks.filter((t) => t.completed).length,
    [todayTasks]
  );

  const upcomingExams = useMemo(() => {
    return exams
      .filter((e) => daysBetween(today, e.date) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [exams, today]);

  const nextExam = upcomingExams[0];
  const nextExamDays = nextExam ? daysBetween(today, nextExam.date) : null;

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{formatReadableDate(today)}</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            {getGreeting()}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('timer')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Play className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>{timerRunning ? `${timerModeLabel} · ${formatClock(timerSecondsLeft)}` : 'Start Focus'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewTask}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 whitespace-nowrap dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* 4-Column Summary Strip (Single Elevation, Hairline Dividers) */}
      <section
        aria-label="Daily study summary"
        className="grid grid-cols-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-4 lg:divide-x lg:divide-y-0"
      >
        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Today&apos;s Focus</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {formatMinutesReadable(todayFocusMinutes)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {sessions.filter((s) => s.date === today).length} sessions logged
          </p>
        </div>

        <div className="border-l border-slate-200 p-5 dark:border-slate-800 lg:border-l-0">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Current Streak</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {currentStreak > 0 ? 'Keep momentum going' : 'Complete a session today'}
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Today&apos;s Tasks</span>
            <Check className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {completedTodayCount} / {todayTasks.length}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {todayTasks.length === 0
              ? 'No tasks scheduled'
              : completedTodayCount === todayTasks.length
                ? 'All tasks completed'
                : `${todayTasks.length - completedTodayCount} remaining`}
          </p>
        </div>

        <div className="border-l border-slate-200 p-5 dark:border-slate-800 lg:border-l-0">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Next Exam</span>
            <CalendarClock className="h-4 w-4 text-violet-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {nextExamDays === null ? '—' : nextExamDays === 0 ? 'Today' : `${nextExamDays}d`}
          </div>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {nextExam ? nextExam.name : 'No upcoming exams'}
          </p>
        </div>
      </section>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Today's Tasks */}
        <section className="lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Today&apos;s Tasks &amp; Due Queue
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('planner')}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <span>View all in Planner</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {todayTasks.length === 0 ? (
            <EmptyState
              illustration="tasks"
              title="Your queue for today is clear"
              description="Add a study task for today or jump into a focused Pomodoro session."
              actionLabel="Add Today's Task"
              onAction={onOpenNewTask}
            />
          ) : (
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {todayTasks.map((task) => {
                const subject = subjectMap.get(task.subjectId);
                const isOverdue = !task.completed && task.dueDate < today;
                const priorityMeta = PRIORITY_META[task.priority];

                return (
                  <div
                    key={task.id}
                    className={`flex items-start justify-between gap-4 p-4 transition-colors ${
                      isOverdue ? 'bg-rose-50/40 dark:bg-rose-950/15' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={task.completed}
                        aria-label={`Mark "${task.title}" as ${task.completed ? 'pending' : 'completed'}`}
                        onClick={() => onToggleTask(task.id)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          task.completed
                            ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                            : 'border-slate-300 bg-white hover:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-indigo-400'
                        }`}
                      >
                        {task.completed && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">
                          <span
                            className={`task-title-strike ${
                              task.completed ? 'is-done text-slate-400 dark:text-slate-500' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          {subject && (
                            <>
                              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                <span
                                  className="h-2 w-2 rounded-sm"
                                  style={{ backgroundColor: subject.color }}
                                  aria-hidden="true"
                                />
                                {subject.name}
                              </span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span className={`font-medium ${priorityMeta.className}`}>{priorityMeta.label} priority</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{task.estimatedMinutes}m</span>
                          {isOverdue && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Overdue ({formatShortDate(task.dueDate)})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {!task.completed && (
                      <button
                        type="button"
                        onClick={() => onFocusTask(task)}
                        title="Start Pomodoro for this task"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
                      >
                        <Play className="h-3 w-3" />
                        <span>Focus</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Upcoming Exams + Daily Quote */}
        <div className="space-y-6 lg:col-span-5">
          {/* Upcoming Exams */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                Upcoming Exams
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <span>Manage exams</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {upcomingExams.length === 0 ? (
              <EmptyState
                illustration="exams"
                title="No upcoming exams"
                description="Add exam dates in the Planner to track live countdowns."
                actionLabel="Open Planner"
                onAction={() => onNavigate('planner')}
              />
            ) : (
              <div className="space-y-2.5">
                {upcomingExams.slice(0, 4).map((exam) => {
                  const days = daysBetween(today, exam.date);
                  const isUrgent = days <= 7;
                  const subject = subjectMap.get(exam.subjectId);
                  const countdownLabel =
                    days === 0 ? 'Today' : days === 1 ? 'in 1 day' : `in ${days} days`;

                  return (
                    <div
                      key={exam.id}
                      className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                        isUrgent
                          ? 'border-rose-300 bg-rose-50/70 dark:border-rose-900/70 dark:bg-rose-950/25'
                          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isUrgent && (
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                          )}
                          <h3 className="truncate font-medium text-slate-900 dark:text-slate-100">{exam.name}</h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {subject ? `${subject.name} · ` : ''}
                          {formatShortDate(exam.date)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <div
                          className={`font-mono text-sm font-semibold tabular-nums ${
                            isUrgent
                              ? 'text-rose-700 dark:text-rose-300'
                              : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {countdownLabel}
                        </div>
                        {isUrgent && (
                          <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                            Within 7 days
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Daily Motivational Quote */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Quote className="h-3.5 w-3.5 text-indigo-500" />
                <span>Daily Study Note</span>
              </div>
              <button
                type="button"
                onClick={() => setQuoteOffset((prev) => prev + 1)}
                aria-label="Next quote"
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <blockquote className="mt-3 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">— {quote.author}</p>
          </section>
        </div>
      </div>
    </div>
  );
};
