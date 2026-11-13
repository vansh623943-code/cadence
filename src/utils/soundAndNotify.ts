import { AlarmDuration, BuiltInTuneId } from '../types/study';
import { getCustomTuneBlob } from './customTuneDb';

export interface BuiltInTuneOption {
  id: BuiltInTuneId;
  name: string;
  description: string;
  phraseDurationMs: number;
}

export const BUILT_IN_TUNES: BuiltInTuneOption[] = [
  {
    id: 'soft-chime',
    name: 'Soft Chime',
    description: 'Warm ascending C major seventh chime',
    phraseDurationMs: 2100,
  },
  {
    id: 'temple-bell',
    name: 'Temple Bell',
    description: 'Deep resonant bell with gentle overtones',
    phraseDurationMs: 2600,
  },
  {
    id: 'piano-notes',
    name: 'Piano Notes',
    description: 'Melodic F major keyboard arpeggio',
    phraseDurationMs: 2200,
  },
  {
    id: 'gentle-wake',
    name: 'Gentle Wake',
    description: 'Slow, smooth rising fifths swell',
    phraseDurationMs: 2500,
  },
  {
    id: 'marimba',
    name: 'Marimba',
    description: 'Warm percussive mallet pattern',
    phraseDurationMs: 1800,
  },
  {
    id: 'digital-beep',
    name: 'Digital Beep',
    description: 'Clean, soft-edged dual pulse',
    phraseDurationMs: 1500,
  },
];

export interface AlarmPlaybackState {
  isPlaying: boolean;
  tuneId: string | null;
  label: string;
  isPreview: boolean;
}

type AlarmListener = (state: AlarmPlaybackState) => void;

let sharedAudioCtx: AudioContext | null = null;
let currentState: AlarmPlaybackState = {
  isPlaying: false,
  tuneId: null,
  label: '',
  isPreview: false,
};
const listeners = new Set<AlarmListener>();

let activeLoopTimer: number | null = null;
let activeStopTimer: number | null = null;
let activeAudioEl: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let activeNodes: Array<{ stop: () => void }> = [];

function emitState(next: AlarmPlaybackState) {
  currentState = next;
  listeners.forEach((fn) => fn(currentState));
}

export function subscribeAlarmState(listener: AlarmListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function unlockAudioContext(): void {
  try {
    getAudioContext();
  } catch {
    // Ignore autoplay restrictions before user interaction
  }
}

function scheduleTone(
  ctx: AudioContext,
  masterGain: GainNode,
  options: {
    freq: number;
    startOffset: number;
    duration: number;
    attack?: number;
    type?: OscillatorType;
    peakGain?: number;
    filterHz?: number;
  }
) {
  const {
    freq,
    startOffset,
    duration,
    attack = 0.025,
    type = 'sine',
    peakGain = 0.25,
    filterHz,
  } = options;

  const t0 = ctx.currentTime + startOffset;
  const tAttack = t0 + Math.min(attack, duration * 0.35);
  const tEnd = t0 + duration;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peakGain, tAttack);
  gain.gain.exponentialRampToValueAtTime(0.0001, tEnd);

  if (filterHz) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterHz, t0);
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }

  gain.connect(masterGain);
  osc.start(t0);
  osc.stop(tEnd + 0.05);

  const handle = {
    stop: () => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
        osc.stop(ctx.currentTime + 0.06);
      } catch {
        // Already stopped
      }
    },
  };
  activeNodes.push(handle);
}

function playBuiltInPhrase(tuneId: BuiltInTuneId, volume: number): number {
  const ctx = getAudioContext();
  if (!ctx) return 2000;

  const master = ctx.createGain();
  master.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);
  master.connect(ctx.destination);

  switch (tuneId) {
    case 'soft-chime': {
      const notes = [523.25, 659.25, 783.99, 987.77]; // C5 E5 G5 B5
      notes.forEach((freq, i) => {
        scheduleTone(ctx, master, {
          freq,
          startOffset: i * 0.16,
          duration: 1.35,
          attack: 0.03,
          type: 'sine',
          peakGain: 0.22,
        });
      });
      return 2100;
    }

    case 'temple-bell': {
      // Fundamental + warm harmonic partials
      scheduleTone(ctx, master, {
        freq: 329.63, // E4
        startOffset: 0,
        duration: 2.4,
        attack: 0.02,
        type: 'sine',
        peakGain: 0.3,
      });
      scheduleTone(ctx, master, {
        freq: 659.25, // E5
        startOffset: 0,
        duration: 1.8,
        attack: 0.02,
        type: 'sine',
        peakGain: 0.12,
      });
      scheduleTone(ctx, master, {
        freq: 987.77, // B5
        startOffset: 0.01,
        duration: 1.2,
        attack: 0.015,
        type: 'sine',
        peakGain: 0.06,
      });
      return 2600;
    }

    case 'piano-notes': {
      const notes = [349.23, 440.0, 523.25, 659.25]; // F4 A4 C5 E5
      notes.forEach((freq, i) => {
        scheduleTone(ctx, master, {
          freq,
          startOffset: i * 0.22,
          duration: 1.25,
          attack: 0.018,
          type: 'triangle',
          peakGain: 0.24,
          filterHz: 1800,
        });
        scheduleTone(ctx, master, {
          freq: freq * 2,
          startOffset: i * 0.22,
          duration: 0.65,
          attack: 0.015,
          type: 'sine',
          peakGain: 0.06,
        });
      });
      return 2200;
    }

    case 'gentle-wake': {
      const notes = [293.66, 440.0, 659.25, 739.99]; // D4 A4 E5 F#5
      notes.forEach((freq, i) => {
        scheduleTone(ctx, master, {
          freq,
          startOffset: i * 0.28,
          duration: 1.5,
          attack: 0.12,
          type: 'sine',
          peakGain: 0.2,
        });
      });
      return 2500;
    }

    case 'marimba': {
      const notes = [392.0, 493.88, 587.33, 783.99]; // G4 B4 D5 G5
      notes.forEach((freq, i) => {
        scheduleTone(ctx, master, {
          freq,
          startOffset: i * 0.14,
          duration: 0.55,
          attack: 0.008,
          type: 'triangle',
          peakGain: 0.28,
          filterHz: 1400,
        });
        scheduleTone(ctx, master, {
          freq: freq * 4,
          startOffset: i * 0.14,
          duration: 0.09,
          attack: 0.005,
          type: 'sine',
          peakGain: 0.08,
        });
      });
      return 1800;
    }

    case 'digital-beep': {
      const pulses = [
        { freq: 880, offset: 0 },
        { freq: 1046.5, offset: 0.18 },
        { freq: 880, offset: 0.55 },
        { freq: 1046.5, offset: 0.73 },
      ];
      pulses.forEach((p) => {
        scheduleTone(ctx, master, {
          freq: p.freq,
          startOffset: p.offset,
          duration: 0.14,
          attack: 0.015,
          type: 'sine',
          peakGain: 0.2,
        });
      });
      return 1500;
    }
  }
}

export function stopAlarm(): void {
  if (activeLoopTimer !== null) {
    window.clearInterval(activeLoopTimer);
    activeLoopTimer = null;
  }
  if (activeStopTimer !== null) {
    window.clearTimeout(activeStopTimer);
    activeStopTimer = null;
  }
  activeNodes.forEach((n) => n.stop());
  activeNodes = [];

  if (activeAudioEl) {
    activeAudioEl.pause();
    activeAudioEl.currentTime = 0;
    activeAudioEl = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }

  emitState({
    isPlaying: false,
    tuneId: null,
    label: '',
    isPreview: false,
  });
}

export async function playAlarm(options: {
  tuneId: string;
  volume: number;
  duration: AlarmDuration;
  label: string;
  isPreview?: boolean;
}): Promise<void> {
  stopAlarm();

  const { tuneId, volume, duration, label, isPreview = false } = options;
  const clampedVol = Math.max(0, Math.min(1, volume));
  const durationMs = duration === '3s' ? 3000 : duration === '10s' ? 10000 : null;

  emitState({
    isPlaying: true,
    tuneId,
    label,
    isPreview,
  });

  if (tuneId.startsWith('custom:')) {
    const customId = tuneId.slice('custom:'.length);
    const blob = await getCustomTuneBlob(customId);
    if (blob) {
      const url = URL.createObjectURL(blob);
      activeObjectUrl = url;
      const audio = new Audio(url);
      audio.volume = clampedVol;
      audio.loop = duration !== '3s';
      activeAudioEl = audio;

      audio.onended = () => {
        if (!audio.loop) {
          stopAlarm();
        }
      };

      try {
        await audio.play();
      } catch {
        // Fallback to built-in chime if browser blocks playback
        stopAlarm();
        playBuiltInPhrase('soft-chime', clampedVol);
        return;
      }

      if (durationMs !== null) {
        activeStopTimer = window.setTimeout(() => {
          stopAlarm();
        }, durationMs);
      }
      return;
    }
    // Custom tune missing in IndexedDB -> fallback gracefully
  }

  const validBuiltIn = BUILT_IN_TUNES.find((t) => t.id === tuneId)?.id ?? 'soft-chime';
  const phraseMs = playBuiltInPhrase(validBuiltIn, clampedVol);

  if (isPreview && duration === '3s') {
    activeStopTimer = window.setTimeout(() => {
      stopAlarm();
    }, Math.max(phraseMs, 2600));
    return;
  }

  if (durationMs === 3000) {
    // Play a second gentle chime if phrase is short, then stop at 3s
    if (phraseMs <= 1600) {
      activeLoopTimer = window.setTimeout(() => {
        playBuiltInPhrase(validBuiltIn, clampedVol);
      }, 1500) as unknown as number;
    }
    activeStopTimer = window.setTimeout(() => {
      stopAlarm();
    }, 3000);
    return;
  }

  // Loop phrase smoothly for 10s or untilDismissed
  const intervalMs = Math.max(1600, phraseMs + 350);
  activeLoopTimer = window.setInterval(() => {
    playBuiltInPhrase(validBuiltIn, clampedVol);
  }, intervalMs);

  if (durationMs !== null) {
    activeStopTimer = window.setTimeout(() => {
      stopAlarm();
    }, durationMs);
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function sendStudyNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag: 'Kilostudy Planner-pomodoro',
    });
  } catch {
    // Ignore restricted Notification constructor environments
  }
}

export async function sendBlockNotification(title: string, body: string, tag: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((res) => window.setTimeout(() => res(null), 400)),
      ]);
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          tag,
          icon: '/pwa-192x192.png',
          requireInteraction: true,
        });
        return;
      }
    }
    new Notification(title, { body, tag });
  } catch {
    // Ignore restricted environments
  }
}
