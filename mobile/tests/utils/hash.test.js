import crypto from 'crypto';
import {
  stableStringify,
  stableSubmitStringify,
  computeRequestHash,
  truncateHash,
  verifyStoredHash,
  buildSubmitPayload,
} from '../../src/utils/hash';

const GOLDEN_PAYLOAD = {
  schemaVersion: 1,
  sessionId: 'sess-001',
  stateCode: 'IL',
  startedAt: '2026-06-01T14:00:00.000Z',
  endedAt: '2026-06-01T15:30:00.000Z',
  durationMinutes: 90,
  dayNight: 'day',
  notes: 'Highway practice',
  savedAt: '2026-06-01T15:31:00.000Z',
  savedByUserId: 'user-001',
};

describe('hash', () => {
  test('stableStringify uses fixed key order and ignores extra keys', () => {
    const shuffled = {
      notes: null,
      sessionId: 'abc',
      extraField: 'ignored',
      schemaVersion: 1,
      stateCode: 'IL',
      startedAt: '2026-01-01T12:00:00.000Z',
      endedAt: '2026-01-01T13:00:00.000Z',
      durationMinutes: 60,
      dayNight: 'day',
      savedAt: '2026-01-01T13:00:00.000Z',
      savedByUserId: 'u1',
    };

    const canonical = stableStringify(shuffled);
    expect(canonical).not.toContain('extraField');
    expect(canonical).toBe(
      JSON.stringify({
        schemaVersion: 1,
        sessionId: 'abc',
        stateCode: 'IL',
        startedAt: '2026-01-01T12:00:00.000Z',
        endedAt: '2026-01-01T13:00:00.000Z',
        durationMinutes: 60,
        dayNight: 'day',
        notes: null,
        savedAt: '2026-01-01T13:00:00.000Z',
        savedByUserId: 'u1',
      }),
    );
  });

  test('computeRequestHash matches Node SHA-256 golden vector', async () => {
    const canonical = stableStringify(GOLDEN_PAYLOAD);
    const expected = crypto.createHash('sha256').update(canonical).digest('hex');
    await expect(computeRequestHash(GOLDEN_PAYLOAD)).resolves.toBe(expected);
  });

  test('submit payload uses expanded key order', async () => {
    const payload = buildSubmitPayload({
      sessionId: 'sess-001',
      stateCode: 'IL',
      startedAt: '2026-06-01T14:00:00.000Z',
      endedAt: '2026-06-01T15:30:00.000Z',
      endedBy: 'teen',
      activeSupervisorId: null,
      activeSupervisorJoinedAt: null,
      durationMinutes: 90,
      dayNight: 'day',
      notes: null,
      submittedByUserId: 'user-001',
    });
    payload.submittedAt = '2026-06-01T15:31:00.000Z';
    const canonical = stableSubmitStringify(payload);
    expect(canonical).toContain('"endedBy":"teen"');
    expect(canonical).toContain('"submittedAt"');
    const expected = crypto.createHash('sha256').update(canonical).digest('hex');
    await expect(computeRequestHash(payload)).resolves.toBe(expected);
  });

  test('truncateHash shortens display hash', () => {
    expect(truncateHash('abcdef1234567890', 8)).toBe('abcdef12');
    expect(truncateHash(null)).toBe('');
  });

  test('verifyStoredHash returns true when payload matches stored hash', async () => {
    const requestHash = await computeRequestHash(GOLDEN_PAYLOAD);
    const session = {
      payloadJson: stableStringify(GOLDEN_PAYLOAD),
      requestHash,
    };
    await expect(verifyStoredHash(session)).resolves.toBe(true);
  });

  test('verifyStoredHash returns false when hash was tampered', async () => {
    const requestHash = await computeRequestHash(GOLDEN_PAYLOAD);
    const session = {
      payloadJson: stableStringify({ ...GOLDEN_PAYLOAD, notes: 'tampered' }),
      requestHash,
    };
    await expect(verifyStoredHash(session)).resolves.toBe(false);
  });
});
