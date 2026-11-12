import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Music,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { AlarmDuration, AppData, BlockType, CustomTuneMeta, InfoPageId, TimerSettings } from '../types/study';
import { BLOCK_TYPE_META } from '../utils/dayPlannerUtils';
import { toLocalDateStr } from '../utils/dateUtils';
import { INFO_PAGES } from '../utils/infoRoutes';
import {
  deleteCustomTune,
  listCustomTunes,
  saveCustomTune,
} from '../utils/customTuneDb';
import {
  AlarmPlaybackState,
  BUILT_IN_TUNES,
  playAlarm,
  stopAlarm,
  subscribeAlarmState,
} from '../utils/soundAndNotify';
import { ConfirmDialog } from './ConfirmDialog';
import { PWAInstallControl } from './PWAInstallControl';

export type SettingsTab = 'sounds' | 'data';

interface SettingsModalProps {
  open: boolean;
  initialTab?: SettingsTab;
  data: AppData;
  onClose: () => void;
  onUpdateSettings: (next: TimerSettings) => void;
  onImport: (imported: AppData) => void;
  onResetAll: () => void;
  onRestoreSample: () => void;
  onNavigateInfoPage: (page: InfoPageId) => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  initialTab = 'sounds',
  data,
  onClose,
  onUpdateSettings,
  onImport,
  onResetAll,
  onRestoreSample,
  onNavigateInfoPage,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [customTunes, setCustomTunes] = useState<CustomTuneMeta[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [alarmState, setAlarmState] = useState<AlarmPlaybackState>({
    isPlaying: false,
    tuneId: null,
    label: '',
    isPreview: false,
  });

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setUploadError('');
      listCustomTunes().then(setCustomTunes);
    }
  }, [open, initialTab]);

  useEffect(() => {
    return subscribeAlarmState(setAlarmState);
  }, []);

  if (!open) return null;

  const settings = data.settings;
  const focusTuneId = settings.focusEndTuneId || 'soft-chime';
  const breakTuneId = settings.breakEndTuneId || 'temple-bell';
  const alarmVolume = settings.alarmVolume ?? 0.75;
  const alarmDuration: AlarmDuration = settings.alarmDuration ?? '3s';

  const handlePreview = (tuneId: string, name: string) => {
    if (alarmState.isPlaying && alarmState.tuneId === tuneId) {
      stopAlarm();
      return;
    }
    playAlarm({
      tuneId,
      volume: alarmVolume,
      duration: alarmDuration === 'untilDismissed' ? 'untilDismissed' : alarmDuration,
      label: `Preview: ${name}`,
      isPreview: true,
    }).catch(() => {});
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError('');
    try {
      const meta = await saveCustomTune(file);
      const updated = await listCustomTunes();
      setCustomTunes(updated);
      onNotify(`Uploaded "${meta.name}".`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save audio file.';
      setUploadError(msg);
      onNotify(msg, 'error');
    }
  };

  const handleDeleteCustomTune = async (tune: CustomTuneMeta) => {
    const fullId = `custom:${tune.id}`;
    if (alarmState.isPlaying && alarmState.tuneId === fullId) {
      stopAlarm();
    }
    await deleteCustomTune(tune.id);
    const updated = await listCustomTunes();
    setCustomTunes(updated);

    const nextSettings = { ...settings };
    let changed = false;
    if (nextSettings.focusEndTuneId === fullId) {
      nextSettings.focusEndTuneId = 'soft-chime';
      changed = true;
    }
    if (nextSettings.breakEndTuneId === fullId) {
      nextSettings.breakEndTuneId = 'temple-bell';
      changed = true;
    }
    if (changed) {
      onUpdateSettings(nextSettings);
    }
    onNotify(`Deleted "${tune.name}".`);
  };

  const handleExport = () => {
    const payload = JSON.stringify(data, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cadence-study-backup-${toLocalDateStr()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify('Backup JSON downloaded.');
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<AppData>;
        if (
          !parsed ||
          !Array.isArray(parsed.tasks) ||
          !Array.isArray(parsed.subjects) ||
          !Array.isArray(parsed.exams) ||
          !Array.isArray(parsed.sessions)
        ) {
          onNotify('Invalid backup file format.', 'error');
          return;
        }
        onImport({
          subjects: parsed.subjects,
          tasks: parsed.tasks,
          exams: parsed.exams,
          sessions: parsed.sessions,
          timeBlocks: Array.isArray(parsed.timeBlocks) ? parsed.timeBlocks : [],
          dayTemplates: Array.isArray(parsed.dayTemplates) ? parsed.dayTemplates : [],
          settings: { ...settings, ...(parsed.settings ?? {}) },
          theme: parsed.theme === 'dark' || parsed.theme === 'light' ? parsed.theme : data.theme,
        });
        onNotify('Study data imported successfully.');
        onClose();
      } catch {
        onNotify('Could not read JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const allTuneSelectOptions = [
    ...BUILT_IN_TUNES.map((t) => ({ id: t.id, label: t.name })),
    ...customTunes.map((c) => ({ id: `custom:${c.id}`, label: `${c.name} (Custom)` })),
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <h2 id="settings-modal-title" className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                Settings
              </h2>
              <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('sounds')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'sounds'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  Sounds
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('data')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'data'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  Data &amp; App
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'sounds' ? (
              <div className="space-y-6">
                {/* Active Alarm Banner */}
                {alarmState.isPlaying && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/60">
                    <div className="flex items-center gap-2.5 text-sm font-medium text-indigo-900 dark:text-indigo-100">
                      <Volume2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{alarmState.label || 'Alarm playing'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={stopAlarm}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500"
                    >
                      <Square className="h-3 w-3 fill-current" />
                      <span>Stop alarm</span>
                    </button>
                  </div>
                )}

                {/* Master Toggle + Volume + Duration */}
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Enable Alarm Sound</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Play a chime when a focus or break interval finishes
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      aria-label="Enable alarm sound"
                      checked={settings.soundEnabled}
                      onChange={(e) => onUpdateSettings({ ...settings, soundEnabled: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2 dark:border-slate-700">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                        <label htmlFor="alarm-volume-slider">Volume</label>
                        <span className="font-mono tabular-nums">{Math.round(alarmVolume * 100)}%</span>
                      </div>
                      <input
                        id="alarm-volume-slider"
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={alarmVolume}
                        onChange={(e) =>
                          onUpdateSettings({ ...settings, alarmVolume: Number(e.target.value) })
                        }
                        className="w-full accent-indigo-600 dark:accent-indigo-400"
                      />
                    </div>

                    <div>
                      <span className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        Play Duration
                      </span>
                      <div className="grid grid-cols-3 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
                        {(
                          [
                            { id: '3s', label: '3s' },
                            { id: '10s', label: '10s' },
                            { id: 'untilDismissed', label: 'Until dismissed' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onUpdateSettings({ ...settings, alarmDuration: opt.id })}
                            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                              alarmDuration === opt.id
                                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Separate Focus Ended & Break Ended Selectors */}
                  <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2 dark:border-slate-700">
                    <div>
                      <label
                        htmlFor="focus-end-tune"
                        className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Focus Ended Tune
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          id="focus-end-tune"
                          value={focusTuneId}
                          onChange={(e) =>
                            onUpdateSettings({ ...settings, focusEndTuneId: e.target.value })
                          }
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {allTuneSelectOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            handlePreview(
                              focusTuneId,
                              allTuneSelectOptions.find((o) => o.id === focusTuneId)?.label || 'Focus tune'
                            )
                          }
                          aria-label="Preview Focus ended tune"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          {alarmState.isPlaying && alarmState.tuneId === focusTuneId ? (
                            <Square className="h-3.5 w-3.5 fill-current" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="break-end-tune"
                        className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Break Ended Tune
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          id="break-end-tune"
                          value={breakTuneId}
                          onChange={(e) =>
                            onUpdateSettings({ ...settings, breakEndTuneId: e.target.value })
                          }
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {allTuneSelectOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            handlePreview(
                              breakTuneId,
                              allTuneSelectOptions.find((o) => o.id === breakTuneId)?.label || 'Break tune'
                            )
                          }
                          aria-label="Preview Break ended tune"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          {alarmState.isPlaying && alarmState.tuneId === breakTuneId ? (
                            <Square className="h-3.5 w-3.5 fill-current" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Optional Per-Block Type Tunes (Day Planner) */}
                  <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                    <div className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      Day Planner Tunes by Block Type (optional)
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {(Object.keys(BLOCK_TYPE_META) as BlockType[]).map((bt) => (
                        <div key={bt}>
                          <label className="mb-1 block text-[11px] text-slate-500 dark:text-slate-400">
                            {BLOCK_TYPE_META[bt].label}
                          </label>
                          <select
                            value={settings.blockTypeTunes?.[bt] || ''}
                            onChange={(e) =>
                              onUpdateSettings({
                                ...settings,
                                blockTypeTunes: {
                                  ...(settings.blockTypeTunes ?? {}),
                                  [bt]: e.target.value || undefined,
                                },
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          >
                            <option value="">Default</option>
                            {allTuneSelectOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Built-in Synthesized Tunes */}
                <div>
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Built-in Tunes
                  </h3>
                  <div className="mt-2.5 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                    {BUILT_IN_TUNES.map((tune) => {
                      const isPlayingThis = alarmState.isPlaying && alarmState.tuneId === tune.id;
                      const isFocus = focusTuneId === tune.id;
                      const isBreak = breakTuneId === tune.id;

                      return (
                        <div key={tune.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{tune.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{tune.description}</div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePreview(tune.id, tune.name)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                isPlayingThis
                                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {isPlayingThis ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3" />}
                              <span>{isPlayingThis ? 'Stop' : 'Preview'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onUpdateSettings({ ...settings, focusEndTuneId: tune.id })}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                isFocus
                                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                              }`}
                            >
                              Focus
                            </button>

                            <button
                              type="button"
                              onClick={() => onUpdateSettings({ ...settings, breakEndTuneId: tune.id })}
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                isBreak
                                  ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                              }`}
                            >
                              Break
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Tune Upload (IndexedDB) */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Custom Tunes from Device
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        MP3, WAV, M4A, or OGG · Max 5 MB · Saved locally in IndexedDB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 whitespace-nowrap dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Audio</span>
                    </button>
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept=".mp3,.wav,.m4a,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/ogg"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                  </div>

                  {uploadError && (
                    <p className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                      {uploadError}
                    </p>
                  )}

                  {customTunes.length === 0 ? (
                    <div className="mt-2.5 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      No custom audio uploaded yet. Upload your own chime or ringtone above.
                    </div>
                  ) : (
                    <div className="mt-2.5 divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                      {customTunes.map((tune) => {
                        const fullId = `custom:${tune.id}`;
                        const isPlayingThis = alarmState.isPlaying && alarmState.tuneId === fullId;
                        const isFocus = focusTuneId === fullId;
                        const isBreak = breakTuneId === fullId;

                        return (
                          <div key={tune.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Music className="h-4 w-4 shrink-0 text-indigo-500" />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {tune.name}
                                </div>
                                <div className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                                  {formatFileSize(tune.sizeBytes)}
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handlePreview(fullId, tune.name)}
                                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                  isPlayingThis
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {isPlayingThis ? (
                                  <Square className="h-3 w-3 fill-current" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                                <span>{isPlayingThis ? 'Stop' : 'Preview'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onUpdateSettings({ ...settings, focusEndTuneId: fullId })}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                  isFocus
                                    ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                                }`}
                              >
                                Focus
                              </button>

                              <button
                                type="button"
                                onClick={() => onUpdateSettings({ ...settings, breakEndTuneId: fullId })}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                  isBreak
                                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                                }`}
                              >
                                Break
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteCustomTune(tune)}
                                aria-label={`Delete "${tune.name}"`}
                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
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
            ) : (
              <div className="space-y-4">
                <PWAInstallControl variant="card" />

                <button
                  type="button"
                  onClick={handleExport}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Export JSON Backup</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {data.tasks.length} tasks · {data.timeBlocks.length} blocks · {data.dayTemplates.length} templates · {data.sessions.length} sessions
                    </div>
                  </div>
                  <Download className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                </button>

                <button
                  type="button"
                  onClick={() => jsonInputRef.current?.click()}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Import JSON Backup</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Restore tasks, subjects, exams, and focus logs
                    </div>
                  </div>
                  <Upload className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                </button>
                <input
                  ref={jsonInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleJsonImport}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => {
                    onRestoreSample();
                    onNotify('Sample study workspace restored.');
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      Load Sample Study Data
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Populate sample subjects, tasks, exams, and history
                    </div>
                  </div>
                  <RotateCcw className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                </button>

                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Guides &amp; Legal
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {INFO_PAGES.map((page) => (
                      <a
                        key={page.id}
                        href={page.path}
                        onClick={(e) => {
                          e.preventDefault();
                          onClose();
                          onNavigateInfoPage(page.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
                      >
                        {page.label}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(true)}
                    className="flex w-full items-center justify-between rounded-lg border border-rose-200 bg-rose-50/70 px-4 py-3 text-left transition-colors hover:bg-rose-100/70 dark:border-rose-900/60 dark:bg-rose-950/30 dark:hover:bg-rose-950/50"
                  >
                    <div>
                      <div className="text-sm font-medium text-rose-700 dark:text-rose-300">Reset All Data</div>
                      <div className="text-xs text-rose-600/80 dark:text-rose-400/80">
                        Clear all tasks, exams, subjects, and session history
                      </div>
                    </div>
                    <Trash2 className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile-only quick links footer inside Settings so all pages are 1-tap reachable on mobile */}
          <div className="border-t border-slate-200 px-6 py-2.5 lg:hidden dark:border-slate-800">
            <nav aria-label="Mobile settings links" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {INFO_PAGES.map((page) => (
                <a
                  key={page.id}
                  href={page.path}
                  onClick={(e) => {
                    e.preventDefault();
                    onClose();
                    onNavigateInfoPage(page.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-xs font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  {page.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>
              Shortcuts:{' '}
              <kbd className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[11px] dark:border-slate-700">
                Space
              </kbd>{' '}
              timer ·{' '}
              <kbd className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[11px] dark:border-slate-700">
                N
              </kbd>{' '}
              task
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset all study data?"
        description="This will permanently delete all tasks, subjects, exams, and focus session history stored in this browser. Consider exporting a JSON backup first."
        confirmLabel="Reset Everything"
        cancelLabel="Keep Data"
        destructive
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          setConfirmResetOpen(false);
          onResetAll();
          onClose();
          onNotify('All workspace data has been cleared.');
        }}
      />
    </>
  );
};
