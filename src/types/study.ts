export type NavTab = 'dashboard' | 'planner' | 'dayPlanner' | 'timer' | 'stats';

export type InfoPageId =
  | 'about'
  | 'how-to-use'
  | 'study-tips'
  | 'privacy'
  | 'terms'
  | 'contact';

export type Priority = 'high' | 'medium' | 'low';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export type BlockType = 'study' | 'break' | 'meal' | 'exercise' | 'sleep' | 'other';

export type BuiltInTuneId =
  | 'soft-chime'
  | 'temple-bell'
  | 'piano-notes'
  | 'gentle-wake'
  | 'marimba'
  | 'digital-beep';

export type AlarmDuration = '3s' | '10s' | 'untilDismissed';

export interface CustomTune {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  blob: Blob;
}

export type CustomTuneMeta = Omit<CustomTune, 'blob'>;

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  subjectId: string; // '' means No subject
  priority: Priority;
  dueDate: string; // YYYY-MM-DD
  estimatedMinutes: number;
  notes: string;
  completed: boolean;
  completedAt?: string; // ISO string
  createdAt: string; // ISO string
}

export interface Exam {
  id: string;
  name: string;
  subjectId: string; // '' means No subject
  date: string; // YYYY-MM-DD
}

export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD (local)
  completedAt: string; // ISO timestamp
  durationMinutes: number;
  subjectId: string | null;
  taskId: string | null;
}

export interface TimeBlock {
  id: string;
  date: string; // YYYY-MM-DD (local start date)
  startTime: string; // HH:mm (00:00 - 23:59)
  endTime: string; // HH:mm (00:00 - 24:00; if <= startTime, crosses into next day)
  title: string;
  type: BlockType;
  customColor?: string;
  subjectId: string; // '' means No subject
  notes: string;
  alarmAtStart: boolean;
  alarm5MinBefore: boolean;
  templateGroupId?: string;
}

export interface TemplateBlockItem {
  id: string;
  title: string;
  type: BlockType;
  customColor?: string;
  subjectId: string;
  startTime: string;
  endTime: string;
  notes: string;
  alarmAtStart: boolean;
  alarm5MinBefore: boolean;
}

export interface DayTemplate {
  id: string;
  name: string;
  blocks: TemplateBlockItem[];
  repeatRule?: {
    weekdays: number[]; // 1 = Mon ... 7 = Sun
    startDate: string;
    endDate?: string;
  };
  createdAt: string;
}

export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  focusEndTuneId: string;
  breakEndTuneId: string;
  alarmVolume: number; // 0 to 1
  alarmDuration: AlarmDuration;
  blockTypeTunes?: Partial<Record<BlockType, string>>;
}

export interface AppData {
  subjects: Subject[];
  tasks: Task[];
  exams: Exam[];
  sessions: StudySession[];
  timeBlocks: TimeBlock[];
  dayTemplates: DayTemplate[];
  settings: TimerSettings;
  theme: 'light' | 'dark';
}
