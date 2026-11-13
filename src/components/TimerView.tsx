import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Settings,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { StudySession, Subject, Task, TimerMode, TimerSettings } from '../types/study';
import { formatClock, formatMinutesReadable, toLocalDateStr } from '../utils/dateUtils';
import {
  AlarmPlaybackState,
  requestNotificationPermission,
  stopAlarm,
  subscribeAlarmState,
} from '../utils/soundAndNotify';

interface TimerViewProps {
  mode: TimerMode;
  modeLabel: string;
  isRunning: boolean;
  secondsLeft: number;
  progress: number;
  completedFocusInCycle: number;
  settings: TimerSettings;
  tasks: Task[];
  subjects: Subject[];
  sessions: StudySession[];
  linkedTaskId: string;
  linkedSubjectId: string;
  focusFullscreen: boolean;
  onSetFocusFullscreen: (open: boolean) => void;
  onChangeLinkedTask: (taskId: string) => void;
  onChangeLinkedSubject: (subjectId: string) => void;
  onUpdateSettings: (next: TimerSettings) => void;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
  onSwitchMode: (mode: TimerMode) => void;
  onOpenSoundSettings: () => void;
}

export const TimerView: React.FC<TimerViewProps> = ({
  mode,
  modeLabel,
  isRunning,
  secondsLeft,
  progress,
  completedFocusInCycle,
  settings,
  tasks,
  subjects,
  sessions,
  linkedTaskId,
  linkedSubjectId,
  focusFullscreen,
  onSetFocusFullscreen,
  onChangeLinkedTask,
  onChangeLinkedSubject,
  onUpdateSettings,
  onToggle,
  onReset,
  onSkip,
  onSwitchMode,
  onOpenSoundSettings,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [notifStatus, setNotifStatus] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [alarmState, setAlarmState] = useState<AlarmPlaybackState>({
    isPlaying: false,
    tuneId: null,
    label: '',
    isPreview: false,
  });
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeAlarmState(setAlarmState);
  }, []);

  const today = toLocalDateStr();
  const todaySessions = useMemo(() => sessions.filter((s) => s.date === today), [sessions, today]);
  const todayMinutes = useMemo(
    () => todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    [todaySessions]
  );

  const pendingTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const linkedTask = useMemo(() => tasks.find((t) => t.id === linkedTaskId), [tasks, linkedTaskId]);
  const linkedSubject = useMemo(
    () => subjects.find((s) => s.id === (linkedTask ? linkedTask.subjectId : linkedSubjectId)),
    [subjects, linkedTask, linkedSubjectId]
  );

  // Sync browser fullscreen exit with in-app focusFullscreen state
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        // Keep focusFullscreen controllable manually too
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const enterFocusFullscreen = () => {
    onSetFocusFullscreen(true);
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // In-app fullscreen overlay remains active
    }
  };

  const exitFocusFullscreen = () => {
    onSetFocusFullscreen(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {
      // Ignore if fullscreen was blocked by iframe
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const perm = await requestNotificationPermission();
      setNotifStatus(perm);
    }
    onUpdateSettings({ ...settings, notificationsEnabled: enabled });
  };

  // SVG Ring geometry
  const ringSize = focusFullscreen ? 320 : 280;
  const strokeWidth = 10;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const strokeColorClass =
    mode === 'focus'
      ? 'stroke-indigo-600 dark:stroke-indigo-400'
      : mode === 'shortBreak'
        ? 'stroke-emerald-600 dark:stroke-emerald-400'
        : 'stroke-violet-600 dark:stroke-violet-400';

  const renderTimerRing = () => (
    <div className="relative flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
      <svg className="-rotate-90" width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`transition-[stroke-dashoffset] duration-300 ease-out ${strokeColorClass}`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{modeLabel}</span>
        <span
          className={`mt-1 font-mono font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100 ${
            focusFullscreen ? 'text-6xl' : 'text-5xl'
          }`}
        >
          {formatClock(secondsLeft)}
        </span>
        <div className="mt-3 flex items-center gap-1.5" aria-label={`Cycle progress: ${completedFocusInCycle} of ${settings.longBreakInterval}`}>
          {Array.from({ length: Math.max(1, settings.longBreakInterval) }, (_, idx) => (
            <span
              key={idx}
              className={`h-2 w-5 rounded-full transition-colors ${
                idx < completedFocusInCycle
                  ? 'bg-indigo-600 dark:bg-indigo-400'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // Fullscreen distraction-free Focus Mode overlay
  if (focusFullscreen) {
    return (
      <div
        ref={fullscreenContainerRef}
        className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-50 px-6 py-8 dark:bg-slate-950"
      >
        <div className="flex w-full max-w-3xl items-center justify-between">
          <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">Kilostudy Planner · Focus Mode</span>
          <button
            type="button"
            onClick={exitFocusFullscreen}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Minimize2 className="h-4 w-4" />
            <span>Exit Focus Mode</span>
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="mb-6 inline-flex rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
            {(
              [
                { id: 'focus', label: 'Focus' },
                { id: 'shortBreak', label: 'Short Break' },
                { id: 'longBreak', label: 'Long Break' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSwitchMode(m.id)}
                className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  mode === m.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {renderTimerRing()}

          {(linkedTask || linkedSubject) && (
            <div className="mt-6 text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">Focusing on</div>
              <div className="mt-1 flex items-center justify-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                {linkedSubject && (
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: linkedSubject.color }}
                    aria-hidden="true"
                  />
                )}
                <span>{linkedTask ? linkedTask.title : linkedSubject?.name}</span>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset timer"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-600 px-7 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isRunning ? 'Pause' : 'Start'}</span>
            </button>

            <button
              type="button"
              onClick={onSkip}
              aria-label="Skip to next interval"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Press <kbd className="rounded border border-slate-300 px-1.5 py-0.5 font-mono dark:border-slate-700">Space</kbd> to start/pause · <kbd className="rounded border border-slate-300 px-1.5 py-0.5 font-mono dark:border-slate-700">Esc</kbd> to exit
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Focus Timer
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Deep work intervals synced with your tasks and subjects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {alarmState.isPlaying && (
            <button
              type="button"
              onClick={stopAlarm}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 whitespace-nowrap"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop alarm</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSoundSettings}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Volume2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Sounds</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              showSettings
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Durations</span>
          </button>

          <button
            type="button"
            onClick={enterFocusFullscreen}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Maximize2 className="h-4 w-4" />
            <span>Focus Mode</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Circular Timer Card */}
        <section className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          {/* Mode Tabs */}
          <div className="mb-8 inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                { id: 'focus', label: 'Focus' },
                { id: 'shortBreak', label: 'Short Break' },
                { id: 'longBreak', label: 'Long Break' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSwitchMode(m.id)}
                className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  mode === m.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {renderTimerRing()}

          {/* Timer Controls */}
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset timer"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
            </button>

            <button
              type="button"
              onClick={onSkip}
              aria-label="Skip interval"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Completed today: <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">{todaySessions.length}</span> sessions ·{' '}
            <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">{formatMinutesReadable(todayMinutes)}</span>
          </p>
        </section>

        {/* Side Column: Session Linker & Settings */}
        <div className="space-y-6 lg:col-span-5">
          {/* Link Session */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Link This Session
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Attribute completed focus minutes to a task or subject for your analytics.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="timer-link-task"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Task (optional)
                </label>
                <select
                  id="timer-link-task"
                  value={linkedTaskId}
                  onChange={(e) => onChangeLinkedTask(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">No specific task</option>
                  {pendingTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="timer-link-subject"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Subject
                </label>
                <select
                  id="timer-link-subject"
                  value={linkedTask ? linkedTask.subjectId : linkedSubjectId}
                  disabled={Boolean(linkedTask)}
                  onChange={(e) => onChangeLinkedSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">No subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {linkedTask && (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Subject synced automatically from selected task.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Settings Panel */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Durations &amp; Alerts
              </h2>
              {showSettings && (
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400"
                >
                  Collapse
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="cfg-focus"
                  className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Focus (m)
                </label>
                <input
                  id="cfg-focus"
                  type="number"
                  min={1}
                  max={120}
                  value={settings.focusMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      focusMinutes: Math.max(1, Math.min(120, Number(e.target.value) || 25)),
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="cfg-short"
                  className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Short (m)
                </label>
                <input
                  id="cfg-short"
                  type="number"
                  min={1}
                  max={45}
                  value={settings.shortBreakMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      shortBreakMinutes: Math.max(1, Math.min(45, Number(e.target.value) || 5)),
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="cfg-long"
                  className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Long (m)
                </label>
                <input
                  id="cfg-long"
                  type="number"
                  min={1}
                  max={60}
                  value={settings.longBreakMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      longBreakMinutes: Math.max(1, Math.min(60, Number(e.target.value) || 15)),
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label htmlFor="cfg-auto-break" className="text-sm text-slate-700 dark:text-slate-300">
                  Auto-start breaks
                </label>
                <input
                  id="cfg-auto-break"
                  type="checkbox"
                  checked={settings.autoStartBreaks}
                  onChange={(e) => onUpdateSettings({ ...settings, autoStartBreaks: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  {settings.soundEnabled ? <Volume2 className="h-4 w-4 text-indigo-500" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
                  <span>Alarm sound</span>
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenSoundSettings}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    Configure tunes
                  </button>
                  <input
                    type="checkbox"
                    aria-label="Enable completion sound"
                    checked={settings.soundEnabled}
                    onChange={(e) => onUpdateSettings({ ...settings, soundEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Bell className="h-4 w-4 text-indigo-500" />
                  <span>Browser notifications</span>
                </span>
                <input
                  type="checkbox"
                  aria-label="Enable browser notifications"
                  checked={settings.notificationsEnabled}
                  onChange={(e) => handleToggleNotifications(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {settings.notificationsEnabled && notifStatus === 'denied' && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Browser notifications are blocked in site settings; audio chime will still play.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
