jest.mock('../../src/config/timezoneCentroids', () => ({
  getDeviceTimezone: () => 'America/Chicago',
  timezoneCentroid: () => ({ lat: 41.8781, lon: -87.6298 }),
}));

import { getCurfewWarning } from '../../src/utils/curfew';

describe('curfew', () => {
  test('returns null when session is entirely before weekday curfew', () => {
    // 3:00 PM – 5:00 PM CDT on a Tuesday
    const warning = getCurfewWarning(
      '2026-06-16T20:00:00.000Z',
      '2026-06-16T22:00:00.000Z',
    );
    expect(warning).toBeNull();
  });

  test('warns when session ends during weekday curfew hours', () => {
    // 8:00 PM – 11:00 PM CDT on a Tuesday (ends after 10 PM)
    const warning = getCurfewWarning(
      '2026-06-17T01:00:00.000Z',
      '2026-06-17T04:00:00.000Z',
    );
    expect(warning).toContain('Illinois permit curfew');
  });

  test('warns when session starts during weekend curfew hours', () => {
    // Saturday 11:30 PM – Sunday 12:30 AM CDT
    const warning = getCurfewWarning(
      '2026-06-21T04:30:00.000Z',
      '2026-06-21T05:30:00.000Z',
    );
    expect(warning).toContain('Illinois permit curfew');
  });
});
