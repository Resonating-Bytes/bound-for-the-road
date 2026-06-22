export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowISO() {
  return new Date().toISOString();
}

export function durationMs(startedAt, endedAt) {
  if (!startedAt || !endedAt) return 0;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(0, ms);
}

export function durationMinutes(startedAt, endedAt) {
  return Math.round(durationMs(startedAt, endedAt) / 60000);
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = isValidISODate(iso) ? parseISODate(iso) : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function addMonths(isoDate, months) {
  const d = isValidISODate(isoDate) ? parseISODate(isoDate) : new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return toISODateOnly(d);
}

export function isAtLeastAge(isoDate, minYears) {
  const dob = isValidISODate(isoDate) ? parseISODate(isoDate) : new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= minYears;
}

export function isValidISODate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T12:00:00`);
  return !Number.isNaN(d.getTime());
}

export function toISODateOnly(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso, fallback = new Date()) {
  if (!iso || !isValidISODate(iso)) return fallback;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function parseISODateTime(iso, fallback = new Date()) {
  if (!iso) return fallback;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export function toISOStringFromDate(date) {
  return date.toISOString();
}

export function yearsAgo(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}
