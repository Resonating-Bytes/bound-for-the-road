import { createSessionEditBackup } from '../../src/utils/sessionEdit';

describe('sessionEdit', () => {
  test('createSessionEditBackup captures restorable fields', () => {
    const backup = createSessionEditBackup({
      requestHash: 'hash-1',
      payloadJson: '{"a":1}',
      notes: 'Route A',
      startedAt: '2026-06-01T14:00:00.000Z',
      endedAt: '2026-06-01T15:00:00.000Z',
      durationMinutes: 60,
      nightMinutes: 0,
    });

    expect(backup).toEqual({
      requestHash: 'hash-1',
      payloadJson: '{"a":1}',
      notes: 'Route A',
      startedAt: '2026-06-01T14:00:00.000Z',
      endedAt: '2026-06-01T15:00:00.000Z',
      durationMinutes: 60,
      nightMinutes: 0,
    });
  });
});
