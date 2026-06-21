import { aggregateSessionProgress } from '../../src/lib/teenProgress';

describe('teenProgress', () => {
  test('aggregateSessionProgress uses stored night minutes', () => {
    expect(
      aggregateSessionProgress([
        { duration_minutes: 60, night_minutes: 20 },
        { duration_minutes: 30, night_minutes: 30 },
      ]),
    ).toEqual({
      totalMinutes: 90,
      nightMinutes: 50,
      dayMinutes: 40,
    });
  });

  test('aggregateSessionProgress falls back to legacy day_night bucket', () => {
    expect(
      aggregateSessionProgress([
        { duration_minutes: 60, day_night: 'day' },
        { duration_minutes: 30, day_night: 'night' },
        { durationMinutes: 45, dayNight: 'night' },
      ]),
    ).toEqual({
      totalMinutes: 135,
      nightMinutes: 75,
      dayMinutes: 60,
    });
  });

  test('aggregateSessionProgress handles empty input', () => {
    expect(aggregateSessionProgress()).toEqual({
      totalMinutes: 0,
      nightMinutes: 0,
      dayMinutes: 0,
    });
  });
});
