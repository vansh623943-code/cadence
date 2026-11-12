import { AppData, Subject, TimerSettings } from '../types/study';
import { addDays, toLocalDateStr } from '../utils/dateUtils';

export const SUBJECT_COLORS = [
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Sky', hex: '#0284C7' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Rose', hex: '#E11D48' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Slate', hex: '#475569' },
];

export const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  soundEnabled: true,
  notificationsEnabled: true,
  focusEndTuneId: 'soft-chime',
  breakEndTuneId: 'temple-bell',
  alarmVolume: 0.75,
  alarmDuration: '3s',
};

export const STUDY_QUOTES = [
  {
    text: 'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
  },
  {
    text: 'Amateurs sit and wait for inspiration, the rest of us just get up and go to work.',
    author: 'Stephen King',
  },
  {
    text: 'It is not that I am so smart, it is just that I stay with problems longer.',
    author: 'Albert Einstein',
  },
  {
    text: 'Focus on being productive instead of busy.',
    author: 'Tim Ferriss',
  },
  {
    text: 'The secret of getting ahead is getting started.',
    author: 'Mark Twain',
  },
  {
    text: 'You do not rise to the level of your goals. You fall to the level of your systems.',
    author: 'James Clear',
  },
  {
    text: 'Tell me and I forget, teach me and I may remember, involve me and I learn.',
    author: 'Benjamin Franklin',
  },
  {
    text: 'One hour of concentrated study is worth three hours of distracted reading.',
    author: 'Cal Newport',
  },
];

export function getDailyQuote(offset: number = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const idx = (dayOfYear + offset) % STUDY_QUOTES.length;
  return STUDY_QUOTES[idx];
}

export function createSeedData(): AppData {
  const today = toLocalDateStr();
  const nowIso = new Date().toISOString();

  const subjects: Subject[] = [];

  const tasks = [
    {
      id: 'task-1',
      title: 'Review today’s lecture notes and key concepts',
      subjectId: '',
      priority: 'high' as const,
      dueDate: today,
      estimatedMinutes: 45,
      notes: 'Add your own subjects in Planner or the Schedule Wizard to organize tasks by course.',
      completed: false,
      createdAt: nowIso,
    },
    {
      id: 'task-2',
      title: 'Complete practice problems (25-min focus block)',
      subjectId: '',
      priority: 'medium' as const,
      dueDate: today,
      estimatedMinutes: 25,
      notes: '',
      completed: false,
      createdAt: nowIso,
    },
  ];

  const exams: AppData['exams'] = [];
  const sessions: AppData['sessions'] = [];

  return {
    subjects,
    tasks,
    exams,
    sessions,
    timeBlocks: [],
    dayTemplates: [],
    settings: DEFAULT_SETTINGS,
    theme: 'light',
  };
}

export function createEmptyData(theme: 'light' | 'dark' = 'light'): AppData {
  return {
    subjects: [],
    tasks: [],
    exams: [],
    sessions: [],
    timeBlocks: [],
    dayTemplates: [],
    settings: DEFAULT_SETTINGS,
    theme,
  };
}
