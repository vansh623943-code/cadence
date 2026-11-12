import { InfoPageId } from '../types/study';

export interface InfoPageMeta {
  id: InfoPageId;
  path: string;
  label: string;
  title: string;
  description: string;
}

export const INFO_PAGES: InfoPageMeta[] = [
  {
    id: 'about',
    path: '/about',
    label: 'About',
    title: 'About Cadence — Free Student Study Planner & Pomodoro Timer',
    description:
      'Learn about Cadence, a free, privacy-first study planner, day timetable builder, and Pomodoro focus timer created by Vansh Thakur for students.',
  },
  {
    id: 'how-to-use',
    path: '/how-to-use',
    label: 'How to Use',
    title: 'How to Use Cadence — Step-by-Step Study Guide & FAQ',
    description:
      'Step-by-step guide to using Cadence: custom subjects, task & exam tracking, Pomodoro timer, 24-hour day planner, alarms, .ics calendar export, and JSON backups.',
  },
  {
    id: 'study-tips',
    path: '/study-tips',
    label: 'Study Tips',
    title: 'Evidence-Based Study Tips for Students — Cadence',
    description:
      'Practical student study tips covering the Pomodoro Technique, realistic timetabling, active recall, spaced repetition, exam week prep, sleep, and study streaks.',
  },
  {
    id: 'privacy',
    path: '/privacy',
    label: 'Privacy Policy',
    title: 'Privacy Policy — Cadence',
    description:
      'Read Cadence’s Privacy Policy covering local browser storage (localStorage and IndexedDB), Google advertising cookies, opt-out options, notifications, and data deletion.',
  },
  {
    id: 'terms',
    path: '/terms',
    label: 'Terms',
    title: 'Terms of Use — Cadence',
    description:
      'Terms of Use for Cadence, including free usage terms, local data backup responsibilities, alarm limitations, and disclaimer of warranties.',
  },
  {
    id: 'contact',
    path: '/contact',
    label: 'Contact',
    title: 'Contact Us — Cadence',
    description:
      'Get in touch with Vansh Thakur for support, bug reports, or feature suggestions for the Cadence study planner app.',
  },
];

export const DEFAULT_APP_TITLE = 'Cadence — Study Planner, Timetable & Pomodoro Timer';
export const DEFAULT_APP_DESCRIPTION =
  'Organize tasks, exam countdowns, custom subjects, daily time blocks, and Pomodoro focus sessions in Cadence—a free, privacy-first student study planner.';

export function getInfoPageFromPath(pathname: string): InfoPageId | null {
  const normalized = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  if (normalized === '/privacy-policy') return 'privacy';
  if (normalized === '/terms-of-use') return 'terms';
  const match = INFO_PAGES.find((p) => p.path === normalized);
  return match ? match.id : null;
}

export function getInfoPageMeta(id: InfoPageId): InfoPageMeta {
  return INFO_PAGES.find((p) => p.id === id) || INFO_PAGES[0];
}
