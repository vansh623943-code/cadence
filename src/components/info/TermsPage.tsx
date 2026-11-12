import React from 'react';
import { InfoPageId } from '../../types/study';
import { InfoPageLayout } from './InfoPageLayout';

interface TermsPageProps {
  onBack: () => void;
  onNavigateInfo: (page: InfoPageId) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack, onNavigateInfo }) => {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <InfoPageLayout currentPage="terms" onBack={onBack} onNavigateInfo={onNavigateInfo}>
      <div className="space-y-7 text-slate-700 dark:text-slate-300">
        <header className="space-y-2 border-b border-slate-200 pb-6 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Legal
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Terms of Use
          </h1>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Last updated: {lastUpdated}
          </p>
        </header>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            1. Free Personal &amp; Educational Use
          </h2>
          <p className="text-sm leading-relaxed">
            Cadence is provided free of charge for personal and educational study planning, time management, and
            focus tracking. By accessing or using Cadence, you agree to these Terms of Use.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            2. Provided &ldquo;As Is&rdquo;
          </h2>
          <p className="text-sm leading-relaxed">
            Cadence is offered strictly on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without
            warranties of any kind, express or implied, including fitness for a particular purpose, uninterrupted
            availability, or error-free operation.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            3. Alarms &amp; Reminder Limitations
          </h2>
          <p className="text-sm leading-relaxed">
            Due to standard web browser and operating system restrictions, audio alarms and browser
            notifications are not guaranteed when the Cadence tab or app window is closed, put to sleep by your
            device&apos;s battery saver, or blocked by device mute/permission settings. For critical wake-up
            calls, exam arrival times, or closed-app reminders, please export your schedule via the{' '}
            <strong>.ics</strong> calendar export feature or use your device&apos;s native alarm clock.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            4. Your Responsibility for Data Backups
          </h2>
          <p className="text-sm leading-relaxed">
            Cadence stores your tasks, subjects, exams, timetables, and uploaded alarm tunes locally inside your
            browser&apos;s storage without remote server backups. Clearing browser cookies/site data, using
            incognito windows, or uninstalling your browser may erase local records. You are solely responsible
            for maintaining regular copies of your study data using the <strong>Export JSON Backup</strong>{' '}
            option in Settings.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            5. Limitation of Liability
          </h2>
          <p className="text-sm leading-relaxed">
            To the fullest extent permitted by applicable law, Vansh Thakur and Cadence shall not be liable for
            any direct, indirect, incidental, special, or consequential damages—including missed deadlines,
            missed exams, silenced alarms, or loss of locally stored data—arising out of your use of or
            inability to use the application.
          </p>
        </section>

        <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            6. Questions
          </h2>
          <p className="text-sm leading-relaxed">
            Questions about these Terms can be sent to Vansh Thakur at{' '}
            <a
              href="mailto:vanshthakur50568@gmail.com"
              className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400"
            >
              vanshthakur50568@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </InfoPageLayout>
  );
};
