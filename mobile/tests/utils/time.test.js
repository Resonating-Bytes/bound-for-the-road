import {
  durationMinutes,
  isAtLeastAge,
  isValidISODate,
  toISODateOnly,
  parseISODate,
  formatDate,
  formatDuration,
  addMonths,
} from '../../src/utils/time';

describe('time', () => {
  test('durationMinutes rounds to nearest minute', () => {
    expect(durationMinutes('2026-06-01T12:00:00.000Z', '2026-06-01T13:30:00.000Z')).toBe(90);
    expect(durationMinutes('2026-06-01T12:00:00.000Z', '2026-06-01T12:00:29.000Z')).toBe(0);
    expect(durationMinutes('2026-06-01T12:00:00.000Z', '2026-06-01T12:00:30.000Z')).toBe(1);
    expect(durationMinutes(null, '2026-06-01T12:00:00.000Z')).toBe(0);
  });

  test('isValidISODate accepts YYYY-MM-DD and rejects invalid dates', () => {
    expect(isValidISODate('2026-06-17')).toBe(true);
    expect(isValidISODate('2026-02-29')).toBe(true);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('06-17-2026')).toBe(false);
  });

  test('isAtLeastAge checks full birth date, not just year', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-17T12:00:00.000Z'));

    expect(isAtLeastAge('2008-01-01', 16)).toBe(true);
    expect(isAtLeastAge('2012-06-17', 16)).toBe(false);
    expect(isAtLeastAge('2012-01-01', 16)).toBe(false);

    jest.useRealTimers();
  });

  test('toISODateOnly and parseISODate round-trip local calendar dates', () => {
    const d = new Date(2026, 5, 17, 12, 0, 0);
    expect(toISODateOnly(d)).toBe('2026-06-17');
    expect(parseISODate('2026-06-17').getFullYear()).toBe(2026);
    expect(parseISODate('bad-date', d)).toBe(d);
  });

  test('date picker pipeline keeps local calendar day (no UTC midnight shift)', () => {
    const picked = new Date(2026, 6, 31, 15, 45, 0);
    const stored = toISODateOnly(picked);
    expect(stored).toBe('2026-07-31');
    expect(parseISODate(stored).getDate()).toBe(31);
    expect(formatDate(stored)).toContain('31');
    expect(formatDate(stored)).not.toContain('30');
  });

  test('addMonths preserves local calendar day for date-only strings', () => {
    expect(addMonths('2026-07-31', 1)).toBe('2026-08-31');
    expect(addMonths('2026-01-15', 9)).toBe('2026-10-15');
  });

  test('formatDuration renders hours and minutes', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(90)).toBe('1h 30m');
  });
});
