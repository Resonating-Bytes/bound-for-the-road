jest.mock('../../src/config/timezoneCentroids', () => ({
  getDeviceTimezone: () => 'America/Chicago',
  timezoneCentroid: () => ({ lat: 41.8781, lon: -87.6298 }),
}));

import {
  classifyDayNight,
  computeDayNightMinutes,
  createSessionSunWindow,
  dayNightPhaseAt,
  formatDayNightSummary,
  dayNightLabel,
} from '../../src/utils/dayNight';

describe('dayNight', () => {
  test('classifies mid-afternoon Chicago summer session as day', () => {
    expect(classifyDayNight('2026-06-21T19:00:00.000Z', 41.8781, -87.6298)).toBe('day');
  });

  test('computeDayNightMinutes assigns whole session when start and end match', () => {
    expect(
      computeDayNightMinutes('2026-06-21T19:00:00.000Z', '2026-06-21T20:30:00.000Z'),
    ).toEqual({ dayMinutes: 90, nightMinutes: 0 });
    expect(
      computeDayNightMinutes('2026-06-22T04:00:00.000Z', '2026-06-22T05:00:00.000Z'),
    ).toEqual({ dayMinutes: 0, nightMinutes: 60 });
  });

  test('computeDayNightMinutes splits session crossing sunset', () => {
    // 6:00 PM – 9:00 PM CDT on 2026-06-21 (sunset ~8:30 PM local)
    const split = computeDayNightMinutes(
      '2026-06-21T23:00:00.000Z',
      '2026-06-22T02:00:00.000Z',
    );
    expect(split.dayMinutes).toBeGreaterThan(0);
    expect(split.nightMinutes).toBeGreaterThan(0);
    expect(split.dayMinutes + split.nightMinutes).toBe(180);
  });

  test('formatDayNightSummary compact labels', () => {
    expect(formatDayNightSummary(90, 0)).toBe('Day');
    expect(formatDayNightSummary(60, 60)).toBe('Night');
    expect(formatDayNightSummary(45, 17)).toBe('Mixed — 28 min day, 17 min night');
  });

  test('dayNightLabel maps legacy enum to display text', () => {
    expect(dayNightLabel('day')).toBe('Day');
    expect(dayNightLabel('night')).toBe('Night');
  });

  test('createSessionSunWindow fixes sunrise/sunset for session anchor date', () => {
    const anchor = '2026-06-21T19:00:00.000Z';
    const window = createSessionSunWindow(anchor, 41.8781, -87.6298);
    expect(window.anchorDate).toBe('2026-06-21');
    expect(window.sunriseIso).toBeTruthy();
    expect(window.sunsetIso).toBeTruthy();
    expect(dayNightPhaseAt(anchor, window)).toBe('day');
    expect(dayNightPhaseAt('2026-06-22T04:00:00.000Z', window)).toBe('night');
  });

  test('dayNightPhaseAt uses fixed window without recomputing per sample', () => {
    const window = createSessionSunWindow('2026-06-21T19:00:00.000Z');
    const afternoon = dayNightPhaseAt('2026-06-21T19:00:00.000Z', window);
    const lateNight = dayNightPhaseAt('2026-06-22T04:00:00.000Z', window);
    expect(afternoon).toBe('day');
    expect(lateNight).toBe('night');
  });
});
