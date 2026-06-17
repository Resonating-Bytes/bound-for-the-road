jest.mock('../../src/config/timezoneCentroids', () => ({
  getDeviceTimezone: () => 'America/Chicago',
  timezoneCentroid: () => ({ lat: 41.8781, lon: -87.6298 }),
}));

import { classifyDayNight, dayNightLabel } from '../../src/utils/dayNight';

describe('dayNight', () => {
  test('classifies mid-afternoon Chicago summer session as day', () => {
    // 2:00 PM CDT on 2026-06-21
    expect(classifyDayNight('2026-06-21T19:00:00.000Z', 41.8781, -87.6298)).toBe('day');
  });

  test('classifies late evening Chicago summer session as night', () => {
    // 11:00 PM CDT on 2026-06-21
    expect(classifyDayNight('2026-06-22T04:00:00.000Z', 41.8781, -87.6298)).toBe('night');
  });

  test('classifies early morning before sunrise as night', () => {
    // 4:30 AM CDT on 2026-06-21
    expect(classifyDayNight('2026-06-21T09:30:00.000Z', 41.8781, -87.6298)).toBe('night');
  });

  test('dayNightLabel maps enum to display text', () => {
    expect(dayNightLabel('day')).toBe('Day');
    expect(dayNightLabel('night')).toBe('Night');
  });
});
