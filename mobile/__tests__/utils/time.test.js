import {
  durationMinutes,
  isAtLeastAge,
  isValidISODate,
  toISODateOnly,
  parseISODate,
  formatDuration,
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

  test('formatDuration renders hours and minutes', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(90)).toBe('1h 30m');
  });
});
