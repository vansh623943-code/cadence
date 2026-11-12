/**
 * Local-timezone safe date formatting and arithmetic helpers.
 */

export function toLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(dateStr: string, delta: number): string {
  const dt = parseLocalDate(dateStr);
  dt.setDate(dt.getDate() + delta);
  return toLocalDateStr(dt);
}

export function daysBetween(fromDateStr: string, toDateStr: string): number {
  const a = parseLocalDate(fromDateStr);
  const b = parseLocalDate(toDateStr);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatReadableDate(dateStr: string): string {
  const dt = parseLocalDate(dateStr);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  const dt = parseLocalDate(dateStr);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getMondayOfWeek(dateStr: string): string {
  const dt = parseLocalDate(dateStr);
  const day = dt.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return toLocalDateStr(dt);
}

export function getWeekDates(mondayStr: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayStr, i));
}

export function getLastNDays(n: number, endDateStr: string = toLocalDateStr()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(endDateStr, -(n - 1 - i)));
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatMinutesReadable(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
}

export function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function computeStreaks(sessionDates: string[]): { currentStreak: number; longestStreak: number } {
  if (sessionDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const uniqueSet = new Set(sessionDates);
  const today = toLocalDateStr();
  const yesterday = addDays(today, -1);

  // Current streak counts backward from today (or yesterday if no session yet today)
  let currentStreak = 0;
  let cursor = uniqueSet.has(today) ? today : uniqueSet.has(yesterday) ? yesterday : '';
  while (cursor && uniqueSet.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  // Longest streak across all sorted unique dates
  const sorted = Array.from(uniqueSet).sort();
  let longestStreak = 0;
  let run = 0;
  let prev = '';
  for (const d of sorted) {
    if (!prev || daysBetween(prev, d) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = d;
  }

  return { currentStreak, longestStreak };
}
