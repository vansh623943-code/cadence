import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Exam, Priority, StudySession, Subject, Task } from '../types/study';
import { SUBJECT_COLORS } from '../data/seedData';
import {
  addDays,
  daysBetween,
  formatMinutesReadable,
  formatShortDate,
  getMondayOfWeek,
  getWeekDates,
  parseLocalDate,
  toLocalDateStr,
} from '../utils/dateUtils';
import { EmptyState } from './EmptyState';

type PlannerSubTab = 'tasks' | 'timetable' | 'exams' | 'subjects';

interface PlannerViewProps {
  tasks: Task[];
  subjects: Subject[];
  exams: Exam[];
  sessions: StudySession[];
  onToggleTask: (taskId: string) => void;
  onOpenNewTask: (defaultDate?: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onFocusTask: (task: Task) => void;
  onAddSubject: (name: string, color: string) => void;
  onUpdateSubject: (id: string, name: string, color: string) => void;
  onRequestDeleteSubject: (subject: Subject) => void;
  onAddExam: (name: string, subjectId: string, date: string) => void;
  onDeleteExam: (id: string) => void;
}

const PRIORITY_STYLES: Record<Priority, { label: string; className: string }> = {
  high: { label: 'High', className: 'text-rose-600 dark:text-rose-400' },
  medium: { label: 'Medium', className: 'text-amber-600 dark:text-amber-400' },
  low: { label: 'Low', className: 'text-slate-500 dark:text-slate-400' },
};

export const PlannerView: React.FC<PlannerViewProps> = ({
  tasks,
  subjects,
  exams,
  sessions,
  onToggleTask,
  onOpenNewTask,
  onEditTask,
  onDeleteTask,
  onFocusTask,
  onAddSubject,
  onUpdateSubject,
  onRequestDeleteSubject,
  onAddExam,
  onDeleteExam,
}) => {
  const today = toLocalDateStr();
  const [subTab, setSubTab] = useState<PlannerSubTab>('tasks');

  // Task filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');

  // Timetable week state
  const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek(today));

  // Exam form state
  const [examName, setExamName] = useState('');
  const [examSubjectId, setExamSubjectId] = useState(subjects[0]?.id ?? '');
  const [examDate, setExamDate] = useState(addDays(today, 7));

  // Subject form state
  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState(SUBJECT_COLORS[0].hex);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectColor, setEditSubjectColor] = useState('');

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (subjectFilter === '__none__' && t.subjectId !== '') return false;
        if (subjectFilter !== 'all' && subjectFilter !== '__none__' && t.subjectId !== subjectFilter) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (statusFilter === 'pending' && t.completed) return false;
        if (statusFilter === 'done' && !t.completed) return false;
        if (q) {
          const subjName = subjectMap.get(t.subjectId)?.name.toLowerCase() ?? '';
          const matches =
            t.title.toLowerCase().includes(q) ||
            t.notes.toLowerCase().includes(q) ||
            subjName.includes(q);
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [tasks, subjectFilter, priorityFilter, statusFilter, searchQuery, subjectMap]);

  const weekDates = useMemo(() => getWeekDates(weekMonday), [weekMonday]);

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => a.date.localeCompare(b.date)),
    [exams]
  );

  const handleExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = examName.trim();
    if (!trimmed || !examDate) return;
    onAddExam(trimmed, examSubjectId || (subjects[0]?.id ?? ''), examDate);
    setExamName('');
  };

  const handleSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = subjectName.trim();
    if (!trimmed) return;
    onAddSubject(trimmed, subjectColor);
    setSubjectName('');
  };

  return (
    <div className="space-y-6">
      {/* Header + Segmented View Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Study Planner
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Organize assignments, weekly schedule, exams, and subjects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
            {(
              [
                { id: 'tasks', label: 'Tasks' },
                { id: 'timetable', label: 'Timetable' },
                { id: 'exams', label: 'Exams' },
                { id: 'subjects', label: 'Subjects' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  subTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. TASKS LIST */}
      {subTab === 'tasks' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks, notes, subjects..."
                  aria-label="Search tasks"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800"
                />
              </div>

              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                aria-label="Filter by subject"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">All Subjects</option>
                <option value="__none__">No subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {(['all', 'high', 'medium', 'low'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriorityFilter(p)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                      priorityFilter === p
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {(['all', 'pending', 'done'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenNewTask()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 whitespace-nowrap dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="h-4 w-4" />
              <span>New Task</span>
            </button>
          </div>

          {filteredTasks.length === 0 ? (
            <EmptyState
              illustration="tasks"
              title={tasks.length === 0 ? 'No study tasks yet' : 'No tasks match your filters'}
              description={
                tasks.length === 0
                  ? 'Create your first task with a subject, due date, and time estimate.'
                  : 'Try clearing the search query or switching status and priority filters.'
              }
              actionLabel={tasks.length === 0 ? 'Add Your First Task' : 'Reset Filters'}
              onAction={() => {
                if (tasks.length === 0) {
                  onOpenNewTask();
                } else {
                  setSearchQuery('');
                  setSubjectFilter('all');
                  setPriorityFilter('all');
                  setStatusFilter('all');
                }
              }}
            />
          ) : (
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {filteredTasks.map((task) => {
                const subject = subjectMap.get(task.subjectId);
                const isOverdue = !task.completed && task.dueDate < today;
                const priorityMeta = PRIORITY_STYLES[task.priority];

                return (
                  <div
                    key={task.id}
                    className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-start sm:justify-between ${
                      isOverdue
                        ? 'bg-rose-50/45 dark:bg-rose-950/15'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/35'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={task.completed}
                        aria-label={`Toggle "${task.title}"`}
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
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          <span
                            className={`task-title-strike ${
                              task.completed ? 'is-done text-slate-400 dark:text-slate-500' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        {task.notes && (
                          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {task.notes}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
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
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              isOverdue
                                ? 'inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400'
                                : ''
                            }
                          >
                            {isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
                            {isOverdue
                              ? `Overdue · Due ${formatShortDate(task.dueDate)}`
                              : task.dueDate === today
                                ? 'Due today'
                                : `Due ${formatShortDate(task.dueDate)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-start">
                      {!task.completed && (
                        <button
                          type="button"
                          onClick={() => onFocusTask(task)}
                          title="Focus on this task"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
                        >
                          <Play className="h-3 w-3" />
                          <span>Focus</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        aria-label={`Edit "${task.title}"`}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={`Delete "${task.title}"`}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. WEEKLY TIMETABLE (MON-SUN) */}
      {subTab === 'timetable' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatShortDate(weekDates[0])} – {formatShortDate(weekDates[6])}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekMonday((prev) => addDays(prev, -7))}
                aria-label="Previous week"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekMonday(getMondayOfWeek(today))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setWeekMonday((prev) => addDays(prev, 7))}
                aria-label="Next week"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weekDates.map((dateStr) => {
              const dt = parseLocalDate(dateStr);
              const weekday = dt.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = dt.getDate();
              const isToday = dateStr === today;
              const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
              const dayExams = exams.filter((e) => e.date === dateStr);

              return (
                <div
                  key={dateStr}
                  className={`flex min-h-[220px] flex-col rounded-xl border p-3.5 ${
                    isToday
                      ? 'border-indigo-400 bg-indigo-50/40 dark:border-indigo-700 dark:bg-indigo-950/20'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 dark:border-slate-800">
                    <div>
                      <div
                        className={`text-xs font-medium ${
                          isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {weekday}
                      </div>
                      <div className="font-mono text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {dayNum}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenNewTask(dateStr)}
                      aria-label={`Add task on ${formatShortDate(dateStr)}`}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex-1 space-y-2">
                    {dayExams.map((exam) => (
                      <div
                        key={exam.id}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
                      >
                        Exam: {exam.name}
                      </div>
                    ))}

                    {dayTasks.length === 0 && dayExams.length === 0 ? (
                      <p className="pt-4 text-center text-xs text-slate-400 dark:text-slate-500">No tasks</p>
                    ) : (
                      dayTasks.map((task) => {
                        const subj = subjectMap.get(task.subjectId);
                        const isOverdue = !task.completed && task.dueDate < today;
                        return (
                          <div
                            key={task.id}
                            className={`rounded-lg border p-2.5 text-xs transition-colors ${
                              isOverdue
                                ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/25'
                                : 'border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={task.completed}
                                aria-label={`Toggle "${task.title}"`}
                                onClick={() => onToggleTask(task.id)}
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  task.completed
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                                }`}
                              >
                                {task.completed && <Check className="h-3 w-3 stroke-[2.5]" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditTask(task)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <span
                                  className={`task-title-strike font-medium text-slate-800 dark:text-slate-200 ${
                                    task.completed ? 'is-done text-slate-400 dark:text-slate-500' : ''
                                  }`}
                                >
                                  {task.title}
                                </span>
                                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  {subj && (
                                    <span
                                      className="h-2 w-2 shrink-0 rounded-sm"
                                      style={{ backgroundColor: subj.color }}
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span className="truncate">{subj ? subj.name : 'No subject'}</span>
                                  <span>·</span>
                                  <span className="font-mono tabular-nums">{task.estimatedMinutes}m</span>
                                </div>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. EXAM TRACKER */}
      {subTab === 'exams' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleExamSubmit}
            className="space-y-4 self-start rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4"
          >
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Add Exam Countdown
            </h2>
            <div>
              <label htmlFor="exam-name" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Exam Name
              </label>
              <input
                id="exam-name"
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g., Organic Chemistry Midterm"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="exam-subject"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Subject
              </label>
              <select
                id="exam-subject"
                value={examSubjectId}
                onChange={(e) => setExamSubjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">No subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="exam-date" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Exam Date
              </label>
              <input
                id="exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Add Exam
            </button>
          </form>

          <div className="lg:col-span-8">
            {sortedExams.length === 0 ? (
              <EmptyState
                illustration="exams"
                title="No exams tracked yet"
                description="Add your upcoming midterms, finals, or quizzes to monitor countdowns."
              />
            ) : (
              <div className="space-y-3">
                {sortedExams.map((exam) => {
                  const days = daysBetween(today, exam.date);
                  const isUrgent = days >= 0 && days <= 7;
                  const isPast = days < 0;
                  const subj = subjectMap.get(exam.subjectId);

                  let countdownText = '';
                  if (days === 0) countdownText = 'Exam is today';
                  else if (days === 1) countdownText = '1 day remaining';
                  else if (days > 1) countdownText = `${days} days remaining`;
                  else countdownText = `${Math.abs(days)} days ago`;

                  return (
                    <div
                      key={exam.id}
                      className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                        isUrgent
                          ? 'border-rose-300 bg-rose-50/75 dark:border-rose-900/70 dark:bg-rose-950/25'
                          : isPast
                            ? 'border-slate-200 bg-slate-50 opacity-75 dark:border-slate-800 dark:bg-slate-900/60'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isUrgent && <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />}
                          <h3 className="truncate font-medium text-slate-900 dark:text-slate-100">{exam.name}</h3>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-slate-400">
                          {subj && (
                            <>
                              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                <span
                                  className="h-2 w-2 rounded-sm"
                                  style={{ backgroundColor: subj.color }}
                                  aria-hidden="true"
                                />
                                {subj.name}
                              </span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span>{formatShortDate(exam.date)}</span>
                          {isUrgent && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-rose-600 dark:text-rose-400">Urgent (within 7 days)</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={`font-mono text-sm font-semibold tabular-nums ${
                            isUrgent
                              ? 'text-rose-700 dark:text-rose-300'
                              : isPast
                                ? 'text-slate-400 dark:text-slate-500'
                                : 'text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {countdownText}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteExam(exam.id)}
                          aria-label={`Delete exam "${exam.name}"`}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. SUBJECT MANAGER */}
      {subTab === 'subjects' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleSubjectSubmit}
            className="space-y-4 self-start rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4"
          >
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Add Subject
            </h2>
            <div>
              <label
                htmlFor="subject-name"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Subject Name
              </label>
              <input
                id="subject-name"
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g., Microeconomics"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <span className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">Subject Color</span>
              <div className="flex flex-wrap items-center gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={`Select ${c.name}`}
                    onClick={() => setSubjectColor(c.hex)}
                    className={`h-7 w-7 rounded-lg transition-transform ${
                      subjectColor.toLowerCase() === c.hex.toLowerCase()
                        ? 'scale-110 ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  <span>Custom</span>
                  <input
                    type="color"
                    value={subjectColor}
                    onChange={(e) => setSubjectColor(e.target.value)}
                    className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Add Subject
            </button>
          </form>

          <div className="lg:col-span-8">
            {subjects.length === 0 ? (
              <EmptyState
                illustration="subjects"
                title="No subjects created"
                description="Add your courses with custom colors to organize tasks, exams, and focus statistics."
              />
            ) : (
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {subjects.map((subj) => {
                  const taskCount = tasks.filter((t) => t.subjectId === subj.id).length;
                  const focusMins = sessions
                    .filter((s) => s.subjectId === subj.id)
                    .reduce((sum, s) => sum + s.durationMinutes, 0);
                  const isEditing = editingSubjectId === subj.id;

                  return (
                    <div key={subj.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                      {isEditing ? (
                        <div className="flex flex-1 flex-wrap items-center gap-3">
                          <input
                            type="color"
                            value={editSubjectColor}
                            onChange={(e) => setEditSubjectColor(e.target.value)}
                            aria-label="Subject color"
                            className="h-8 w-8 cursor-pointer rounded border border-slate-200 bg-transparent p-0 dark:border-slate-700"
                          />
                          <input
                            type="text"
                            value={editSubjectName}
                            onChange={(e) => setEditSubjectName(e.target.value)}
                            className="min-w-[160px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editSubjectName.trim()) {
                                onUpdateSubject(subj.id, editSubjectName.trim(), editSubjectColor);
                              }
                              setEditingSubjectId(null);
                            }}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSubjectId(null)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span
                              className="h-4 w-4 shrink-0 rounded"
                              style={{ backgroundColor: subj.color }}
                              aria-hidden="true"
                            />
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{subj.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {taskCount} {taskCount === 1 ? 'task' : 'tasks'} ·{' '}
                                <span className="font-mono tabular-nums">{formatMinutesReadable(focusMins)}</span> focused
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSubjectId(subj.id);
                                setEditSubjectName(subj.name);
                                setEditSubjectColor(subj.color);
                              }}
                              aria-label={`Edit "${subj.name}"`}
                              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRequestDeleteSubject(subj)}
                              aria-label={`Delete "${subj.name}"`}
                              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
