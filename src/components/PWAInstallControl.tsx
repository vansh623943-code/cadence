import React from 'react';
import { Download, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallControlProps {
  variant?: 'sidebar' | 'compact' | 'card';
}

export const PWAInstallControl: React.FC<PWAInstallControlProps> = ({ variant = 'sidebar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // Hide completely once installed / running in standalone mode
  if (isInstalled) return null;

  // Chromium / Edge / Android native install prompt
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          type="button"
          onClick={() => install()}
          aria-label="Install App"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 whitespace-nowrap dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Install</span>
        </button>
      );
    }

    if (variant === 'card') {
      return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50/70 px-4 py-3 dark:border-indigo-900/60 dark:bg-indigo-950/35">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Install Kilostudy Planner App</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Use offline as a standalone desktop or mobile app
            </div>
          </div>
          <button
            type="button"
            onClick={() => install()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700 whitespace-nowrap dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install App</span>
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => install()}
        className="flex w-full items-center gap-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-950"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari instruction card
  if (isIOS) {
    if (variant === 'compact') {
      return null; // Keep mobile top bar uncrowded; show card inside Settings/Sidebar
    }
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
        <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
          <Share className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Install on iOS</span>
        </div>
        <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-400">
          Tap Share, then Add to Home Screen
        </p>
      </div>
    );
  }

  return null;
};
