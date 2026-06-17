import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { getDb } from './client';
import { users, sessions, outbox } from './schema';
import { generateId, nowISO, durationMinutes } from '../utils/time';
import { classifyDayNight } from '../utils/dayNight';
import { buildSavePayload, computeRequestHash, stableStringify } from '../utils/hash';
import { IL_RULES } from '../config/states/IL';

export function getUserById(userId) {
  const db = getDb();
  return db.select().from(users).where(eq(users.id, userId)).get() ?? null;
}

export function upsertUser(profile) {
  const db = getDb();
  const now = nowISO();
  const existing = getUserById(profile.id);
  const row = {
    id: profile.id,
    role: profile.role ?? 'teen',
    legalName: profile.legalName,
    email: profile.email ?? null,
    dateOfBirth: profile.dateOfBirth ?? null,
    stateCode: profile.stateCode ?? 'IL',
    permitIssueDate: profile.permitIssueDate ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (existing) {
    db.update(users).set(row).where(eq(users.id, profile.id)).run();
  } else {
    db.insert(users).values(row).run();
  }
  return row;
}

export function deleteAllUserData(userId) {
  const db = getDb();
  db.delete(sessions).where(eq(sessions.teenUserId, userId)).run();
  db.delete(users).where(eq(users.id, userId)).run();
}

export function createActiveSession(teenUserId, stateCode = 'IL') {
  const db = getDb();
  const now = nowISO();
  const id = generateId();
  const row = {
    id,
    teenUserId,
    stateCode,
    status: 'active',
    startedAt: now,
    endedAt: null,
    durationMinutes: null,
    dayNight: null,
    notes: null,
    requestHash: null,
    payloadJson: null,
    activeSupervisorId: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(sessions).values(row).run();
  return row;
}

export function getActiveSession(teenUserId) {
  const db = getDb();
  return (
    db
      .select()
      .from(sessions)
      .where(and(eq(sessions.teenUserId, teenUserId), eq(sessions.status, 'active')))
      .get() ?? null
  );
}

export function isActiveSessionStale(session, at = new Date()) {
  if (!session || session.status !== 'active') return false;
  const ageMs = at.getTime() - new Date(session.startedAt).getTime();
  return ageMs >= IL_RULES.staleActiveHours * 60 * 60 * 1000;
}

/** If active session exceeds stale threshold, stop to draft. Returns draft row or null. */
export function expireStaleActiveSession(teenUserId, endedAt = nowISO()) {
  const active = getActiveSession(teenUserId);
  if (!active || !isActiveSessionStale(active, new Date(endedAt))) {
    return null;
  }
  return stopSession(active.id, endedAt);
}

export function getDraftSession(teenUserId) {
  const db = getDb();
  return (
    db
      .select()
      .from(sessions)
      .where(and(eq(sessions.teenUserId, teenUserId), eq(sessions.status, 'draft')))
      .get() ?? null
  );
}

export function stopSession(sessionId, endedAt = nowISO()) {
  const db = getDb();
  const now = nowISO();
  db.update(sessions)
    .set({ status: 'draft', endedAt, updatedAt: now })
    .where(eq(sessions.id, sessionId))
    .run();
  return getSessionById(sessionId);
}

export function getSessionById(sessionId) {
  const db = getDb();
  return db.select().from(sessions).where(eq(sessions.id, sessionId)).get() ?? null;
}

export function discardDraft(sessionId) {
  const db = getDb();
  db.delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.status, 'draft')))
    .run();
}

export function resumeSession(sessionId) {
  const db = getDb();
  const now = nowISO();
  db.update(sessions)
    .set({ status: 'active', endedAt: null, updatedAt: now })
    .where(eq(sessions.id, sessionId))
    .run();
  return getSessionById(sessionId);
}

export function reopenSavedSession(sessionId) {
  const db = getDb();
  const now = nowISO();
  db.update(sessions)
    .set({
      status: 'draft',
      requestHash: null,
      payloadJson: null,
      updatedAt: now,
    })
    .where(and(eq(sessions.id, sessionId), eq(sessions.status, 'saved')))
    .run();
  return getSessionById(sessionId);
}

export function restoreSavedSession(sessionId, backup) {
  const db = getDb();
  const now = nowISO();
  db.update(sessions)
    .set({
      status: 'saved',
      requestHash: backup.requestHash,
      payloadJson: backup.payloadJson,
      notes: backup.notes ?? null,
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId))
    .run();
  return getSessionById(sessionId);
}

export async function saveSession(sessionId, { notes, savedByUserId }) {
  const session = getSessionById(sessionId);
  if (!session || session.status !== 'draft') {
    throw new Error('Session must be in draft status to save');
  }
  const mins = durationMinutes(session.startedAt, session.endedAt);
  const dayNight = classifyDayNight(session.startedAt);
  const payload = buildSavePayload({
    sessionId: session.id,
    stateCode: session.stateCode,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationMinutes: mins,
    dayNight,
    notes: notes ?? session.notes ?? null,
    savedByUserId,
  });
  const requestHash = await computeRequestHash(payload);
  const canonical = stableStringify(payload);
  const now = nowISO();
  getDb()
    .update(sessions)
    .set({
      status: 'saved',
      durationMinutes: mins,
      dayNight,
      notes: notes ?? session.notes ?? null,
      requestHash,
      payloadJson: canonical,
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId))
    .run();
  enqueueOutbox('session_saved', { sessionId, requestHash });
  return getSessionById(sessionId);
}

export function softDeleteSession(sessionId) {
  const db = getDb();
  const now = nowISO();
  db.update(sessions)
    .set({ status: 'deleted', deletedAt: now, updatedAt: now })
    .where(eq(sessions.id, sessionId))
    .run();
}

export function listSavedSessions(teenUserId) {
  const db = getDb();
  return db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.teenUserId, teenUserId),
        eq(sessions.status, 'saved'),
        isNull(sessions.deletedAt),
      ),
    )
    .orderBy(desc(sessions.startedAt))
    .all();
}

export function getProgress(teenUserId) {
  const db = getDb();
  const row = db
    .select({
      totalMinutes: sql`COALESCE(SUM(${sessions.durationMinutes}), 0)`,
      nightMinutes: sql`COALESCE(SUM(CASE WHEN ${sessions.dayNight} = 'night' THEN ${sessions.durationMinutes} ELSE 0 END), 0)`,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.teenUserId, teenUserId),
        eq(sessions.status, 'saved'),
        isNull(sessions.deletedAt),
      ),
    )
    .get();
  const totalMinutes = Number(row?.totalMinutes ?? 0);
  const nightMinutes = Number(row?.nightMinutes ?? 0);
  return { totalMinutes, nightMinutes, dayMinutes: totalMinutes - nightMinutes };
}

export function enqueueOutbox(operation, payload) {
  const db = getDb();
  db.insert(outbox)
    .values({
      id: generateId(),
      operation,
      payloadJson: JSON.stringify(payload),
      createdAt: nowISO(),
      syncedAt: null,
    })
    .run();
}

export function isProfileComplete(user) {
  return Boolean(
    user?.legalName &&
      user?.dateOfBirth &&
      user?.stateCode &&
      user?.permitIssueDate,
  );
}
