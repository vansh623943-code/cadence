import React from 'react';
import { HelpCircle } from 'lucide-react';
import { InfoPageId } from '../../types/study';
import { InfoPageLayout } from './InfoPageLayout';

interface HowToUsePageProps {
  onBack: () => void;
  onNavigateInfo: (page: InfoPageId) => void;
}

const STEPS = [
  {
    number: '01',
    title: 'Create Your Custom Subjects',
    body: 'Open the Planner tab and add the exact courses or exam topics you are studying right now. Pick a distinctive color for each subject so tasks, timetable blocks, and focus charts stay visually organized. You can rename any subject at any time, and if you finish a course, deleting it lets you choose whether to also remove its tasks or move them safely to "No subject."',
  },
  {
    number: '02',
    title: 'Add Tasks and Track Upcoming Exams',
    body: 'Use the "New Task" button (or press N on desktop) to record homework, problem sets, or revision chapters with a priority level, due date, estimated minutes, and optional notes. Overdue tasks are automatically highlighted so nothing slips through the cracks, and you can switch to the Weekly Timetable view inside Planner to inspect Monday through Sunday at a glance. In the Exam Tracker panel, add each exam name, subject, and date—any exam within seven days turns red with a live countdown.',
  },
  {
    number: '03',
    title: 'Stay Focused With the Pomodoro Timer',
    body: 'Head to the Focus Timer tab and select a task or subject from the dropdown so every completed focus block automatically logs minutes toward your stats and daily streak. Use the default 25-minute Focus / 5-minute Short Break / 15-minute Long Break cycle, or adjust durations to match your stamina. Turn on Fullscreen Focus Mode when you want zero visual distractions, and follow the remaining time right from your browser tab title.',
  },
  {
    number: '04',
    title: 'Build a Day Timetable Manually',
    body: 'Open the Day Planner tab to map out your 00:00–24:00 schedule. Click "+ Add Block" to place Study, Break, Meal, Exercise, Sleep, or Other blocks on the timeline, then drag blocks up or down to reschedule or resize their duration directly. You can highlight blocks that cross midnight, spot overlapping slots with instant warnings, duplicate a full day using "Copy Day," or save favorite routines as reusable Templates with optional weekly weekday repeats.',
  },
  {
    number: '05',
    title: 'Use the "Plan Next 24 Hours" Wizard',
    body: 'Click "Plan Next 24 Hours" inside the Day Planner to launch the flexible schedule builder. It starts in Manual Mode by default, letting you construct your day row by row: tap quick-add chips (Wake up, Breakfast, Study, Break, Lunch, Washroom, Dinner, Sleep), let each row auto-fill its start time from the previous block, insert breaks right after Study rows with one click, and inspect free-time gaps and a live 24-hour bar preview before saving. Prefer automation? Switch to Auto Mode at the top of the wizard to enter your wake/sleep times, study hours, meals, and subject priorities, then fine-tune any generated row before saving.',
  },
  {
    number: '06',
    title: 'Set Alarms and Choose or Upload Tunes',
    body: 'Open Settings > Sounds to customize how Cadence alerts you when a focus interval, break, or Day Planner block begins. Preview six built-in synthesized tunes—Soft Chime, Temple Bell, Piano Notes, Gentle Wake, Marimba, and Digital Beep—adjust volume and alarm duration (3 seconds, 10 seconds, or until dismissed), or assign separate tunes per block type. You can also upload your own MP3, WAV, M4A, or OGG file (up to 5 MB), stored privately in your browser’s IndexedDB. When a Day Planner alarm fires, you can snooze for 5 minutes or stop it immediately.',
  },
  {
    number: '07',
    title: 'Export Your Schedule to Google Calendar (.ics)',
    body: 'Because web browsers restrict background audio when a tab is closed or a phone screen locks, Day Planner includes an "Export .ics" button. Download an industry-standard .ics calendar file for today, a custom date range, or upcoming blocks, then import it into Google Calendar, Apple Calendar, or Outlook so your phone’s native calendar handles locked-screen notifications.',
  },
  {
    number: '08',
    title: 'Install Cadence on Your Phone or Laptop',
    body: 'Cadence is an installable Progressive Web App. On Chrome, Edge, or Android, click the "Install App" button in the sidebar, header, or Settings > Data & App to add Cadence to your home screen or desktop dock. On iPhone or iPad in Safari, tap the Share button and choose "Add to Home Screen." Once installed, Cadence opens in a clean standalone window and continues working offline.',
  },
  {
    number: '09',
    title: 'Back Up Your Study Data With JSON Export',
    body: 'Visit Settings > Data & App anytime to click "Export JSON Backup." Save the file to Google Drive, iCloud, or a local folder so you always have a copy of your tasks, subjects, exams, templates, and focus logs. Use "Import JSON Backup" whenever you switch devices or browsers.',
  },
];

const FAQS = [
  {
    q: 'Does Cadence work offline?',
    a: 'Yes. Once you visit Cadence or install it as a PWA, its interface and assets are cached locally by the service worker. Your tasks, subjects, day timetable, Pomodoro timer, and built-in or uploaded alarm tunes continue working even without Wi-Fi or mobile data.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Everything you create stays strictly on your own device. Tasks, subjects, exams, focus session history, daily time blocks, templates, and settings are saved in your browser’s localStorage, while custom uploaded alarm audio files are stored in IndexedDB. Nothing is uploaded to external servers.',
  },
  {
    q: 'Will alarms ring when the app is closed?',
    a: 'No—to be completely honest about browser limitations, web apps can only guarantee sound playback and desktop notifications while the Cadence tab or installed PWA window remains open. If you need reliable alerts when your phone is locked or your browser is closed, use the Export .ics button in Day Planner to sync your blocks to Google Calendar or your phone’s built-in calendar app.',
  },
  {
    q: 'Is Cadence free?',
    a: 'Yes, Cadence is 100% free to use with no paywalls, subscriptions, or sign-up forms.',
  },
  {
    q: 'Can I use my own alarm music or ringtone?',
    a: 'Yes. In Settings > Sounds, upload any MP3, WAV, M4A, or OGG file up to 5 MB from your device. It stays saved locally in IndexedDB and can be previewed or assigned to Focus completion, Break completion, or specific Day Planner block types.',
  },
  {
    q: 'What happens if I clear my browser data or switch laptops?',
    a: 'Because Cadence stores everything locally without an account server, clearing site data for this domain in your browser will erase your workspace. Export a JSON backup from Settings > Data & App regularly so you can restore your full history on any browser in seconds.',
  },
];

export const HowToUsePage: React.FC<HowToUsePageProps> = ({ onBack, onNavigateInfo }) => {
  return (
    <InfoPageLayout currentPage="how-to-use" onBack={onBack} onNavigateInfo={onNavigateInfo}>
      <div className="space-y-8 text-slate-700 dark:text-slate-300">
        <header className="space-y-3 border-b border-slate-200 pb-6 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            User Guide
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            How to Use Cadence
          </h1>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
            Follow this step-by-step walkthrough to set up your subjects, plan realistic days, run distraction-free
            Pomodoro sessions, and protect your data.
          </p>
        </header>

        <section className="space-y-5">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Step-by-Step Guide
          </h2>
          <div className="space-y-4">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 font-mono text-xs font-semibold text-white dark:bg-indigo-500">
                    {step.number}
                  </span>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {faq.q}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </InfoPageLayout>
  );
};
