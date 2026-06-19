import { eq, and, or, isNull, desc, sql } from 'drizzle-orm';
import { getDb } from './client';
import { users, sessions, outbox, links, settings, submissions, approvals } from './schema';
import { generateId, nowISO, durationMinutes } from '../utils/time';
import { classifyDayNight } from '../utils/dayNight';
import { buildSubmitPayload, computeRequestHash, stableSubmitStringify } from '../utils/hash';
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
  db.delete(links).where(or(eq(links.teenUserId, userId), eq(links.adultUserId, userId))).run();
  db.delete(settings).where(eq(settings.key, roleChosenKey(userId))).run();
  db.delete(settings).where(eq(settings.key, linkInviteDeferredKey(userId))).run();
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
  supersedeSubmissionsForSession(sessionId);
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

export async function submitSession(
  sessionId,
  { notes, submittedByUserId, endedBy = 'teen', activeSupervisorId = null, activeSupervisorJoinedAt = null },
) {
  const session = getSessionById(sessionId);
  if (!session || session.status !== 'draft') {
    throw new Error('Session must be in draft status to submit');
  }
  const mins = durationMinutes(session.startedAt, session.endedAt);
  const dayNight = classifyDayNight(session.startedAt);
  const payload = buildSubmitPayload({
    sessionId: session.id,
    stateCode: session.stateCode,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    endedBy,
    activeSupervisorId: activeSupervisorId ?? session.activeSupervisorId ?? null,
    activeSupervisorJoinedAt,
    durationMinutes: mins,
    dayNight,
    notes: notes ?? session.notes ?? null,
    submittedByUserId,
  });
  const requestHash = await computeRequestHash(payload);
  const canonical = stableSubmitStringify(payload);
  const now = nowISO();
  const db = getDb();
  db.update(sessions)
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
  supersedeSubmissionsForSession(sessionId);
  db.insert(submissions)
    .values({
      requestHash,
      sessionId,
      payloadJson: canonical,
      submittedAt: payload.submittedAt,
      submittedByUserId,
      superseded: false,
    })
    .run();
  enqueueOutbox('session_submitted', { sessionId, requestHash });
  return getSessionById(sessionId);
}

/** @deprecated Use submitSession — kept for tests migrating from Phase 1 naming */
export async function saveSession(sessionId, opts) {
  return submitSession(sessionId, {
    notes: opts.notes,
    submittedByUserId: opts.savedByUserId ?? opts.submittedByUserId,
  });
}

export function supersedeSubmissionsForSession(sessionId) {
  getDb()
    .update(submissions)
    .set({ superseded: true })
    .where(eq(submissions.sessionId, sessionId))
    .run();
}

export function getSubmissionForSession(sessionId) {
  const db = getDb();
  return (
    db
      .select()
      .from(submissions)
      .where(and(eq(submissions.sessionId, sessionId), eq(submissions.superseded, false)))
      .get() ?? null
  );
}

export function getSubmissionByHash(requestHash) {
  const db = getDb();
  return db.select().from(submissions).where(eq(submissions.requestHash, requestHash)).get() ?? null;
}

export function getApprovalForHash(requestHash) {
  const db = getDb();
  return db.select().from(approvals).where(eq(approvals.requestHash, requestHash)).get() ?? null;
}

export function getLatestApprovalForSession(sessionId) {
  const db = getDb();
  return (
    db
      .select()
      .from(approvals)
      .where(eq(approvals.sessionId, sessionId))
      .orderBy(desc(approvals.approvedAt))
      .get() ?? null
  );
}

export function upsertApproval(approval) {
  const db = getDb();
  const existing = db.select().from(approvals).where(eq(approvals.id, approval.id)).get();
  const row = {
    id: approval.id,
    requestHash: approval.requestHash,
    sessionId: approval.sessionId,
    approvedByUserId: approval.approvedByUserId,
    approvedAt: approval.approvedAt,
    joinedSession: approval.joinedSession ?? null,
    supervisorInVehicleName: approval.supervisorInVehicleName ?? null,
    approverPresent: approval.approverPresent ?? null,
  };
  if (existing) {
    db.update(approvals).set(row).where(eq(approvals.id, approval.id)).run();
  } else {
    db.insert(approvals).values(row).run();
  }
  return row;
}

export function returnSessionForRevision(sessionId) {
  const session = getSessionById(sessionId);
  if (!session || session.status !== 'saved') {
    throw new Error('Only saved sessions can be returned for revision');
  }
  if (session.requestHash && getApprovalForHash(session.requestHash)) {
    throw new Error('Approved sessions cannot be returned for revision');
  }
  supersedeSubmissionsForSession(sessionId);
  const now = nowISO();
  getDb()
    .update(sessions)
    .set({
      requestHash: null,
      payloadJson: null,
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId))
    .run();
  return getSessionById(sessionId);
}

/** Restore a declined draft (legacy) back to saved for dashboard listing. */
export function healDraftAfterDecline(sessionId) {
  const session = getSessionById(sessionId);
  if (!session || session.status !== 'draft' || !session.endedAt) {
    return null;
  }
  if (session.requestHash && getApprovalForHash(session.requestHash)) {
    return null;
  }
  supersedeSubmissionsForSession(sessionId);
  const now = nowISO();
  getDb()
    .update(sessions)
    .set({
      status: 'saved',
      requestHash: null,
      payloadJson: null,
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId))
    .run();
  return getSessionById(sessionId);
}

export function withdrawSubmission(sessionId) {
  const session = getSessionById(sessionId);
  if (!session || session.status !== 'saved') {
    throw new Error('Only submitted sessions can be withdrawn');
  }
  if (session.requestHash && getApprovalForHash(session.requestHash)) {
    throw new Error('Approved sessions cannot be withdrawn');
  }
  supersedeSubmissionsForSession(sessionId);
  softDeleteSession(sessionId);
  return getSessionById(sessionId);
}

export function getSessionApprovalContext(sessionId) {
  const session = getSessionById(sessionId);
  if (!session) return null;
  return {
    session,
    submission: getSubmissionForSession(sessionId),
    approval: session.requestHash ? getApprovalForHash(session.requestHash) : null,
    latestApproval: getLatestApprovalForSession(sessionId),
  };
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

export function isAdultProfileComplete(user) {
  return Boolean(user?.role === 'adult' && user?.legalName?.trim());
}

export function isProfileCompleteForRole(user) {
  if (!user?.role) return false;
  if (user.role === 'adult') return isAdultProfileComplete(user);
  return isProfileComplete(user);
}

function roleChosenKey(userId) {
  return `role_chosen_${userId}`;
}

function linkInviteDeferredKey(userId) {
  return `link_invite_deferred_${userId}`;
}

export function getSettingValue(key) {
  const db = getDb();
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export function setSettingValue(key, value) {
  const db = getDb();
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    db.update(settings).set({ value }).where(eq(settings.key, key)).run();
  } else {
    db.insert(settings).values({ key, value }).run();
  }
}

export function isLinkInviteDeferred(userId) {
  const db = getDb();
  const row = db.select().from(settings).where(eq(settings.key, linkInviteDeferredKey(userId))).get();
  return row?.value === '1';
}

export function setLinkInviteDeferred(userId, deferred) {
  const db = getDb();
  const key = linkInviteDeferredKey(userId);
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (deferred) {
    if (existing) {
      db.update(settings).set({ value: '1' }).where(eq(settings.key, key)).run();
    } else {
      db.insert(settings).values({ key, value: '1' }).run();
    }
    return;
  }
  if (existing) {
    db.delete(settings).where(eq(settings.key, key)).run();
  }
}

export function isRoleChosen(userId) {
  const db = getDb();
  const row = db.select().from(settings).where(eq(settings.key, roleChosenKey(userId))).get();
  return row?.value === '1';
}

export function setRoleChosen(userId) {
  const db = getDb();
  const key = roleChosenKey(userId);
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    db.update(settings).set({ value: '1' }).where(eq(settings.key, key)).run();
  } else {
    db.insert(settings).values({ key, value: '1' }).run();
  }
}

export function ensureRoleChosenForLegacyProfile(user) {
  if (!user?.id) return;
  if (isRoleChosen(user.id)) return;
  if (user.role === 'teen' && isProfileComplete(user)) {
    setRoleChosen(user.id);
  }
}

export function maybeMarkRoleChosenFromRemote(userId, remoteProfile) {
  if (!remoteProfile || isRoleChosen(userId)) return;
  const role = remoteProfile.role ?? 'teen';
  const hasName = Boolean(remoteProfile.legal_name?.trim());
  if (role === 'adult' && hasName) {
    setRoleChosen(userId);
    return;
  }
  if (role === 'teen' && hasName && remoteProfile.date_of_birth && remoteProfile.permit_issue_date) {
    setRoleChosen(userId);
  }
}

export function upsertLink(link) {
  const db = getDb();
  const existing = db.select().from(links).where(eq(links.id, link.id)).get();
  const row = {
    id: link.id,
    teenUserId: link.teenUserId,
    adultUserId: link.adultUserId,
    status: link.status,
    createdAt: link.createdAt,
  };
  if (existing) {
    db.update(links).set(row).where(eq(links.id, link.id)).run();
  } else {
    db.insert(links).values(row).run();
  }
  return row;
}

export function getActiveLinksForUser(userId) {
  const db = getDb();
  return db
    .select()
    .from(links)
    .where(
      and(
        eq(links.status, 'active'),
        or(eq(links.teenUserId, userId), eq(links.adultUserId, userId)),
      ),
    )
    .all();
}

export function hasActiveLink(userId) {
  return getActiveLinksForUser(userId).length > 0;
}

export function deleteLink(linkId) {
  const db = getDb();
  db.delete(links).where(eq(links.id, linkId)).run();
}
