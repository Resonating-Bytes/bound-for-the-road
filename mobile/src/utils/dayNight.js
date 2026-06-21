import SunCalc from 'suncalc';
import { getDeviceTimezone, timezoneCentroid } from '../config/timezoneCentroids';
import { durationMinutes } from './time';

function toLocalParts(iso, timeZone) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(d);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const h = get('hour') === 24 ? 0 : get('hour');
  return { hours: h, minutes: get('minute'), seconds: get('second') };
}

function localTimeMs(iso, timeZone) {
  const { hours, minutes, seconds } = toLocalParts(iso, timeZone);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

function localCalendarDate(iso, timeZone) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function resolveCoords(latitude, longitude) {
  const tz = getDeviceTimezone();
  if (latitude != null && longitude != null) {
    return { lat: latitude, lon: longitude, tz };
  }
  const centroid = timezoneCentroid(tz);
  return { lat: centroid.lat, lon: centroid.lon, tz };
}

function getSunTimesForLocalDate(dateStr, lat, lon) {
  const noonUtc = new Date(`${dateStr}T12:00:00Z`);
  return SunCalc.getTimes(noonUtc, lat, lon);
}

/** Fixed sunrise/sunset for an active session display (computed once at session anchor). */
export function createSessionSunWindow(anchorIso, latitude = null, longitude = null) {
  const { lat, lon, tz } = resolveCoords(latitude, longitude);
  const dateStr = localCalendarDate(anchorIso, tz);
  const times = getSunTimesForLocalDate(dateStr, lat, lon);
  return {
    lat,
    lon,
    tz,
    anchorDate: dateStr,
    sunriseIso: times.sunrise.toISOString(),
    sunsetIso: times.sunset.toISOString(),
  };
}

/** Day or night at `iso` using session-fixed sunrise/sunset (no per-sample SunCalc). */
export function dayNightPhaseAt(iso, sunWindow) {
  if (!iso || !sunWindow) return 'day';
  const pointMs = localTimeMs(iso, sunWindow.tz);
  const sunriseMs = localTimeMs(sunWindow.sunriseIso, sunWindow.tz);
  const sunsetMs = localTimeMs(sunWindow.sunsetIso, sunWindow.tz);
  if (pointMs >= sunsetMs || pointMs < sunriseMs) return 'night';
  return 'day';
}

/** True when local time at `iso` is night (before sunrise or after sunset). */
export function isNightAt(iso, latitude = null, longitude = null) {
  return dayNightPhaseAt(iso, createSessionSunWindow(iso, latitude, longitude)) === 'night';
}

/** @deprecated Use computeDayNightMinutes — whole-session bucket from start only. */
export function classifyDayNight(startedAt, latitude, longitude) {
  return isNightAt(startedAt, latitude, longitude) ? 'night' : 'day';
}

function listBoundaryTimesBetween(startIso, endIso, lat, lon, tz) {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (endMs <= startMs) return [];

  const boundaries = [];
  let dateStr = localCalendarDate(startIso, tz);
  const endDateStr = localCalendarDate(endIso, tz);

  for (;;) {
    const times = getSunTimesForLocalDate(dateStr, lat, lon);
    for (const event of [times.sunrise, times.sunset]) {
      const ms = new Date(event.toISOString()).getTime();
      if (ms > startMs && ms < endMs) {
        boundaries.push(event.toISOString());
      }
    }
    if (dateStr === endDateStr) break;
    const nextDay = new Date(`${dateStr}T12:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    dateStr = localCalendarDate(nextDay.toISOString(), tz);
  }

  boundaries.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  return boundaries;
}

/**
 * Split session duration into day and night minutes using device timezone +
 * timezone centroid (or optional coords). Walks sunrise/sunset boundaries
 * between start and end.
 */
export function computeDayNightMinutes(startedAt, endedAt, latitude = null, longitude = null) {
  if (!startedAt || !endedAt) {
    return { dayMinutes: 0, nightMinutes: 0 };
  }

  const totalMinutes = durationMinutes(startedAt, endedAt);
  if (totalMinutes <= 0) {
    return { dayMinutes: 0, nightMinutes: 0 };
  }

  const { lat, lon, tz } = resolveCoords(latitude, longitude);
  const startIsNight = isNightAt(startedAt, lat, lon);
  const endIsNight = isNightAt(endedAt, lat, lon);

  if (startIsNight === endIsNight) {
    return startIsNight
      ? { dayMinutes: 0, nightMinutes: totalMinutes }
      : { dayMinutes: totalMinutes, nightMinutes: 0 };
  }

  const boundaries = listBoundaryTimesBetween(startedAt, endedAt, lat, lon, tz);
  let dayMinutes = 0;
  let nightMinutes = 0;
  let segmentStart = startedAt;
  let segmentIsNight = startIsNight;

  for (const boundary of boundaries) {
    const segMins = durationMinutes(segmentStart, boundary);
    if (segmentIsNight) nightMinutes += segMins;
    else dayMinutes += segMins;
    segmentStart = boundary;
    segmentIsNight = !segmentIsNight;
  }

  const tailMins = durationMinutes(segmentStart, endedAt);
  if (segmentIsNight) nightMinutes += tailMins;
  else dayMinutes += tailMins;

  return { dayMinutes, nightMinutes };
}

/** Compact Review / list label — day derived as duration − night. */
export function formatDayNightSummary(durationMinutesValue, nightMinutes) {
  const total = Number(durationMinutesValue ?? 0);
  const night = Number(nightMinutes ?? 0);
  const day = Math.max(0, total - night);
  if (day > 0 && night > 0) {
    return `Mixed — ${day} min day, ${night} min night`;
  }
  if (night > 0) return 'Night';
  if (day > 0) return 'Day';
  return '—';
}

/** @deprecated Use formatDayNightSummary(durationMinutes, nightMinutes). */
export function dayNightLabel(dayNight) {
  return dayNight === 'night' ? 'Night' : dayNight === 'day' ? 'Day' : '—';
}

/** Night minutes from legacy whole-session day_night bucket. */
export function legacyNightMinutes(dayNight, durationMinutesValue) {
  const mins = Number(durationMinutesValue ?? 0);
  return dayNight === 'night' ? mins : 0;
}

/** @deprecated Use legacyNightMinutes */
export function dayNightMinutesFromLegacy(dayNight, durationMinutesValue) {
  const nightMinutes = legacyNightMinutes(dayNight, durationMinutesValue);
  const mins = Number(durationMinutesValue ?? 0);
  return { dayMinutes: mins - nightMinutes, nightMinutes };
}
