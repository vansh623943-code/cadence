import { BlockType, DayTemplate, Subject, TimeBlock } from '../types/study';
import { addDays, parseLocalDate, toLocalDateStr } from './dateUtils';

export const BLOCK_TYPE_META: Record<
  BlockType,
  {
    label: string;
    color: string;
    bgLight: string;
    bgDark: string;
    borderClass: string;
    textClass: string;
  }
> = {
  study: {
    label: 'Study',
    color: '#4F46E5',
    bgLight: 'bg-indigo-50/95',
    bgDark: 'dark:bg-indigo-950/60',
    borderClass: 'border-indigo-300 dark:border-indigo-700',
    textClass: 'text-indigo-900 dark:text-indigo-100',
  },
  break: {
    label: 'Break',
    color: '#059669',
    bgLight: 'bg-emerald-50/95',
    bgDark: 'dark:bg-emerald-950/55',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
    textClass: 'text-emerald-900 dark:text-emerald-100',
  },
  meal: {
    label: 'Meal',
    color: '#D97706',
    bgLight: 'bg-amber-50/95',
    bgDark: 'dark:bg-amber-950/55',
    borderClass: 'border-amber-300 dark:border-amber-700',
    textClass: 'text-amber-900 dark:text-amber-100',
  },
  exercise: {
    label: 'Exercise',
    color: '#0284C7',
    bgLight: 'bg-sky-50/95',
    bgDark: 'dark:bg-sky-950/55',
    borderClass: 'border-sky-300 dark:border-sky-700',
    textClass: 'text-sky-900 dark:text-sky-100',
  },
  sleep: {
    label: 'Sleep',
    color: '#7C3AED',
    bgLight: 'bg-violet-50/95',
    bgDark: 'dark:bg-violet-950/55',
    borderClass: 'border-violet-300 dark:border-violet-700',
    textClass: 'text-violet-900 dark:text-violet-100',
  },
  other: {
    label: 'Other',
    color: '#475569',
    bgLight: 'bg-slate-100/95',
    bgDark: 'dark:bg-slate-800/80',
    borderClass: 'border-slate-300 dark:border-slate-700',
    textClass: 'text-slate-900 dark:text-slate-100',
  },
};

export function timeToMinutes(hhmm: string): number {
  if (hhmm === '24:00') return 1440;
  const [hStr, mStr] = hhmm.split(':');
  const h = Math.max(0, Math.min(23, Number(hStr) || 0));
  const m = Math.max(0, Math.min(59, Number(mStr) || 0));
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(1440, Math.round(mins)));
  if (clamped === 1440) return '24:00';
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function doesBlockCrossMidnight(startTime: string, endTime: string): boolean {
  if (endTime === '24:00') return false;
  return timeToMinutes(endTime) <= timeToMinutes(startTime);
}

export function getBlockDurationMinutes(startTime: string, endTime: string): number {
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (endTime === '24:00') return Math.max(15, 1440 - s);
  if (e <= s) return 1440 - s + e;
  return e - s;
}

export function getBlockTimestamps(block: Pick<TimeBlock, 'date' | 'startTime' | 'endTime'>): {
  startMs: number;
  endMs: number;
} {
  const startDate = parseLocalDate(block.date);
  const startMin = timeToMinutes(block.startTime);
  startDate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

  const crosses = doesBlockCrossMidnight(block.startTime, block.endTime);
  const endDateStr = crosses ? addDays(block.date, 1) : block.date;
  const endDate = parseLocalDate(endDateStr);
  const endMin = timeToMinutes(block.endTime);
  if (endMin === 1440) {
    endDate.setHours(24, 0, 0, 0);
  } else {
    endDate.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
  }

  return { startMs: startDate.getTime(), endMs: endDate.getTime() };
}

export interface TimelineBlockSegment {
  block: TimeBlock;
  segmentStartMin: number;
  segmentEndMin: number;
  isCarryOver: boolean; // carried over from previous day's midnight-crossing block
  crossesMidnight: boolean;
  column: number;
  totalColumns: number;
  hasOverlap: boolean;
}

export function getTimelineSegmentsForDate(
  allBlocks: TimeBlock[],
  targetDate: string
): TimelineBlockSegment[] {
  const prevDate = addDays(targetDate, -1);
  const rawSegments: Array<Omit<TimelineBlockSegment, 'column' | 'totalColumns' | 'hasOverlap'>> = [];

  for (const block of allBlocks) {
    const crosses = doesBlockCrossMidnight(block.startTime, block.endTime);
    const startMin = timeToMinutes(block.startTime);
    const endMin = timeToMinutes(block.endTime);

    if (block.date === targetDate) {
      rawSegments.push({
        block,
        segmentStartMin: startMin,
        segmentEndMin: crosses ? 1440 : Math.max(startMin + 5, endMin),
        isCarryOver: false,
        crossesMidnight: crosses,
      });
    } else if (block.date === prevDate && crosses && endMin > 0) {
      rawSegments.push({
        block,
        segmentStartMin: 0,
        segmentEndMin: endMin,
        isCarryOver: true,
        crossesMidnight: true,
      });
    }
  }

  rawSegments.sort((a, b) => a.segmentStartMin - b.segmentStartMin || a.segmentEndMin - b.segmentEndMin);

  // Assign columns and detect overlaps via sweep-line clusters
  const result: TimelineBlockSegment[] = rawSegments.map((s) => ({
    ...s,
    column: 0,
    totalColumns: 1,
    hasOverlap: false,
  }));

  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      if (result[j].segmentStartMin < result[i].segmentEndMin) {
        result[i].hasOverlap = true;
        result[j].hasOverlap = true;
      }
    }
  }

  // Group into connected overlap clusters to assign column tracks cleanly
  let clusterStart = 0;
  while (clusterStart < result.length) {
    let clusterEnd = clusterStart;
    let maxEnd = result[clusterStart].segmentEndMin;
    while (clusterEnd + 1 < result.length && result[clusterEnd + 1].segmentStartMin < maxEnd) {
      clusterEnd++;
      maxEnd = Math.max(maxEnd, result[clusterEnd].segmentEndMin);
    }

    const colEnds: number[] = [];
    for (let k = clusterStart; k <= clusterEnd; k++) {
      let placedCol = -1;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= result[k].segmentStartMin) {
          placedCol = c;
          colEnds[c] = result[k].segmentEndMin;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = colEnds.length;
        colEnds.push(result[k].segmentEndMin);
      }
      result[k].column = placedCol;
    }

    const totalCols = Math.max(1, colEnds.length);
    for (let k = clusterStart; k <= clusterEnd; k++) {
      result[k].totalColumns = totalCols;
    }

    clusterStart = clusterEnd + 1;
  }

  return result;
}

export function checkBlockOverlap(
  candidate: Pick<TimeBlock, 'id' | 'date' | 'startTime' | 'endTime'>,
  existingBlocks: TimeBlock[]
): TimeBlock[] {
  const cand = getBlockTimestamps(candidate);
  return existingBlocks.filter((b) => {
    if (b.id === candidate.id) return false;
    const other = getBlockTimestamps(b);
    return cand.startMs < other.endMs && cand.endMs > other.startMs;
  });
}

export function computeDaySummary(segments: TimelineBlockSegment[]): {
  studyMinutes: number;
  breakMinutes: number;
  freeMinutes: number;
  overlapCount: number;
} {
  let studyMinutes = 0;
  let breakMinutes = 0;
  let overlapCount = 0;

  const intervals: Array<[number, number]> = [];
  for (const seg of segments) {
    const dur = Math.max(0, seg.segmentEndMin - seg.segmentStartMin);
    if (seg.block.type === 'study') studyMinutes += dur;
    if (seg.block.type === 'break') breakMinutes += dur;
    if (seg.hasOverlap) overlapCount += 1;
    intervals.push([seg.segmentStartMin, seg.segmentEndMin]);
  }

  // Merge occupied intervals to calculate accurate free time
  intervals.sort((a, b) => a[0] - b[0]);
  let occupied = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const [s, e] of intervals) {
    if (s > curEnd) {
      if (curEnd > curStart) occupied += curEnd - curStart;
      curStart = s;
      curEnd = e;
    } else {
      curEnd = Math.max(curEnd, e);
    }
  }
  if (curEnd > curStart) occupied += curEnd - curStart;

  return {
    studyMinutes,
    breakMinutes,
    freeMinutes: Math.max(0, 1440 - occupied),
    overlapCount,
  };
}

export interface WizardMealConfig {
  enabled: boolean;
  label: string;
  time: string; // HH:mm
  durationMinutes: number;
}

export interface Next24HoursConfig {
  wakeTime: string;
  sleepTime: string;
  totalStudyHours: number;
  sessionLengthMinutes: number;
  breakLengthMinutes: number;
  meals: WizardMealConfig[];
  subjectWeights: Record<string, number>; // subjectId -> weight (0 = excluded)
  subjects: Subject[];
  alarmAtStart: boolean;
  alarm5MinBefore: boolean;
}

export function generateNext24HoursPlan(
  config: Next24HoursConfig,
  now: Date = new Date()
): TimeBlock[] {
  // Round current local time up to next 5-minute boundary
  const roundedNow = new Date(now.getTime());
  roundedNow.setSeconds(0, 0);
  const rem = roundedNow.getMinutes() % 5;
  if (rem !== 0) {
    roundedNow.setMinutes(roundedNow.getMinutes() + (5 - rem));
  }

  const windowStartMs = roundedNow.getTime();
  const windowEndMs = windowStartMs + 24 * 60 * 60 * 1000;

  const todayStr = toLocalDateStr(roundedNow);
  const candidateDates = [addDays(todayStr, -1), todayStr, addDays(todayStr, 1), addDays(todayStr, 2)];

  const fixedBlocks: Array<{
    startMs: number;
    endMs: number;
    title: string;
    type: BlockType;
  }> = [];

  // 1. Place Sleep windows that intersect [windowStartMs, windowEndMs]
  const sleepMin = timeToMinutes(config.sleepTime);
  const wakeMin = timeToMinutes(config.wakeTime);
  for (const dStr of candidateDates) {
    const startDt = parseLocalDate(dStr);
    startDt.setHours(Math.floor(sleepMin / 60), sleepMin % 60, 0, 0);
    const crosses = wakeMin <= sleepMin;
    const endDt = parseLocalDate(crosses ? addDays(dStr, 1) : dStr);
    endDt.setHours(Math.floor(wakeMin / 60), wakeMin % 60, 0, 0);

    const sMs = Math.max(windowStartMs, startDt.getTime());
    const eMs = Math.min(windowEndMs, endDt.getTime());
    if (eMs - sMs >= 15 * 60 * 1000) {
      fixedBlocks.push({ startMs: sMs, endMs: eMs, title: 'Sleep', type: 'sleep' });
    }
  }

  // 2. Place enabled Meal blocks that fall outside sleep and inside the 24h window
  for (const meal of config.meals) {
    if (!meal.enabled) continue;
    const mMin = timeToMinutes(meal.time);
    for (const dStr of candidateDates) {
      const mStart = parseLocalDate(dStr);
      mStart.setHours(Math.floor(mMin / 60), mMin % 60, 0, 0);
      const mEndMs = mStart.getTime() + meal.durationMinutes * 60 * 1000;
      const sMs = Math.max(windowStartMs, mStart.getTime());
      const eMs = Math.min(windowEndMs, mEndMs);
      if (eMs - sMs >= 10 * 60 * 1000) {
        const overlapsSleep = fixedBlocks.some(
          (fb) => fb.type === 'sleep' && sMs < fb.endMs && eMs > fb.startMs
        );
        if (!overlapsSleep) {
          fixedBlocks.push({ startMs: sMs, endMs: eMs, title: meal.label, type: 'meal' });
        }
      }
    }
  }

  fixedBlocks.sort((a, b) => a.startMs - b.startMs);

  // Merge fixed intervals to find free awake gaps
  const mergedFixed: typeof fixedBlocks = [];
  for (const fb of fixedBlocks) {
    const last = mergedFixed[mergedFixed.length - 1];
    if (last && fb.startMs < last.endMs) {
      // Keep original blocks separately for output, just track occupied span
      last.endMs = Math.max(last.endMs, fb.endMs);
    } else {
      mergedFixed.push({ ...fb });
    }
  }

  const freeGaps: Array<{ startMs: number; endMs: number }> = [];
  let cursor = windowStartMs;
  for (const occ of mergedFixed) {
    if (occ.startMs > cursor) {
      freeGaps.push({ startMs: cursor, endMs: occ.startMs });
    }
    cursor = Math.max(cursor, occ.endMs);
  }
  if (cursor < windowEndMs) {
    freeGaps.push({ startMs: cursor, endMs: windowEndMs });
  }

  // Build weighted subject rotation list
  const weightedSubjIds: string[] = [];
  for (const subj of config.subjects) {
    const w = Math.max(0, Math.round(config.subjectWeights[subj.id] ?? 0));
    for (let i = 0; i < w; i++) {
      weightedSubjIds.push(subj.id);
    }
  }
  const subjMap = new Map(config.subjects.map((s) => [s.id, s]));

  // 3. Fill free gaps with alternating Study / Break until target study minutes met
  let remainingStudyMs = Math.max(0, config.totalStudyHours) * 60 * 60 * 1000;
  const sessionMs = Math.max(15, config.sessionLengthMinutes) * 60 * 1000;
  const breakMs = Math.max(5, config.breakLengthMinutes) * 60 * 1000;
  let subjPointer = 0;

  const generatedRaw: Array<{
    startMs: number;
    endMs: number;
    title: string;
    type: BlockType;
    subjectId: string;
  }> = fixedBlocks.map((fb) => ({ ...fb, subjectId: '' }));

  for (const gap of freeGaps) {
    let gCursor = gap.startMs;
    while (remainingStudyMs >= 15 * 60 * 1000 && gap.endMs - gCursor >= 15 * 60 * 1000) {
      const studyDur = Math.min(sessionMs, remainingStudyMs, gap.endMs - gCursor);
      if (studyDur < 15 * 60 * 1000) break;

      const subjId =
        weightedSubjIds.length > 0 ? weightedSubjIds[subjPointer % weightedSubjIds.length] : '';
      subjPointer += 1;
      const subj = subjId ? subjMap.get(subjId) : undefined;

      generatedRaw.push({
        startMs: gCursor,
        endMs: gCursor + studyDur,
        title: subj ? `${subj.name} Study` : 'Focused Study',
        type: 'study',
        subjectId: subjId,
      });

      gCursor += studyDur;
      remainingStudyMs -= studyDur;

      // Insert Break if more study remains and gap accommodates break + at least 15m next study
      if (remainingStudyMs >= 15 * 60 * 1000 && gap.endMs - gCursor >= breakMs + 15 * 60 * 1000) {
        generatedRaw.push({
          startMs: gCursor,
          endMs: gCursor + breakMs,
          title: 'Break',
          type: 'break',
          subjectId: '',
        });
        gCursor += breakMs;
      } else if (gap.endMs - gCursor >= breakMs && remainingStudyMs > 0) {
        generatedRaw.push({
          startMs: gCursor,
          endMs: gCursor + breakMs,
          title: 'Break',
          type: 'break',
          subjectId: '',
        });
        break;
      }
    }
  }

  generatedRaw.sort((a, b) => a.startMs - b.startMs);

  // Convert millisecond intervals into TimeBlock objects (splitting cleanly or using crossesMidnight for Sleep)
  const blocks: TimeBlock[] = [];
  for (let i = 0; i < generatedRaw.length; i++) {
    const item = generatedRaw[i];
    const sDt = new Date(item.startMs);
    const eDt = new Date(item.endMs);
    const sDate = toLocalDateStr(sDt);
    const eDate = toLocalDateStr(eDt);
    const startTime = `${String(sDt.getHours()).padStart(2, '0')}:${String(sDt.getMinutes()).padStart(2, '0')}`;
    const endTimeRaw = `${String(eDt.getHours()).padStart(2, '0')}:${String(eDt.getMinutes()).padStart(2, '0')}`;
    const endTime = sDate !== eDate && endTimeRaw === '00:00' ? '24:00' : endTimeRaw;

    blocks.push({
      id: `wiz-${Date.now().toString(36)}-${i}`,
      date: sDate,
      startTime,
      endTime,
      title: item.title,
      type: item.type,
      subjectId: item.subjectId,
      notes: '',
      alarmAtStart: config.alarmAtStart,
      alarm5MinBefore: config.alarm5MinBefore,
    });
  }

  return blocks;
}

export function getDatesInRange(startDate: string, endDate: string, maxDays: number = 90): string[] {
  const out: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate && out.length < maxDays) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function getWeekdayIso(dateStr: string): number {
  const day = parseLocalDate(dateStr).getDay(); // 0=Sun .. 6=Sat
  return day === 0 ? 7 : day; // 1=Mon .. 7=Sun
}

export function expandTemplateToDates(
  template: DayTemplate,
  targetDates: string[],
  templateGroupId: string
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  targetDates.forEach((dateStr, dIdx) => {
    template.blocks.forEach((tb, bIdx) => {
      blocks.push({
        id: `tpl-${Date.now().toString(36)}-${dIdx}-${bIdx}-${Math.random().toString(36).slice(2, 5)}`,
        date: dateStr,
        startTime: tb.startTime,
        endTime: tb.endTime,
        title: tb.title,
        type: tb.type,
        customColor: tb.customColor,
        subjectId: tb.subjectId,
        notes: tb.notes,
        alarmAtStart: tb.alarmAtStart,
        alarm5MinBefore: tb.alarm5MinBefore,
        templateGroupId,
      });
    });
  });
  return blocks;
}

export function addMinutesToClock(hhmm: string, deltaMinutes: number): string {
  const base = timeToMinutes(hhmm);
  const wrapped = ((base + deltaMinutes) % 1440 + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface ManualRowLike {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: BlockType;
  color: string;
}

export interface RowGapInfo {
  afterRowId: string;
  startTime: string;
  endTime: string;
  minutes: number;
}

export function analyzeScheduleRows(rows: ManualRowLike[]): {
  overlappingIds: Set<string>;
  gaps: Array<{ startMin: number; endMin: number; startTime: string; endTime: string; minutes: number }>;
  studyMinutes: number;
  breakMinutes: number;
  freeMinutes: number;
  normalizedIntervals: Array<{
    row: ManualRowLike;
    startMin: number;
    endMin: number;
    crossesMidnight: boolean;
  }>;
} {
  const overlappingIds = new Set<string>();
  let studyMinutes = 0;
  let breakMinutes = 0;

  // Build normalized intervals on [0, 1440] (or splitting midnight crossers into [s, 1440] & [0, e] for day overlap check)
  const segments: Array<{ rowId: string; start: number; end: number }> = [];
  const normalizedIntervals: Array<{
    row: ManualRowLike;
    startMin: number;
    endMin: number;
    crossesMidnight: boolean;
  }> = [];

  for (const r of rows) {
    const s = timeToMinutes(r.startTime);
    const rawE = timeToMinutes(r.endTime);
    const crosses = r.endTime !== '24:00' && rawE <= s;
    const dur = crosses ? 1440 - s + rawE : Math.max(0, rawE - s);

    if (r.type === 'study') studyMinutes += dur;
    if (r.type === 'break') breakMinutes += dur;

    normalizedIntervals.push({
      row: r,
      startMin: s,
      endMin: crosses ? 1440 : rawE,
      crossesMidnight: crosses,
    });

    if (crosses) {
      segments.push({ rowId: r.id, start: s, end: 1440 });
      if (rawE > 0) {
        segments.push({ rowId: r.id, start: 0, end: rawE });
      }
    } else if (rawE > s) {
      segments.push({ rowId: r.id, start: s, end: rawE });
    }
  }

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (segments[i].rowId === segments[j].rowId) continue;
      if (segments[i].start < segments[j].end && segments[i].end > segments[j].start) {
        overlappingIds.add(segments[i].rowId);
        overlappingIds.add(segments[j].rowId);
      }
    }
  }

  // Merge occupied segments within [0, 1440] to compute free time and gaps
  const sortedSegs = [...segments].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Array<[number, number]> = [];
  for (const seg of sortedSegs) {
    const last = merged[merged.length - 1];
    if (last && seg.start <= last[1]) {
      last[1] = Math.max(last[1], seg.end);
    } else {
      merged.push([seg.start, seg.end]);
    }
  }

  let occupied = 0;
  const gaps: Array<{ startMin: number; endMin: number; startTime: string; endTime: string; minutes: number }> = [];
  for (let i = 0; i < merged.length; i++) {
    occupied += merged[i][1] - merged[i][0];
    if (i > 0) {
      const gapStart = merged[i - 1][1];
      const gapEnd = merged[i][0];
      if (gapEnd > gapStart) {
        gaps.push({
          startMin: gapStart,
          endMin: gapEnd,
          startTime: minutesToTime(gapStart),
          endTime: minutesToTime(gapEnd),
          minutes: gapEnd - gapStart,
        });
      }
    }
  }

  return {
    overlappingIds,
    gaps,
    studyMinutes,
    breakMinutes,
    freeMinutes: Math.max(0, 1440 - occupied),
    normalizedIntervals,
  };
}
