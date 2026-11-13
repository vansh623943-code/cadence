import { DayTemplate, Subject, TimeBlock } from '../types/study';
import { BLOCK_TYPE_META, doesBlockCrossMidnight, timeToMinutes } from './dayPlannerUtils';
import { addDays, parseLocalDate } from './dateUtils';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatIcsLocalDateTime(dateStr: string, hhmm: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  if (hhmm === '24:00') {
    const next = addDays(dateStr, 1).replace(/-/g, '');
    return `${next}T000000`;
  }
  const mins = timeToMinutes(hhmm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${cleanDate}T${pad2(h)}${pad2(m)}00`;
}

function formatIcsUtcStamp(d: Date = new Date()): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T` +
    `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function buildAlarms(title: string, alarmAtStart: boolean, alarm5MinBefore: boolean): string[] {
  const lines: string[] = [];
  if (alarmAtStart) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText(`Starting now: ${title}`)}`,
      'TRIGGER:PT0M',
      'END:VALARM'
    );
  }
  if (alarm5MinBefore) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText(`In 5 minutes: ${title}`)}`,
      'TRIGGER:-PT5M',
      'END:VALARM'
    );
  }
  return lines;
}

export function generateIcsForBlocks(
  blocks: TimeBlock[],
  subjects: Subject[],
  calendarName: string = 'Kilostudy Planner Day Planner'
): string {
  const subjMap = new Map(subjects.map((s) => [s.id, s.name]));
  const dtstamp = formatIcsUtcStamp();

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kilostudy Planner//Study Planner & Pomodoro//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  for (const block of blocks) {
    const crosses = doesBlockCrossMidnight(block.startTime, block.endTime);
    const endDate = crosses ? addDays(block.date, 1) : block.date;
    const dtStart = formatIcsLocalDateTime(block.date, block.startTime);
    const dtEnd = formatIcsLocalDateTime(endDate, block.endTime);
    const typeLabel = BLOCK_TYPE_META[block.type].label;
    const subjName = block.subjectId ? subjMap.get(block.subjectId) : undefined;
    const descParts = [
      `Type: ${typeLabel}`,
      subjName ? `Subject: ${subjName}` : '',
      block.notes ? `Notes: ${block.notes}` : '',
    ].filter(Boolean);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${block.id}@Kilostudy Planner.study`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcsText(block.title)}`,
      `DESCRIPTION:${escapeIcsText(descParts.join('\n'))}`,
      ...buildAlarms(block.title, block.alarmAtStart, block.alarm5MinBefore),
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

const ISO_WEEKDAY_TO_BYDAY: Record<number, string> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
  7: 'SU',
};

export function generateIcsForTemplate(
  template: DayTemplate,
  startDate: string,
  weekdays: number[],
  endDate: string | undefined,
  subjects: Subject[]
): string {
  const subjMap = new Map(subjects.map((s) => [s.id, s.name]));
  const dtstamp = formatIcsUtcStamp();
  const byDay = (weekdays.length > 0 ? weekdays : [1, 2, 3, 4, 5])
    .map((d) => ISO_WEEKDAY_TO_BYDAY[d])
    .filter(Boolean)
    .join(',');

  let untilPart = '';
  if (endDate) {
    const endDt = parseLocalDate(endDate);
    untilPart = `;UNTIL=${endDt.getFullYear()}${pad2(endDt.getMonth() + 1)}${pad2(endDt.getDate())}T235959`;
  }

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kilostudy Planner//Study Planner & Pomodoro//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(`Kilostudy Planner — ${template.name}`)}`,
  ];

  for (const tb of template.blocks) {
    const crosses = doesBlockCrossMidnight(tb.startTime, tb.endTime);
    const blockEndDate = crosses ? addDays(startDate, 1) : startDate;
    const dtStart = formatIcsLocalDateTime(startDate, tb.startTime);
    const dtEnd = formatIcsLocalDateTime(blockEndDate, tb.endTime);
    const typeLabel = BLOCK_TYPE_META[tb.type].label;
    const subjName = tb.subjectId ? subjMap.get(tb.subjectId) : undefined;
    const descParts = [
      `Template: ${template.name}`,
      `Type: ${typeLabel}`,
      subjName ? `Subject: ${subjName}` : '',
      tb.notes ? `Notes: ${tb.notes}` : '',
    ].filter(Boolean);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${template.id}-${tb.id}@Kilostudy Planner.study`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay}${untilPart}`,
      `SUMMARY:${escapeIcsText(tb.title)}`,
      `DESCRIPTION:${escapeIcsText(descParts.join('\n'))}`,
      ...buildAlarms(tb.title, tb.alarmAtStart, tb.alarm5MinBefore),
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
