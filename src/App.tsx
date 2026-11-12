import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, AlarmClock, CheckCircle2, Square, Volume2, WifiOff } from 'lucide-react';
import { DEFAULT_SETTINGS, createEmptyData, createSeedData } from './data/seedData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTimer } from './hooks/useTimer';
import { useBlockAlarms } from './hooks/useBlockAlarms';
import {
  AppData,
  DayTemplate,
  InfoPageId,
  NavTab,
  StudySession,
  Subject,
  Task,
  TimeBlock,
  TimerSettings,
} from './types/study';
import { toLocalDateStr } from './utils/dateUtils';
import { expandTemplateToDates, getBlockTimestamps } from './utils/dayPlannerUtils';
import {
  DEFAULT_APP_DESCRIPTION,
  DEFAULT_APP_TITLE,
  getInfoPageFromPath,
  getInfoPageMeta,
} from './utils/infoRoutes';
import { AlarmPlaybackState, stopAlarm, subscribeAlarmState } from './utils/soundAndNotify';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PlannerView } from './components/PlannerView';
import { DayPlannerView } from './components/DayPlannerView';
import { TimerView } from './components/TimerView';
import { StatsView } from './components/StatsView';
import { TaskModal } from './components/TaskModal';
import { SettingsModal, SettingsTab } from './components/SettingsModal';
import { DeleteSubjectModal } from './components/DeleteSubjectModal';
import { AboutPage } from './components/info/AboutPage';
import { HowToUsePage } from './components/info/HowToUsePage';
import { StudyTipsPage } from './components/info/StudyTipsPage';
import { PrivacyPolicyPage } from './components/info/PrivacyPolicyPage';
import { TermsPage } from './components/info/TermsPage';
import { ContactPage } from './components/info/ContactPage';

const STORAGE_KEY = 'cadence-study-planner-v1';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function App() {
  const [rawAppData, setAppData] = useLocalStorage<AppData>(STORAGE_KEY, createSeedData);
  // Ensure existing localStorage users get any newly introduced arrays/settings safely
  const appData: AppData = {
    ...rawAppData,
    timeBlocks: Array.isArray(rawAppData.timeBlocks) ? rawAppData.timeBlocks : [],
    dayTemplates: Array.isArray(rawAppData.dayTemplates) ? rawAppData.dayTemplates : [],
    settings: { ...DEFAULT_SETTINGS, ...(rawAppData.settings ?? {}) },
  };

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeInfoPage, setActiveInfoPage] = useState<InfoPageId | null>(() =>
    typeof window !== 'undefined' ? getInfoPageFromPath(window.location.pathname) : null
  );

  // Task Modal state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDefaultDate, setTaskDefaultDate] = useState<string | undefined>(undefined);

  // Settings Modal state (Sounds + Data & App)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('sounds');

  // Subject deletion confirmation modal state
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Timer Session Linking & Fullscreen Focus Mode
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [linkedSubjectId, setLinkedSubjectId] = useState<string>('');
  const [focusFullscreen, setFocusFullscreen] = useState(false);

  // Global active alarm playback state
  const [alarmState, setAlarmState] = useState<AlarmPlaybackState>({
    isPlaying: false,
    tuneId: null,
    label: '',
    isPreview: false,
  });

  // Offline indicator
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Non-blocking toast feedback
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    window.setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3200);
  }, []);

  useEffect(() => {
    return subscribeAlarmState(setAlarmState);
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Sync Tailwind dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (appData.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [appData.theme]);

  const handleFocusComplete = useCallback(
    (durationMinutes: number) => {
      const linkedTask = appData.tasks.find((t) => t.id === linkedTaskId);
      const effectiveSubjectId = linkedTask ? linkedTask.subjectId || null : linkedSubjectId || null;

      const newSession: StudySession = {
        id: generateId('sess'),
        date: toLocalDateStr(),
        completedAt: new Date().toISOString(),
        durationMinutes,
        subjectId: effectiveSubjectId,
        taskId: linkedTask ? linkedTask.id : null,
      };

      setAppData((prev) => ({
        ...prev,
        sessions: [...prev.sessions, newSession],
      }));
      showToast(`Logged ${durationMinutes}-minute focus session.`);
    },
    [appData.tasks, linkedSubjectId, linkedTaskId, setAppData, showToast]
  );

  // Browser path routing & SEO meta synchronization for content/legal pages
  const handleSelectTab = useCallback((tab: NavTab) => {
    setActiveInfoPage(null);
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
  }, []);

  const handleSelectInfoPage = useCallback((page: InfoPageId) => {
    const meta = getInfoPageMeta(page);
    setActiveInfoPage(page);
    if (typeof window !== 'undefined' && window.location.pathname !== meta.path) {
      window.history.pushState(null, '', meta.path);
    }
  }, []);

  const handleBackFromInfoPage = useCallback(() => {
    setActiveInfoPage(null);
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setActiveInfoPage(getInfoPageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const meta = activeInfoPage ? getInfoPageMeta(activeInfoPage) : null;
    const desc = meta ? meta.description : DEFAULT_APP_DESCRIPTION;
    const title = meta ? meta.title : DEFAULT_APP_TITLE;

    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', desc);
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl) ogTitleEl.setAttribute('content', title);
    const ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDescEl) ogDescEl.setAttribute('content', desc);
  }, [activeInfoPage]);

  const timer = useTimer({
    settings: appData.settings,
    onFocusComplete: handleFocusComplete,
    defaultTitleOverride: activeInfoPage ? getInfoPageMeta(activeInfoPage).title : undefined,
  });

  const blockAlarms = useBlockAlarms(appData.timeBlocks, appData.settings);

  // Global keyboard shortcuts: Space = start/pause timer, N = new task, Esc = close modal / focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable === true;

      if (e.key === 'Escape') {
        if (taskModalOpen) {
          setTaskModalOpen(false);
          return;
        }
        if (settingsModalOpen) {
          setSettingsModalOpen(false);
          return;
        }
        if (subjectToDelete) {
          setSubjectToDelete(null);
          return;
        }
        if (focusFullscreen) {
          setFocusFullscreen(false);
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          return;
        }
      }

      if (isTyping || Boolean(activeInfoPage) || taskModalOpen || settingsModalOpen || Boolean(subjectToDelete)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        timer.toggle();
      } else if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setEditingTask(null);
        setTaskDefaultDate(undefined);
        setTaskModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeInfoPage, focusFullscreen, settingsModalOpen, subjectToDelete, taskModalOpen, timer]);

  // Task CRUD
  const handleToggleTask = useCallback(
    (taskId: string) => {
      setAppData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                completed: !t.completed,
                completedAt: !t.completed ? new Date().toISOString() : undefined,
              }
            : t
        ),
      }));
    },
    [setAppData]
  );

  const handleSaveTask = useCallback(
    (taskFields: Omit<Task, 'id' | 'completed' | 'createdAt' | 'completedAt'>, existingId?: string) => {
      if (existingId) {
        setAppData((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === existingId ? { ...t, ...taskFields } : t)),
        }));
        showToast('Task updated.');
      } else {
        const newTask: Task = {
          ...taskFields,
          id: generateId('task'),
          completed: false,
          createdAt: new Date().toISOString(),
        };
        setAppData((prev) => ({
          ...prev,
          tasks: [newTask, ...prev.tasks],
        }));
        showToast('Task added.');
      }
    },
    [setAppData, showToast]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      setAppData((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId),
      }));
      if (linkedTaskId === taskId) {
        setLinkedTaskId('');
      }
      showToast('Task deleted.');
    },
    [linkedTaskId, setAppData, showToast]
  );

  // Subject CRUD
  const handleAddSubject = useCallback(
    (name: string, color: string) => {
      const newSubj = { id: generateId('subj'), name, color };
      setAppData((prev) => ({
        ...prev,
        subjects: [...prev.subjects, newSubj],
      }));
      showToast(`Added subject "${name}".`);
    },
    [setAppData, showToast]
  );

  const handleUpdateSubject = useCallback(
    (id: string, name: string, color: string) => {
      setAppData((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) => (s.id === id ? { ...s, name, color } : s)),
      }));
      showToast('Subject updated.');
    },
    [setAppData, showToast]
  );

  const handleDeleteSubjectAndMoveTasks = useCallback(
    (subjectId: string) => {
      setAppData((prev) => ({
        ...prev,
        subjects: prev.subjects.filter((s) => s.id !== subjectId),
        tasks: prev.tasks.map((t) => (t.subjectId === subjectId ? { ...t, subjectId: '' } : t)),
        exams: prev.exams.map((e) => (e.subjectId === subjectId ? { ...e, subjectId: '' } : e)),
        timeBlocks: (prev.timeBlocks ?? []).map((b) =>
          b.subjectId === subjectId ? { ...b, subjectId: '' } : b
        ),
      }));
      if (linkedSubjectId === subjectId) {
        setLinkedSubjectId('');
      }
      setSubjectToDelete(null);
      showToast('Subject deleted and tasks moved to No subject.');
    },
    [linkedSubjectId, setAppData, showToast]
  );

  const handleDeleteSubjectWithTasks = useCallback(
    (subjectId: string) => {
      setAppData((prev) => {
        const deletedTaskIds = new Set(
          prev.tasks.filter((t) => t.subjectId === subjectId).map((t) => t.id)
        );
        if (linkedTaskId && deletedTaskIds.has(linkedTaskId)) {
          setLinkedTaskId('');
        }
        return {
          ...prev,
          subjects: prev.subjects.filter((s) => s.id !== subjectId),
          tasks: prev.tasks.filter((t) => t.subjectId !== subjectId),
          exams: prev.exams.map((e) => (e.subjectId === subjectId ? { ...e, subjectId: '' } : e)),
          timeBlocks: (prev.timeBlocks ?? []).map((b) =>
            b.subjectId === subjectId ? { ...b, subjectId: '' } : b
          ),
        };
      });
      if (linkedSubjectId === subjectId) {
        setLinkedSubjectId('');
      }
      setSubjectToDelete(null);
      showToast('Subject and its tasks deleted.');
    },
    [linkedSubjectId, linkedTaskId, setAppData, showToast]
  );

  // Exam CRUD
  const handleAddExam = useCallback(
    (name: string, subjectId: string, date: string) => {
      const newExam = { id: generateId('exam'), name, subjectId, date };
      setAppData((prev) => ({
        ...prev,
        exams: [...prev.exams, newExam],
      }));
      showToast(`Exam "${name}" added.`);
    },
    [setAppData, showToast]
  );

  const handleDeleteExam = useCallback(
    (id: string) => {
      setAppData((prev) => ({
        ...prev,
        exams: prev.exams.filter((e) => e.id !== id),
      }));
      showToast('Exam removed.');
    },
    [setAppData, showToast]
  );

  // Day Planner CRUD + Wizard + Copy + Templates
  const handleSaveSingleBlock = useCallback(
    (blockFields: Omit<TimeBlock, 'id'>, existingId?: string) => {
      if (existingId) {
        setAppData((prev) => ({
          ...prev,
          timeBlocks: (prev.timeBlocks ?? []).map((b) =>
            b.id === existingId ? { ...b, ...blockFields } : b
          ),
        }));
      } else {
        const newBlock: TimeBlock = { ...blockFields, id: generateId('blk') };
        setAppData((prev) => ({
          ...prev,
          timeBlocks: [...(prev.timeBlocks ?? []), newBlock],
        }));
        showToast('Time block added.');
      }
    },
    [setAppData, showToast]
  );

  const handleSaveAllRepeatBlocks = useCallback(
    (
      templateGroupId: string,
      updates: Pick<
        TimeBlock,
        'title' | 'type' | 'subjectId' | 'startTime' | 'endTime' | 'notes' | 'alarmAtStart' | 'alarm5MinBefore'
      >
    ) => {
      setAppData((prev) => ({
        ...prev,
        timeBlocks: (prev.timeBlocks ?? []).map((b) =>
          b.templateGroupId === templateGroupId ? { ...b, ...updates } : b
        ),
      }));
      showToast('Updated all repeating blocks in this series.');
    },
    [setAppData, showToast]
  );

  const handleDeleteBlock = useCallback(
    (blockId: string, deleteAllRepeats?: boolean) => {
      setAppData((prev) => {
        const list = prev.timeBlocks ?? [];
        const target = list.find((b) => b.id === blockId);
        if (deleteAllRepeats && target?.templateGroupId) {
          return {
            ...prev,
            timeBlocks: list.filter((b) => b.templateGroupId !== target.templateGroupId),
          };
        }
        return {
          ...prev,
          timeBlocks: list.filter((b) => b.id !== blockId),
        };
      });
      showToast(deleteAllRepeats ? 'Deleted all repeating blocks.' : 'Time block deleted.');
    },
    [setAppData, showToast]
  );

  const handleSaveWizardBlocks = useCallback(
    (newBlocks: TimeBlock[], replaceNext24h: boolean) => {
      const nowMs = Date.now();
      const endMs = nowMs + 24 * 60 * 60 * 1000;
      setAppData((prev) => {
        const existing = prev.timeBlocks ?? [];
        const filtered = replaceNext24h
          ? existing.filter((b) => {
              const ts = getBlockTimestamps(b);
              return ts.endMs <= nowMs || ts.startMs >= endMs;
            })
          : existing;
        return {
          ...prev,
          timeBlocks: [...filtered, ...newBlocks],
        };
      });
      showToast(`Scheduled ${newBlocks.length} blocks for the next 24 hours.`);
    },
    [setAppData, showToast]
  );

  const handleSaveManualWizardBlocks = useCallback(
    (blocks: Array<Omit<TimeBlock, 'id'>>, targetDates: string[], replaceExisting: boolean) => {
      const targetSet = new Set(targetDates);
      setAppData((prev) => {
        const existing = prev.timeBlocks ?? [];
        const base = replaceExisting ? existing.filter((b) => !targetSet.has(b.date)) : existing;
        const created: TimeBlock[] = [];
        targetDates.forEach((d) => {
          blocks.forEach((b) => {
            created.push({
              ...b,
              id: generateId('blk'),
              date: d,
            });
          });
        });
        return {
          ...prev,
          timeBlocks: [...base, ...created],
        };
      });
      showToast(
        `Saved ${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'} to ${targetDates.length} ${
          targetDates.length === 1 ? 'day' : 'days'
        }.`
      );
    },
    [setAppData, showToast]
  );

  const handleCopyDayBlocks = useCallback(
    (sourceDate: string, targetDates: string[]) => {
      setAppData((prev) => {
        const existing = prev.timeBlocks ?? [];
        const sourceBlocks = existing.filter((b) => b.date === sourceDate);
        const clones: TimeBlock[] = [];
        targetDates.forEach((d) => {
          sourceBlocks.forEach((sb) => {
            clones.push({
              ...sb,
              id: generateId('blk'),
              date: d,
              templateGroupId: undefined,
            });
          });
        });
        return {
          ...prev,
          timeBlocks: [...existing, ...clones],
        };
      });
      showToast(`Copied schedule to ${targetDates.length} ${targetDates.length === 1 ? 'day' : 'days'}.`);
    },
    [setAppData, showToast]
  );

  const handleSaveTemplate = useCallback(
    (name: string, blocks: DayTemplate['blocks']) => {
      const newTpl: DayTemplate = {
        id: generateId('tpl'),
        name,
        blocks,
        createdAt: new Date().toISOString(),
      };
      setAppData((prev) => ({
        ...prev,
        dayTemplates: [...(prev.dayTemplates ?? []), newTpl],
      }));
      showToast(`Saved template "${name}".`);
    },
    [setAppData, showToast]
  );

  const handleUpdateTemplate = useCallback(
    (updated: DayTemplate) => {
      setAppData((prev) => ({
        ...prev,
        dayTemplates: (prev.dayTemplates ?? []).map((t) => (t.id === updated.id ? updated : t)),
      }));
      showToast(`Updated template "${updated.name}".`);
    },
    [setAppData, showToast]
  );

  const handleDeleteTemplate = useCallback(
    (templateId: string) => {
      setAppData((prev) => ({
        ...prev,
        dayTemplates: (prev.dayTemplates ?? []).filter((t) => t.id !== templateId),
      }));
      showToast('Template deleted.');
    },
    [setAppData, showToast]
  );

  const handleApplyTemplate = useCallback(
    (template: DayTemplate, targetDates: string[], templateGroupId: string) => {
      const generated = expandTemplateToDates(template, targetDates, templateGroupId);
      setAppData((prev) => ({
        ...prev,
        timeBlocks: [...(prev.timeBlocks ?? []), ...generated],
      }));
      showToast(`Applied "${template.name}" to ${targetDates.length} ${targetDates.length === 1 ? 'day' : 'days'}.`);
    },
    [setAppData, showToast]
  );

  // Focus directly on a task from Dashboard or Planner
  const handleFocusTask = useCallback(
    (task: Task) => {
      setLinkedTaskId(task.id);
      setLinkedSubjectId(task.subjectId);
      setActiveTab('timer');
      if (timer.mode !== 'focus') {
        timer.switchMode('focus');
      }
    },
    [timer]
  );

  const handleUpdateSettings = useCallback(
    (nextSettings: TimerSettings) => {
      setAppData((prev) => ({ ...prev, settings: nextSettings }));
    },
    [setAppData]
  );

  const handleToggleTheme = useCallback(() => {
    setAppData((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, [setAppData]);

  const handleOpenNewTask = useCallback((defaultDate?: string) => {
    setEditingTask(null);
    setTaskDefaultDate(defaultDate);
    setTaskModalOpen(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setTaskDefaultDate(undefined);
    setTaskModalOpen(true);
  }, []);

  const handleOpenSettings = useCallback((tab: SettingsTab = 'sounds') => {
    setSettingsTab(tab);
    setSettingsModalOpen(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 lg:flex-row">
      <Sidebar
        activeTab={activeTab}
        activeInfoPage={activeInfoPage}
        onSelectTab={handleSelectTab}
        onSelectInfoPage={handleSelectInfoPage}
        theme={appData.theme}
        onToggleTheme={handleToggleTheme}
        onOpenNewTask={() => handleOpenNewTask()}
        onOpenSettings={handleOpenSettings}
        timerRunning={timer.isRunning}
        timerSecondsLeft={timer.secondsLeft}
        timerModeLabel={timer.modeLabel}
      />

      <main className="flex-1 pb-24 lg:pb-10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeInfoPage ? `info-${activeInfoPage}` : activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeInfoPage === 'about' && (
                <AboutPage onBack={handleBackFromInfoPage} onNavigateInfo={handleSelectInfoPage} />
              )}

              {activeInfoPage === 'how-to-use' && (
                <HowToUsePage onBack={handleBackFromInfoPage} onNavigateInfo={handleSelectInfoPage} />
              )}

              {activeInfoPage === 'study-tips' && (
                <StudyTipsPage onBack={handleBackFromInfoPage} onNavigateInfo={handleSelectInfoPage} />
              )}

              {activeInfoPage === 'privacy' && (
                <PrivacyPolicyPage onBack={handleBackFromInfoPage} onNavigateInfo={handleSelectInfoPage} />
              )}

              {activeInfoPage === 'terms' && (
                <TermsPage onBack={handleBackFromInfoPage} onNavigateInfo={handleSelectInfoPage} />
              )}

              {activeInfoPage === 'contact' && (
                <ContactPage onBack={handleBackFromInfoPage} onNavigateInfo={handleSelectInfoPage} />
              )}

              {!activeInfoPage && activeTab === 'dashboard' && (
                <DashboardView
                  tasks={appData.tasks}
                  subjects={appData.subjects}
                  exams={appData.exams}
                  sessions={appData.sessions}
                  timerRunning={timer.isRunning}
                  timerSecondsLeft={timer.secondsLeft}
                  timerModeLabel={timer.modeLabel}
                  onToggleTask={handleToggleTask}
                  onOpenNewTask={() => handleOpenNewTask()}
                  onNavigate={handleSelectTab}
                  onFocusTask={handleFocusTask}
                />
              )}

              {!activeInfoPage && activeTab === 'planner' && (
                <PlannerView
                  tasks={appData.tasks}
                  subjects={appData.subjects}
                  exams={appData.exams}
                  sessions={appData.sessions}
                  onToggleTask={handleToggleTask}
                  onOpenNewTask={handleOpenNewTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onFocusTask={handleFocusTask}
                  onAddSubject={handleAddSubject}
                  onUpdateSubject={handleUpdateSubject}
                  onRequestDeleteSubject={(subj) => setSubjectToDelete(subj)}
                  onAddExam={handleAddExam}
                  onDeleteExam={handleDeleteExam}
                />
              )}

              {!activeInfoPage && activeTab === 'dayPlanner' && (
                <DayPlannerView
                  timeBlocks={appData.timeBlocks}
                  dayTemplates={appData.dayTemplates}
                  subjects={appData.subjects}
                  onSaveSingleBlock={handleSaveSingleBlock}
                  onSaveAllRepeatBlocks={handleSaveAllRepeatBlocks}
                  onDeleteBlock={handleDeleteBlock}
                  onSaveWizardBlocks={handleSaveWizardBlocks}
                  onSaveManualWizardBlocks={handleSaveManualWizardBlocks}
                  onAddSubject={handleAddSubject}
                  onRequestDeleteSubject={(subj) => setSubjectToDelete(subj)}
                  onCopyDayBlocks={handleCopyDayBlocks}
                  onSaveTemplate={handleSaveTemplate}
                  onUpdateTemplate={handleUpdateTemplate}
                  onDeleteTemplate={handleDeleteTemplate}
                  onApplyTemplate={handleApplyTemplate}
                  onRequestAlarmPermissions={blockAlarms.requestAlarmPermissions}
                  onNotify={showToast}
                />
              )}

              {!activeInfoPage && activeTab === 'timer' && (
                <TimerView
                  mode={timer.mode}
                  modeLabel={timer.modeLabel}
                  isRunning={timer.isRunning}
                  secondsLeft={timer.secondsLeft}
                  progress={timer.progress}
                  completedFocusInCycle={timer.completedFocusInCycle}
                  settings={appData.settings}
                  tasks={appData.tasks}
                  subjects={appData.subjects}
                  sessions={appData.sessions}
                  linkedTaskId={linkedTaskId}
                  linkedSubjectId={linkedSubjectId}
                  focusFullscreen={focusFullscreen}
                  onSetFocusFullscreen={setFocusFullscreen}
                  onChangeLinkedTask={setLinkedTaskId}
                  onChangeLinkedSubject={setLinkedSubjectId}
                  onUpdateSettings={handleUpdateSettings}
                  onToggle={timer.toggle}
                  onReset={timer.reset}
                  onSkip={timer.skip}
                  onSwitchMode={timer.switchMode}
                  onOpenSoundSettings={() => handleOpenSettings('sounds')}
                />
              )}

              {!activeInfoPage && activeTab === 'stats' && (
                <StatsView
                  tasks={appData.tasks}
                  subjects={appData.subjects}
                  sessions={appData.sessions}
                  theme={appData.theme}
                  onNavigate={handleSelectTab}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <TaskModal
        open={taskModalOpen}
        initialTask={editingTask}
        defaultDate={taskDefaultDate}
        subjects={appData.subjects}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
      />

      <DeleteSubjectModal
        subject={subjectToDelete}
        taskCount={
          subjectToDelete ? appData.tasks.filter((t) => t.subjectId === subjectToDelete.id).length : 0
        }
        examCount={
          subjectToDelete ? appData.exams.filter((e) => e.subjectId === subjectToDelete.id).length : 0
        }
        onClose={() => setSubjectToDelete(null)}
        onDeleteAndMoveTasks={handleDeleteSubjectAndMoveTasks}
        onDeleteWithTasks={handleDeleteSubjectWithTasks}
      />

      <SettingsModal
        open={settingsModalOpen}
        initialTab={settingsTab}
        data={appData}
        onClose={() => setSettingsModalOpen(false)}
        onUpdateSettings={handleUpdateSettings}
        onImport={(imported) => setAppData(imported)}
        onResetAll={() => {
          timer.reset();
          stopAlarm();
          blockAlarms.dismissBlockAlarm();
          setLinkedTaskId('');
          setLinkedSubjectId('');
          setAppData((prev) => createEmptyData(prev.theme));
        }}
        onRestoreSample={() => {
          timer.reset();
          stopAlarm();
          blockAlarms.dismissBlockAlarm();
          setLinkedTaskId('');
          setLinkedSubjectId('');
          setAppData((prev) => ({
            ...createSeedData(),
            theme: prev.theme,
          }));
        }}
        onNavigateInfoPage={handleSelectInfoPage}
        onNotify={showToast}
      />

      {/* Active Day Planner Block Alarm Banner with Snooze (5 min) & Stop */}
      <AnimatePresence>
        {blockAlarms.activeBlockAlarm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            role="alert"
            className="fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-xl border border-indigo-300 bg-white px-4 py-3 shadow-xl dark:border-indigo-700 dark:bg-slate-900 lg:bottom-6 lg:left-auto lg:right-6"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <AlarmClock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {blockAlarms.activeBlockAlarm.title}
                </div>
                <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {blockAlarms.activeBlockAlarm.subtitle}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => blockAlarms.snoozeBlockAlarm(5)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Snooze 5m
              </button>
              <button
                type="button"
                onClick={blockAlarms.dismissBlockAlarm}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
              >
                <Square className="h-3 w-3 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Pomodoro Alarm Banner (when not replaced by block alarm) */}
      <AnimatePresence>
        {alarmState.isPlaying && !alarmState.isPreview && !blockAlarms.activeBlockAlarm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            role="alert"
            className="fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-indigo-300 bg-white px-4 py-3 shadow-xl dark:border-indigo-700 dark:bg-slate-900 lg:bottom-6 lg:left-auto lg:right-6"
          >
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-900 dark:text-slate-100">
              <Volume2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>{alarmState.label || 'Timer alarm'}</span>
            </div>
            <button
              type="button"
              onClick={stopAlarm}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-700"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Stop alarm</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Status Notice */}
      {!isOnline && (
        <div className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-200 lg:bottom-6 lg:left-72">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline mode · Local data active</span>
        </div>
      )}

      {/* Non-blocking Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            role="status"
            aria-live="polite"
            className={`fixed bottom-20 right-4 z-50 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg lg:bottom-6 lg:right-6 ${
              toast.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
                : 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
