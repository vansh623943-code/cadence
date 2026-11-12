import { useCallback, useEffect, useRef, useState } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
}

export function useWakeLock() {
  const isSupported =
    typeof navigator !== 'undefined' &&
    'wakeLock' in navigator &&
    typeof (navigator as unknown as { wakeLock?: { request?: unknown } }).wakeLock?.request === 'function';

  const [enabled, setEnabled] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  const acquire = useCallback(async () => {
    if (!isSupported) return false;
    try {
      const wl = (navigator as unknown as {
        wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      }).wakeLock;
      const sentinel = await wl.request('screen');
      sentinelRef.current = sentinel;
      setIsActive(true);
      sentinel.addEventListener?.('release', () => {
        setIsActive(false);
      });
      return true;
    } catch {
      setIsActive(false);
      return false;
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    try {
      if (sentinelRef.current && !sentinelRef.current.released) {
        await sentinelRef.current.release();
      }
    } catch {
      // Ignore release errors
    } finally {
      sentinelRef.current = null;
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      release();
      return;
    }
    acquire();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      release();
    };
  }, [enabled, acquire, release]);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return {
    isSupported,
    enabled,
    isActive,
    toggle,
    setEnabled,
  };
}
