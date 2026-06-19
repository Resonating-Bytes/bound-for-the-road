jest.mock('../../src/db/client', () => ({
  getDb: () => require('../helpers/testDb').getTestDb(),
}));

jest.mock('../../src/config/timezoneCentroids', () => ({
  getDeviceTimezone: () => 'America/Chicago',
  timezoneCentroid: () => ({ lat: 41.8781, lon: -87.6298 }),
}));

import { initTestDb, resetTestDb } from '../helpers/testDb';
import {
  upsertUser,
  createActiveSession,
  stopSession,
  saveSession,
  submitSession,
  getSubmissionForSession,
  getApprovalForHash,
  upsertApproval,
  withdrawSubmission,
  getSessionApprovalContext,
  resumeSession,
  discardDraft,
  reopenSavedSession,
  restoreSavedSession,
  softDeleteSession,
  getProgress,
  listSavedSessions,
  getSessionById,
  getActiveSession,
  expireStaleActiveSession,
  isActiveSessionStale,
  deleteAllUserData,
} from '../../src/db/queries';
import { getDb } from '../../src/db/client';
import { outbox } from '../../src/db/schema';

const TEEN_ID = 'teen-001';

function seedUser() {
  upsertUser({
    id: TEEN_ID,
    legalName: 'Alex Driver',
    dateOfBirth: '2009-01-01',
    stateCode: 'IL',
    permitIssueDate: '2025-09-01',
  });
}

describe('queries', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T14:00:00.000Z'));
    resetTestDb();
    initTestDb();
    seedUser();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('active → draft → submitted lifecycle', async () => {
    const active = createActiveSession(TEEN_ID);
    expect(active.status).toBe('active');

    const draft = stopSession(active.id, '2026-06-01T15:00:00.000Z');
    expect(draft.status).toBe('draft');
    expect(draft.endedAt).toBe('2026-06-01T15:00:00.000Z');

    const saved = await submitSession(draft.id, {
      notes: 'Practice loop',
      submittedByUserId: TEEN_ID,
    });
    expect(saved.status).toBe('saved');
    expect(saved.durationMinutes).toBeGreaterThan(0);
    expect(saved.requestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.payloadJson).toContain('"submittedAt"');

    const submission = getSubmissionForSession(saved.id);
    expect(submission.requestHash).toBe(saved.requestHash);
    expect(submission.superseded).toBe(false);
  });

  test('withdraw submission soft-deletes saved session', async () => {
    const active = createActiveSession(TEEN_ID);
    stopSession(active.id, '2026-06-01T15:00:00.000Z');
    await submitSession(active.id, { submittedByUserId: TEEN_ID });
    const deleted = withdrawSubmission(active.id);
    expect(deleted.status).toBe('deleted');
    expect(deleted.deletedAt).not.toBeNull();
    expect(getSubmissionForSession(active.id)).toBeNull();
    expect(listSavedSessions(TEEN_ID)).toHaveLength(0);
  });

  test('approval context reflects approved hash', async () => {
    const active = createActiveSession(TEEN_ID);
    stopSession(active.id, '2026-06-01T15:00:00.000Z');
    const saved = await submitSession(active.id, { submittedByUserId: TEEN_ID });
    upsertApproval({
      id: 'appr-1',
      requestHash: saved.requestHash,
      sessionId: saved.id,
      approvedByUserId: 'adult-1',
      approvedAt: '2026-06-01T16:00:00.000Z',
      joinedSession: true,
      supervisorInVehicleName: 'Pat',
      approverPresent: 'co_present',
    });
    const ctx = getSessionApprovalContext(saved.id);
    expect(getApprovalForHash(saved.requestHash)?.approvedByUserId).toBe('adult-1');
    expect(ctx.approval.requestHash).toBe(saved.requestHash);
  });

  test('resume clears endedAt and returns to active', () => {
    const active = createActiveSession(TEEN_ID);
    const draft = stopSession(active.id, '2026-06-01T15:00:00.000Z');
    const resumed = resumeSession(draft.id);
    expect(resumed.status).toBe('active');
    expect(resumed.endedAt).toBeNull();
  });

  test('discardDraft removes draft row', () => {
    const active = createActiveSession(TEEN_ID);
    stopSession(active.id, '2026-06-01T15:00:00.000Z');
    discardDraft(active.id);
    expect(getSessionById(active.id)).toBeNull();
  });

  test('reopen saved session clears hash for edit draft', async () => {
    const active = createActiveSession(TEEN_ID, 'IL');
    stopSession(active.id, '2026-06-01T15:00:00.000Z');
    const saved = await saveSession(active.id, { notes: 'Original', savedByUserId: TEEN_ID });
    const backup = {
      requestHash: saved.requestHash,
      payloadJson: saved.payloadJson,
      notes: saved.notes,
    };

    const draft = reopenSavedSession(active.id);
    expect(draft.status).toBe('draft');
    expect(draft.requestHash).toBeNull();

    restoreSavedSession(active.id, backup);
    const restored = getSessionById(active.id);
    expect(restored.status).toBe('saved');
    expect(restored.requestHash).toBe(backup.requestHash);
    expect(restored.notes).toBe('Original');
  });

  test('expireStaleActiveSession stops session older than 24 hours', () => {
    const active = createActiveSession(TEEN_ID);
    jest.setSystemTime(new Date('2026-06-02T15:00:00.000Z'));
    expect(isActiveSessionStale(active)).toBe(true);
    const draft = expireStaleActiveSession(TEEN_ID, '2026-06-02T15:00:00.000Z');
    expect(draft.status).toBe('draft');
    expect(draft.endedAt).toBe('2026-06-02T15:00:00.000Z');
    expect(getActiveSession(TEEN_ID)).toBeNull();
  });

  test('expireStaleActiveSession ignores recent active session', () => {
    createActiveSession(TEEN_ID);
    jest.setSystemTime(new Date('2026-06-01T16:00:00.000Z'));
    expect(expireStaleActiveSession(TEEN_ID)).toBeNull();
  });

  test('getProgress excludes soft-deleted saved sessions', async () => {
    const s1 = createActiveSession(TEEN_ID);
    stopSession(s1.id, '2026-06-01T15:00:00.000Z');
    await saveSession(s1.id, { savedByUserId: TEEN_ID });

    jest.setSystemTime(new Date('2026-06-02T15:00:00.000Z'));
    const s2 = createActiveSession(TEEN_ID);
    stopSession(s2.id, '2026-06-02T16:00:00.000Z');
    await saveSession(s2.id, { savedByUserId: TEEN_ID });
    softDeleteSession(s2.id);

    const progress = getProgress(TEEN_ID);
    expect(progress.totalMinutes).toBeGreaterThan(0);
    expect(listSavedSessions(TEEN_ID)).toHaveLength(1);
  });

  test('submit enqueues outbox row with user id', async () => {
    const active = createActiveSession(TEEN_ID);
    stopSession(active.id, '2026-06-01T15:00:00.000Z');
    await submitSession(active.id, { submittedByUserId: TEEN_ID });
    const rows = getDb().select().from(outbox).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(TEEN_ID);
    expect(rows[0].operation).toBe('session_submitted');
  });

  test('deleteAllUserData clears outbox for user', async () => {
    const active = createActiveSession(TEEN_ID);
    stopSession(active.id, '2026-06-01T15:00:00.000Z');
    await submitSession(active.id, { submittedByUserId: TEEN_ID });
    expect(getDb().select().from(outbox).all()).toHaveLength(1);
    deleteAllUserData(TEEN_ID);
    expect(getDb().select().from(outbox).all()).toHaveLength(0);
  });

  test('deleteAllUserData clears legacy outbox rows without user_id', () => {
    const active = createActiveSession(TEEN_ID);
    getDb()
      .insert(outbox)
      .values({
        id: 'outbox-legacy',
        operation: 'session_submitted',
        payloadJson: JSON.stringify({ sessionId: active.id, requestHash: 'abc' }),
        userId: null,
        createdAt: '2026-06-01T10:00:00.000Z',
        syncedAt: null,
      })
      .run();
    deleteAllUserData(TEEN_ID);
    expect(getDb().select().from(outbox).all()).toHaveLength(0);
  });
});
