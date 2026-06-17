import SunCalc from 'suncalc';
import { getDeviceTimezone, timezoneCentroid } from '../config/timezoneCentroids';

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

export function classifyDayNight(startedAt, latitude, longitude) {
  const tz = getDeviceTimezone();
  const coords =
    latitude != null && longitude != null
      ? { lat: latitude, lon: longitude }
      : timezoneCentroid(tz);

  const dateStr = localCalendarDate(startedAt, tz);
  const noonUtc = new Date(`${dateStr}T12:00:00Z`);
  const times = SunCalc.getTimes(noonUtc, coords.lat, coords.lon);

  const startMs = localTimeMs(startedAt, tz);
  const sunriseMs = localTimeMs(times.sunrise.toISOString(), tz);
  const sunsetMs = localTimeMs(times.sunset.toISOString(), tz);

  if (startMs >= sunsetMs || startMs < sunriseMs) {
    return 'night';
  }
  return 'day';
}

export function dayNightLabel(dayNight) {
  return dayNight === 'night' ? 'Night' : 'Day';
}
