import {
  sessionIntervalsOverlap,
  computeInvalidSessionIds,
  findConflictingSessions,
  formatOverlapConflictMessage,
} from '../../src/utils/sessionTimeValidation';

describe('sessionTimeValidation', () => {
  test('sessionIntervalsOverlap detects partial overlap', () => {
    expect(
      sessionIntervalsOverlap(
        '2026-06-01T14:00:00.000Z',
        '2026-06-01T15:00:00.000Z',
        '2026-06-01T14:30:00.000Z',
        '2026-06-01T15:30:00.000Z',
      ),
    ).toBe(true);
  });

  test('sessionIntervalsOverlap ignores touching endpoints', () => {
    expect(
      sessionIntervalsOverlap(
        '2026-06-01T14:00:00.000Z',
        '2026-06-01T15:00:00.000Z',
        '2026-06-01T15:00:00.000Z',
        '2026-06-01T16:00:00.000Z',
      ),
    ).toBe(false);
  });

  test('computeInvalidSessionIds keeps oldest session in overlap group', () => {
    const invalid = computeInvalidSessionIds([
      {
        id: 'older',
        startedAt: '2026-06-01T14:00:00.000Z',
        endedAt: '2026-06-01T15:00:00.000Z',
        createdAt: '2026-06-01T16:00:00.000Z',
      },
      {
        id: 'newer',
        startedAt: '2026-06-01T14:30:00.000Z',
        endedAt: '2026-06-01T15:30:00.000Z',
        createdAt: '2026-06-01T17:00:00.000Z',
      },
    ]);
    expect(invalid.has('older')).toBe(false);
    expect(invalid.has('newer')).toBe(true);
  });

  test('computeInvalidSessionIds uses createdAt when starts tie', () => {
    const invalid = computeInvalidSessionIds([
      {
        id: 'first-created',
        startedAt: '2026-06-01T14:00:00.000Z',
        endedAt: '2026-06-01T15:00:00.000Z',
        createdAt: '2026-06-01T10:00:00.000Z',
      },
      {
        id: 'second-created',
        startedAt: '2026-06-01T14:00:00.000Z',
        endedAt: '2026-06-01T15:00:00.000Z',
        createdAt: '2026-06-01T11:00:00.000Z',
      },
    ]);
    expect(invalid.has('first-created')).toBe(false);
    expect(invalid.has('second-created')).toBe(true);
  });

  test('findConflictingSessions returns overlapping saved sessions', () => {
    const saved = [
      {
        id: 'other',
        startedAt: '2026-06-01T14:00:00.000Z',
        endedAt: '2026-06-01T15:00:00.000Z',
      },
      {
        id: 'clear',
        startedAt: '2026-06-01T16:00:00.000Z',
        endedAt: '2026-06-01T17:00:00.000Z',
      },
    ];
    const conflicts = findConflictingSessions(
      'draft',
      '2026-06-01T14:30:00.000Z',
      '2026-06-01T15:30:00.000Z',
      saved,
    );
    expect(conflicts.map((s) => s.id)).toEqual(['other']);
    expect(formatOverlapConflictMessage(conflicts)).toContain('Jun');
  });
});
