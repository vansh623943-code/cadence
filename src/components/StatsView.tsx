import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, CheckCircle2, Clock, Flame } from 'lucide-react';
import { NavTab, StudySession, Subject, Task } from '../types/study';
import {
  addDays,
  computeStreaks,
  formatMinutesReadable,
  formatShortDate,
  getLastNDays,
  getMondayOfWeek,
  parseLocalDate,
  toLocalDateStr,
} from '../utils/dateUtils';
import { EmptyState } from './EmptyState';

interface StatsViewProps {
  tasks: Task[];
  subjects: Subject[];
  sessions: StudySession[];
  theme: 'light' | 'dark';
  onNavigate: (tab: NavTab) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  tasks,
  subjects,
  sessions,
  theme,
  onNavigate,
}) => {
  const today = toLocalDateStr();
  const [hoveredDay, setHoveredDay] = useState<{ date: string; minutes: number; count: number } | null>(null);

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const { currentStreak, longestStreak } = useMemo(
    () => computeStreaks(sessions.map((s) => s.date)),
    [sessions]
  );

  const totalTasksCompleted = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);

  const totalFocusMinutes = useMemo(
    () => sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    [sessions]
  );

  // Last 7 days bar chart data
  const last7DaysData = useMemo(() => {
    const days = getLastNDays(7, today);
    const byDate = new Map<string, number>();
    for (const s of sessions) {
      byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.durationMinutes);
    }
    return days.map((d) => {
      const dt = parseLocalDate(d);
      return {
        date: d,
        label: dt.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: formatShortDate(d),
        minutes: byDate.get(d) ?? 0,
      };
    });
  }, [sessions, today]);

  // Subject breakdown pie chart data
  const subjectSplitData = useMemo(() => {
    const bySubj = new Map<string, number>();
    for (const s of sessions) {
      const key = s.subjectId && subjectMap.has(s.subjectId) ? s.subjectId : 'general';
      bySubj.set(key, (bySubj.get(key) ?? 0) + s.durationMinutes);
    }

    const rows = Array.from(bySubj.entries()).map(([key, minutes]) => {
      if (key === 'general') {
        return { id: 'general', name: 'No subject', color: '#64748B', minutes };
      }
      const subj = subjectMap.get(key)!;
      return { id: subj.id, name: subj.name, color: subj.color, minutes };
    });

    return rows.sort((a, b) => b.minutes - a.minutes);
  }, [sessions, subjectMap]);

  // 16-week GitHub-style study heatmap (Mon-Sun columns)
  const heatmapWeeks = useMemo(() => {
    const dayStats = new Map<string, { minutes: number; count: number }>();
    for (const s of sessions) {
      const prev = dayStats.get(s.date) ?? { minutes: 0, count: 0 };
      dayStats.set(s.date, { minutes: prev.minutes + s.durationMinutes, count: prev.count + 1 });
    }

    const currentMonday = getMondayOfWeek(today);
    const startMonday = addDays(currentMonday, -15 * 7);
    const weeks: Array<Array<{ date: string; minutes: number; count: number; isFuture: boolean }>> = [];

    for (let w = 0; w < 16; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(startMonday, w * 7 + d);
        const stat = dayStats.get(date) ?? { minutes: 0, count: 0 };
        col.push({
          date,
          minutes: stat.minutes,
          count: stat.count,
          isFuture: date > today,
        });
      }
      weeks.push(col);
    }
    return weeks;
  }, [sessions, today]);

  const getHeatmapCellClass = (minutes: number, isFuture: boolean) => {
    if (isFuture) return 'bg-slate-100/60 dark:bg-slate-800/30 opacity-40';
    if (minutes === 0) return 'bg-slate-100 dark:bg-slate-800';
    if (minutes < 30) return 'bg-indigo-200 dark:bg-indigo-900/70';
    if (minutes < 60) return 'bg-indigo-400 dark:bg-indigo-700';
    if (minutes < 90) return 'bg-indigo-500 dark:bg-indigo-500';
    return 'bg-indigo-700 dark:bg-indigo-400';
  };

  const axisColor = theme === 'dark' ? '#94A3B8' : '#64748B';
  const gridColor = theme === 'dark' ? '#1E293B' : '#E2E8F0';
  const tooltipBg = theme === 'dark' ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = theme === 'dark' ? '#334155' : '#E2E8F0';

  if (sessions.length === 0 && totalTasksCompleted === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Study Statistics
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track your focus trends, subject balance, and study consistency.
          </p>
        </div>
        <EmptyState
          illustration="stats"
          title="No focus sessions recorded yet"
          description="Complete your first Pomodoro focus session or mark tasks done to unlock your charts and streaks."
          actionLabel="Open Focus Timer"
          onAction={() => onNavigate('timer')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Study Statistics
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Focus time trends, subject breakdown, and daily consistency.
        </p>
      </div>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Current Streak</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
          </div>
        </div>

        <div className="border-l border-slate-200 p-5 dark:border-slate-800 lg:border-l-0">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Longest Streak</span>
            <Award className="h-4 w-4 text-violet-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Tasks Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {totalTasksCompleted}
          </div>
        </div>

        <div className="border-l border-slate-200 p-5 dark:border-slate-800 lg:border-l-0">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Focus Time</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {(totalFocusMinutes / 60).toFixed(1)}h
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {formatMinutesReadable(totalFocusMinutes)} across {sessions.length} sessions
          </p>
        </div>
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Bar Chart: Focus minutes last 7 days */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Focus Minutes · Last 7 Days
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily deep work volume
              </p>
            </div>
            <span className="font-mono text-xs font-medium tabular-nums text-indigo-600 dark:text-indigo-400">
              {formatMinutesReadable(last7DaysData.reduce((s, d) => s + d.minutes, 0))} total
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 12 }}
                  unit="m"
                />
                <Tooltip
                  cursor={{ fill: theme === 'dark' ? 'rgba(99,102,241,0.12)' : 'rgba(79,70,229,0.06)' }}
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown) => [`${Number(value)} minutes`, 'Focus']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ''}
                />
                <Bar
                  dataKey="minutes"
                  fill={theme === 'dark' ? '#818CF8' : '#4F46E5'}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Pie Chart: Time Split by Subject */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div className="mb-4">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Time by Subject
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribution across all logged focus sessions
            </p>
          </div>

          {subjectSplitData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No subject sessions logged yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectSplitData}
                      dataKey="minutes"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {subjectSplitData.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                      }}
                      formatter={(value: unknown) => [`${formatMinutesReadable(Number(value))}`, 'Focused']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                {subjectSplitData.map((item) => {
                  const pct = totalFocusMinutes > 0 ? Math.round((item.minutes / totalFocusMinutes) * 100) : 0;
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate font-medium">{item.name}</span>
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {formatMinutesReadable(item.minutes)} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* GitHub-style Study Heatmap */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Study Activity Heatmap
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hoveredDay
                ? `${formatShortDate(hoveredDay.date)}: ${formatMinutesReadable(hoveredDay.minutes)} (${hoveredDay.count} sessions)`
                : 'Last 16 weeks of daily focus sessions — hover any cell to inspect'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Less</span>
            <span className="h-3 w-3 rounded-[3px] bg-slate-100 dark:bg-slate-800" />
            <span className="h-3 w-3 rounded-[3px] bg-indigo-200 dark:bg-indigo-900/70" />
            <span className="h-3 w-3 rounded-[3px] bg-indigo-400 dark:bg-indigo-700" />
            <span className="h-3 w-3 rounded-[3px] bg-indigo-500 dark:bg-indigo-500" />
            <span className="h-3 w-3 rounded-[3px] bg-indigo-700 dark:bg-indigo-400" />
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="inline-flex items-start gap-2">
            <div className="grid grid-rows-7 gap-1.5 pt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="h-3.5 leading-[14px]">Mon</span>
              <span className="h-3.5 leading-[14px]" />
              <span className="h-3.5 leading-[14px]">Wed</span>
              <span className="h-3.5 leading-[14px]" />
              <span className="h-3.5 leading-[14px]">Fri</span>
              <span className="h-3.5 leading-[14px]" />
              <span className="h-3.5 leading-[14px]">Sun</span>
            </div>

            <div className="flex gap-1.5">
              {heatmapWeeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                  {week.map((cell) => (
                    <button
                      key={cell.date}
                      type="button"
                      disabled={cell.isFuture}
                      onMouseEnter={() =>
                        setHoveredDay({ date: cell.date, minutes: cell.minutes, count: cell.count })
                      }
                      onFocus={() =>
                        setHoveredDay({ date: cell.date, minutes: cell.minutes, count: cell.count })
                      }
                      onMouseLeave={() => setHoveredDay(null)}
                      aria-label={`${formatShortDate(cell.date)}: ${cell.minutes} minutes studied`}
                      className={`h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-125 focus-visible:outline-2 focus-visible:outline-indigo-500 ${getHeatmapCellClass(
                        cell.minutes,
                        cell.isFuture
                      )}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
