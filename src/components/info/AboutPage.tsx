import React from 'react';
import {
  BarChart3,
  CalendarClock,
  CheckSquare,
  Download,
  GraduationCap,
  Palette,
  ShieldCheck,
  Smartphone,
  Timer,
} from 'lucide-react';
import { InfoPageId } from '../../types/study';
import { InfoPageLayout } from './InfoPageLayout';

interface AboutPageProps {
  onBack: () => void;
  onNavigateInfo: (page: InfoPageId) => void;
}

const CAPABILITIES = [
  {
    icon: CheckSquare,
    title: 'Task Planner & Weekly Timetable',
    desc: 'Organize assignments, readings, and revision goals with priority levels, due dates, time estimates, notes, search filters, overdue highlights, and a Monday-to-Sunday timetable.',
  },
  {
    icon: GraduationCap,
    title: 'Exam Countdowns',
    desc: 'Track upcoming tests and finals in one place with automatic day countdowns that highlight exams within seven days so critical deadlines never sneak up on you.',
  },
  {
    icon: Palette,
    title: 'Custom Subjects',
    desc: 'Create your own courses with custom names and colors—no rigid presets. Rename subjects anytime or delete them while choosing whether to keep or remove linked tasks.',
  },
  {
    icon: Timer,
    title: 'Pomodoro Focus Timer',
    desc: 'Run customizable Focus, Short Break, and Long Break intervals backed by timestamp-accurate timing, live browser tab countdowns, fullscreen Focus Mode, and gentle Web Audio alarms.',
  },
  {
    icon: CalendarClock,
    title: '24-Hour Day Planner & Alarms',
    desc: 'Block out your entire day on a 00:00–24:00 timeline, copy routines across dates, build reusable templates, use the Plan Next 24 Hours wizard, and upload custom alarm tunes.',
  },
  {
    icon: BarChart3,
    title: 'Stats & Study Streaks',
    desc: 'Monitor daily focus minutes over the past week, inspect subject time splits, maintain consecutive study streaks, and review a multi-week activity heatmap.',
  },
  {
    icon: Download,
    title: 'Calendar & JSON Export',
    desc: 'Export any day’s schedule as an .ics file for Google Calendar, Apple Calendar, or Outlook, and back up your entire workspace as a portable JSON file.',
  },
  {
    icon: Smartphone,
    title: 'Installable Offline App',
    desc: 'Install Cadence as a Progressive Web App on Android, iOS, macOS, or Windows so your planner, timer, and schedules stay accessible even without an internet connection.',
  },
];

export const AboutPage: React.FC<AboutPageProps> = ({ onBack, onNavigateInfo }) => {
  return (
    <InfoPageLayout currentPage="about" onBack={onBack} onNavigateInfo={onNavigateInfo}>
      <div className="space-y-8 text-slate-700 dark:text-slate-300">
        <header className="space-y-3 border-b border-slate-200 pb-6 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            About the Project
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            About Cadence
          </h1>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
            Cadence is a free study planner and Pomodoro focus timer built to help students organize tasks,
            upcoming exams, custom subjects, and realistic daily timetables in one calm workspace.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Our Mission
          </h2>
          <p className="leading-relaxed">
            Most students juggle half a dozen disconnected tools just to get through a week of classes: one
            app for a to-do list, another for a Pomodoro clock, sticky notes for exam dates, and a separate
            calendar for time blocking. Switching between cluttered platforms wastes mental energy before you
            even open your textbook.
          </p>
          <p className="leading-relaxed">
            Cadence was created by <strong>Vansh Thakur</strong>, a student and developer who built the app to
            solve real, everyday study-planning challenges—like balancing exam revision alongside coursework,
            preventing burnout through structured breaks, and building daily schedules you can actually stick
            to. The mission behind Cadence is simple: provide a fast, distraction-free study companion that is
            completely free to use, easy to customize, and respectful of your attention.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            What You Can Do With Cadence
          </h2>
          <p className="leading-relaxed">
            Every feature in Cadence works together so your long-term goals connect directly to what you work
            on during your next twenty-five-minute focus block:
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="mb-2 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Who It Is For
          </h2>
          <p className="leading-relaxed">
            Cadence is designed for high school students, university undergraduates, graduate researchers, and
            self-learners preparing for competitive exams or certification tests. Whether you prefer loose daily
            task checklists or strict hour-by-hour time blocking, Cadence adapts to your study style without
            forcing rigid workflows or complicated setup menus.
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Privacy-First Approach
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Your study plans belong to you. Cadence requires no account registration, no password, and no cloud
            sync subscription. All of your tasks, subjects, exam dates, focus session history, daily time
            blocks, and custom uploaded alarm tunes stay directly on your own device using your browser&apos;s
            local storage and IndexedDB. Whenever you want to move to a new laptop or keep a personal copy,
            you can export everything as a clean JSON backup in a single click.
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
};
