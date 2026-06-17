import { IL_RULES } from '../config/states/IL';
import { getDeviceTimezone } from '../config/timezoneCentroids';

function localHour(iso, timeZone) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false,
    weekday: 'short',
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  return { hour: hour === 24 ? 0 : hour, weekday };
}

function isWeekend(weekday) {
  return weekday === 'Sat' || weekday === 'Sun';
}

function overlapsCurfew(startIso, endIso) {
  const tz = getDeviceTimezone();
  const start = localHour(startIso, tz);
  const end = localHour(endIso, tz);
  const weekend = isWeekend(start.weekday) || isWeekend(end.weekday);
  const curfewStart = weekend ? IL_RULES.curfew.weekendStart : IL_RULES.curfew.weekdayStart;
  const curfewEnd = IL_RULES.curfew.weekdayEnd;

  const inCurfew = (hour) => hour >= curfewStart || hour < curfewEnd;
  return inCurfew(start.hour) || inCurfew(end.hour);
}

export function getCurfewWarning(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null;
  if (!overlapsCurfew(startedAt, endedAt)) return null;
  return 'This session overlaps Illinois permit curfew hours (informational only).';
}
