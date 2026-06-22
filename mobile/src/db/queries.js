import { eq, and, or, isNull, desc, asc, sql, inArray } from 'drizzle-orm';
import { getDb } from './client';
import { users, sessions, outbox, links, settings, submissions, approvals, userAliases, sessionLocationSamples } from './schema';
import { generateId, nowISO, durationMinutes } from '../utils/time';
import { computeDayNightMinutes } from '../utils/dayNight';
import { computeRoadCategoryMinutes } from '../utils/roadCategory';
import { computeInvalidSessionIds } from '../utils/sessionTimeValidation';
import { buildSubmitPayload, computeRequestHash, stableSubmitStringify } from '../utils/hash';
import { IL_RULES } from '../config/states/IL';
import { clearHeaderThemePreference } from '../theme/headerTheme';
import { clearAdultSelectedTeen } from '../lib/adultSelectedTeen';
import { exportIncludeRoadCategoryKey } from '../lib/exportPreferences';
import { hasLegalName, hasDisplayName, clampName, MAX_NICKNAME_LENGTH } from '../utils/names';

/** Derive duration and night minutes from session start/end (day = duration - night). */
export function recomputeSessionTiming(startedAt, endedAt) {
  const durationMinutesValue = durationMinutes(startedAt, endedAt);
  const { nightMinutes } = computeDayNightMinutes(startedAt, endedAt);
  return {
    durationMinutes: durationMinutesValue,
    nightMinutes,
  };
}

/** Derive highway minutes from foreground GPS samples (null when coverage insufficient). */
export function recomputeSessionRoadCategory(sessionId, startedAt, endedAt) {
  if (countLocationSamplesForSession(sessionId) === 0) {
    return { highwayRoadMinutes: null };
  }
  const samples = listLocationSamplesForSession(sessionId);
  return computeRoadCategoryMinutes(startedAt, endedAt, samples);
}

export function recomputeSessionFields(sessionId, startedAt, endedAt) {
  return {
    ...recomputeSessionTiming(startedAt, endedAt),
    ...recomputeSessionRoadCategory(sessionId, startedAt, endedAt),
  };
}

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
    displayName: profile.displayName ?? '',
    email: profile.email ?? null,
    dateOfBirth: profile.dateOfBirth ?? null,
    stateCode: profile.stateCode ?? 'IL',
    permitIssueDate: profile.permitIssueDate ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: profile.updatedAt ?? now,
  };
  if (existing) {
    db.update(users).set(row).where(eq(users.id, profile.id)).run();
  } else {
    db.insert(users).values(row).run();
  }
  return row;
}

export function listSessionIdsForTeen(teenUserId) {
  const db = getDb();
  return db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.teenUserId, teenUserId))
    .all()
    .map((row) => row.id);
}

function deleteOutboxForUser(userId, sessionIds) {
  const db = getDb();
  db.delete(outbox).where(eq(outbox.userId, userId)).run();

  if (!sessionIds.length) return;

  const sessionIdSet = new Set(sessionIds);
  const rows = db.select().from(outbox).all();
  for (const row of rows) {
    if (row.userId) continue;
    try {
      const payload = JSON.parse(row.payloadJson);
      if (payload.sessionId && sessionIdSet.has(payload.sessionId)) {
        db.delete(outbox).where(eq(outbox.id, row.id)).run();
      }
    } catch {
      // ignore malformed outbox payloads
    }
  }
}

export function deleteAllUserData(userId) {
  const db = getDb();
  const sessionIds = listSessionIdsForTeen(userId);
  deleteOutboxForUser(userId, sessionIds);
  if (sessionIds.length) {
    db.delete(submissions).where(inArray(submissions.sessionId, sessionIds)).run();
    db.delete(approvals).where(inArray(approvals.sessionId, sessionIds)).run();
    db.delete(sessionLocationSamples).where(inArray(sessionLocationSamples.sessionId, sessionIds)).run();
  }
  db.delete(approvals).where(eq(approvals.approvedByUserId, userId)).run();
  db.delete(submissions).where(eq(submissions.submittedByUserId, userId)).run();
  db.delete(sessions).where(eq(sessions.teenUserId, userId)).run();
  db.delete(links).where(or(eq(links.teenUserId, userId), eq(links.adultUserId, userId))).run();
  db.delete(userAliases).where(or(eq(userAliases.ownerUserId, userId), eq(userAliases.targetUserId, userId))).run();
  db.delete(settings).where(eq(settings.key, roleChosenKey(userId))).run();
  db.delete(settings).where(eq(settings.key, linkInviteDeferredKey(userId))).run();
  db.delete(settings).where(eq(settings.key, exportIncludeRoadCategoryKey(userId))).run();
  db.delete(users).where(eq(users.id, userId)).run();
  clearHeaderThemePreference(userId);
  clearAdultSelectedTeen(userId);
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
    nightMinutes: null,
    highwayRoadMinutes: null,
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

/** Create a draft session from manually entered times (no GPS / active session). */
export function createManualDraftSession(
  teenUserId,
  { startedAt, endedAt, notes = null, stateCode = 'IL' },
) {
  if (!startedAt || !endedAt) {
    throw new Error('Start and end times are required');
  }
  if (new Date(endedAt).getTime() <= new Date(startedAt).getTime()) {
    throw new Error('End time must be after start time');
  }
  if (new Date(endedAt).getTime() > Date.now()) {
    throw new Error('End time cannot be in the future');
  }

  const db = getDb();
  const now = nowISO();
  const id = generateId();
  const timing = recomputeSessionFields(id, startedAt, endedAt);
  const row = {
    id,
    teenUserId,
    stateCode,
    status: 'draft',
    startedAt,
    endedAt,
    durationMinutes: timing.durationMinutes,
    nightMinutes: timing.nightMinutes,
    highwayRoadMinutes: timing.highwayRoadMinutes,
    notes,
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

/** Default last-hour window for a new manual draft. */
export function createDefaultManualDraftSession(teenUserId, stateCode = 'IL') {
  const end = new Date();
  end.setSeconds(0, 0);
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  return createManualDraftSession(teenUserId, {
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    stateCode,
  });
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
  const session = getSessionById(sessionId);
  if (!session) return null;
  const timing = recomputeSessionFields(sessionId, session.startedAt, endedAt);
  const db = getDb();
  const now = nowISO();
  db.update(sessions)
    .set({
      status: 'draft',
      endedAt,
      durationMinutes: timing.durationMinutes,
      nightMinutes: timing.nightMinutes,
      highwayRoadMinutes: timing.highwayRoadMinutes,
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId))
    .run();
  return getSessionById(sessionId);
}

export function getSessionById(sessionId) {
  const db = getDb();
  return db.select().from(sessions).where(eq(sessions.id, sessionId)).get() ?? null;
}

export function insertLocationSample({
  sessionId,
  recordedAt = nowISO(),
  latitude,
  longitude,
  speedMps = null,
  accuracyM = null,
  roadCategory = null,
}) {
  const db = getDb();
  const row = {
    id: generateId(),
    sessionId,
    recordedAt,
    latitude: String(latitude),
    longitude: String(longitude),
    speedMps: speedMps == null ? null : String(speedMps),
    accuracyM: accuracyM == null ? null : String(accuracyM),
    roadCategory,
  };
  db.insert(sessionLocationSamples).values(row).run();
  return row;
}

export function listLocationSamplesForSession(sessionId) {
  const db = getDb();
  return db
    .select()
    .from(sessionLocationSamples)
    .where(eq(sessionLocationSamples.sessionId, sessionId))
    .orderBy(asc(sessionLocationSamples.recordedAt))
    .all();
}

export function countLocationSamplesForSession(sessionId) {
  const db = getDb();
  const row = db
    .select({ count: sql`COUNT(*)` })
    .from(sessionLocationSamples)
    .where(eq(sessionLocationSamples.sessionId, sessionId))
    .get();
  return Number(row?.count ?? 0);
}

export function discardDraft(sessionId) {
  const db = getDb();
  db.delete(sessionLocationSamples).where(eq(sessionLocationSamples.sessionId, sessionId)).run();
  db.delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.status, 'draft')))
    .run();
}

export function resumeSession(sessionId) {
  const db = getDb();
  const now = nowISO();
  db.update(sessions)
    .set({
      status: 'active',
      endedAt: null,
      durationMinutes: null,
      nightMinutes: null,
      highwayRoadMinutes: null,
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId))
    .run();
  return getSessionById(sessionId);
}

export function reopenSavedSession(sessionId) {
  const db = getDb();
  const now = nowISO();
  supersedeSubmissionsForSession(sessionId);
  clearOutboxForSession(sessionId);
  db.update(sessions)
    .set({
      status: 'draft',
      requestHash: null,
      payloadJson: null,
      updatedAt: now,
    })
    .where(and(eq(sessions.id, sessionId), eq(sessions.status, 'saved')))
    .run();
  const teenUserId = getSessionById(sessionId)?.teenUserId;
  if (teenUserId) recomputeSessionTimeValidation(teenUserId);
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
      startedAt: backup.startedAt,
      endedAt: backup.endedAt,
      durationMinutes: backup.durationMinutes,
      nightMinutes: backup.nightMinutes,
      highwayRoadMinutes: backup.highwayRoadMinutes,
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId))
    .run();
  const teenUserId = getSessionById(sessionId)?.teenUserId;
  if (teenUserId) recomputeSessionTimeValidation(teenUserId);
  return getSessionById(sessionId);
}

/** Recompute time_invalid for all saved sessions for a teen (overlap detection). */
export function recomputeSessionTimeValidation(teenUserId) {
  const saved = listSavedSessions(teenUserId);
  const invalidIds = computeInvalidSessionIds(saved);
  const db = getDb();
  const now = nowISO();
  for (const session of saved) {
    const wasInvalid = Boolean(session.timeInvalid);
    const shouldBeInvalid = invalidIds.has(session.id);
    if (wasInvalid !== shouldBeInvalid) {
      db.update(sessions)
        .set({ timeInvalid: shouldBeInvalid, updatedAt: now })
        .where(eq(sessions.id, session.id))
        .run();
      if (wasInvalid && !shouldBeInvalid) {
        enqueueSubmissionIfNeverSynced(session.id);
      }
    }
  }
}

/** Update draft session fields; recomputes duration and day/night from times. */
export function updateDraftSessionFields(
  sessionId,
  { startedAt, endedAt, notes } = {},
) {
  const session = getSessionById(sessionId);
  if (!session || session.status !== 'draft') {
    throw new Error('Session must be in draft status to edit');
  }

  const nextStart = startedAt ?? session.startedAt;
  const nextEnd = endedAt ?? session.endedAt;
  if (!nextStart || !nextEnd) {
    throw new Error('Start and end times are required');
  }
  if (new Date(nextEnd).getTime() <= new Date(nextStart).getTime()) {
    throw new Error('End time must be after start time');
  }

  const timing = recomputeSessionFields(sessionId, nextStart, nextEnd);
  const db = getDb();
  db.update(sessions)
    .set({
      startedAt: nextStart,
      endedAt: nextEnd,
      durationMinutes: timing.durationMinutes,
      nightMinutes: timing.nightMinutes,
      highwayRoadMinutes: timing.highwayRoadMinutes,
      ...(notes !== undefined ? { notes } : {}),
      updatedAt: nowISO(),
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
  const timing = recomputeSessionFields(sessionId, session.startedAt, session.endedAt);
  const payload = buildSubmitPayload({
    sessionId: session.id,
    stateCode: session.stateCode,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    endedBy,
    activeSupervisorId: activeSupervisorId ?? session.activeSupervisorId ?? null,
    activeSupervisorJoinedAt,
    durationMinutes: timing.durationMinutes,
    nightMinutes: timing.nightMinutes,
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
      durationMinutes: timing.durationMinutes,
      nightMinutes: timing.nightMinutes,
      highwayRoadMinutes: timing.highwayRoadMinutes,
      notes: notes ?? session.notes ?? null,
      requestHash,
      payloadJson: canonical,
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId))
    .run();
  recomputeSessionTimeValidation(session.teenUserId);
  const afterSave = getSessionById(sessionId);
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
  if (!afterSave?.timeInvalid) {
    enqueueOutbox('session_submitted', { sessionId, requestHash }, submittedByUserId);
  }
  return afterSave;
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

export function remoteSyncAtKey(userId, teenUserId = null) {
  if (teenUserId && teenUserId !== userId) {
    return `remote_sync_at_${userId}_for_${teenUserId}`;
  }
  return `remote_sync_at_${userId}`;
}

export function getRemoteSyncAt(userId, teenUserId = null) {
  return getSettingValue(remoteSyncAtKey(userId, teenUserId));
}

export function setRemoteSyncAt(userId, iso, teenUserId = null) {
  setSettingValue(remoteSyncAtKey(userId, teenUserId), iso);
}

/** Merge a remote session row; skips when local outbox still pending for this session. */
export function upsertSessionFromRemote(remoteRow) {
  if (!remoteRow?.id) return null;

  if (hasUnsyncedSubmissionOutbox(remoteRow.id)) {
    return getSessionById(remoteRow.id);
  }

  const db = getDb();
  const now = nowISO();
  const existing = getSessionById(remoteRow.id);

  if (
    existing &&
    (existing.status === 'active' || existing.status === 'draft') &&
    (remoteRow.status === 'saved' || remoteRow.status === 'deleted')
  ) {
    return existing;
  }

  const row = {
    id: remoteRow.id,
    teenUserId: remoteRow.teenUserId,
    stateCode: remoteRow.stateCode ?? 'IL',
    status: remoteRow.status,
    startedAt: remoteRow.startedAt,
    endedAt: remoteRow.endedAt ?? null,
    durationMinutes: remoteRow.durationMinutes ?? null,
    nightMinutes: remoteRow.nightMinutes ?? null,
    highwayRoadMinutes: existing?.highwayRoadMinutes ?? null,
    notes: remoteRow.notes ?? null,
    requestHash: remoteRow.requestHash ?? null,
    payloadJson: remoteRow.payloadJson ?? null,
    activeSupervisorId: remoteRow.activeSupervisorId ?? null,
    deletedAt: remoteRow.deletedAt ?? null,
    timeInvalid: false,
    createdAt: remoteRow.createdAt ?? existing?.createdAt ?? now,
    updatedAt: remoteRow.updatedAt ?? now,
  };

  if (!existing) {
    db.insert(sessions).values(row).run();
  } else {
    db.update(sessions).set(row).where(eq(sessions.id, remoteRow.id)).run();
  }
  return getSessionById(remoteRow.id);
}

export function upsertSubmissionFromRemote(submission) {
  if (!submission?.requestHash) return null;

  if (hasUnsyncedSubmissionOutbox(submission.sessionId)) {
    return getSubmissionForSession(submission.sessionId);
  }

  const db = getDb();
  const existing = getSubmissionByHash(submission.requestHash);
  const row = {
    requestHash: submission.requestHash,
    sessionId: submission.sessionId,
    payloadJson: submission.payloadJson,
    submittedAt: submission.submittedAt,
    submittedByUserId: submission.submittedByUserId,
    superseded: submission.superseded ?? false,
  };

  if (existing) {
    db.update(submissions).set(row).where(eq(submissions.requestHash, submission.requestHash)).run();
  } else {
    db.insert(submissions).values(row).run();
  }
  return getSubmissionByHash(submission.requestHash);
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

export function discardSubmittedSession(sessionId) {
  const session = getSessionById(sessionId);
  if (!session || session.status !== 'saved') {
    throw new Error('Only submitted sessions can be discarded');
  }
  if (session.requestHash && getApprovalForHash(session.requestHash)) {
    throw new Error('Approved sessions cannot be discarded this way');
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
  const before = getSessionById(sessionId);
  const now = nowISO();
  db.update(sessions)
    .set({ status: 'deleted', deletedAt: now, updatedAt: now })
    .where(eq(sessions.id, sessionId))
    .run();
  if (before?.teenUserId) recomputeSessionTimeValidation(before.teenUserId);
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

/** Saved sessions with supervisor approval, excluding overlap-invalid rows (for export). */
export function listApprovedSessionsForExport(teenUserId) {
  return listSavedSessions(teenUserId).filter((session) => {
    if (session.timeInvalid || !session.requestHash) return false;
    return Boolean(getApprovalForHash(session.requestHash));
  });
}

export function hasApprovedExportableSession(teenUserId) {
  return listApprovedSessionsForExport(teenUserId).length > 0;
}

export function getProgress(teenUserId) {
  const db = getDb();
  const row = db
    .select({
      totalMinutes: sql`COALESCE(SUM(${sessions.durationMinutes}), 0)`,
      nightMinutes: sql`COALESCE(SUM(${sessions.nightMinutes}), 0)`,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.teenUserId, teenUserId),
        eq(sessions.status, 'saved'),
        eq(sessions.timeInvalid, false),
        isNull(sessions.deletedAt),
      ),
    )
    .get();
  const totalMinutes = Number(row?.totalMinutes ?? 0);
  const nightMinutes = Number(row?.nightMinutes ?? 0);
  return { totalMinutes, nightMinutes, dayMinutes: totalMinutes - nightMinutes };
}

export function enqueueOutbox(operation, payload, userId) {
  const db = getDb();
  db.insert(outbox)
    .values({
      id: generateId(),
      operation,
      payloadJson: JSON.stringify(payload),
      userId,
      createdAt: nowISO(),
      syncedAt: null,
    })
    .run();
}

export function listPendingOutboxRows() {
  const db = getDb();
  return db
    .select()
    .from(outbox)
    .where(isNull(outbox.syncedAt))
    .orderBy(asc(outbox.createdAt))
    .all();
}

/** Pending outbox rows for the signed-in user (ignores other accounts on this device). */
export function listPendingOutboxRowsForUser(userId) {
  if (!userId) return [];
  return listPendingOutboxRows().filter((row) => {
    if (row.userId === userId) return true;
    if (row.userId) return false;
    try {
      const payload = JSON.parse(row.payloadJson);
      if (row.operation === 'session_submitted') {
        const session = getSessionById(payload?.sessionId);
        return session?.teenUserId === userId;
      }
    } catch {
      // ignore malformed payloads
    }
    return false;
  });
}

export function countPendingOutbox() {
  return listPendingOutboxRows().length;
}

export function markOutboxRowSynced(outboxId) {
  const db = getDb();
  db.update(outbox).set({ syncedAt: nowISO() }).where(eq(outbox.id, outboxId)).run();
}

export function hasUnsyncedSubmissionOutbox(sessionId) {
  const db = getDb();
  const rows = db
    .select()
    .from(outbox)
    .where(and(eq(outbox.operation, 'session_submitted'), isNull(outbox.syncedAt)))
    .all();
  return rows.some((row) => {
    try {
      const payload = JSON.parse(row.payloadJson);
      return payload.sessionId === sessionId;
    } catch {
      return false;
    }
  });
}

export function wasSubmissionEverSynced(sessionId) {
  const db = getDb();
  const rows = db.select().from(outbox).where(eq(outbox.operation, 'session_submitted')).all();
  return rows.some((row) => {
    if (!row.syncedAt) return false;
    try {
      const payload = JSON.parse(row.payloadJson);
      return payload.sessionId === sessionId;
    } catch {
      return false;
    }
  });
}

function enqueueSubmissionIfNeverSynced(sessionId) {
  const session = getSessionById(sessionId);
  const submission = getSubmissionForSession(sessionId);
  if (!session || session.status !== 'saved' || session.timeInvalid) return;
  if (!submission || submission.superseded) return;
  if (hasUnsyncedSubmissionOutbox(sessionId) || wasSubmissionEverSynced(sessionId)) return;
  enqueueOutbox(
    'session_submitted',
    { sessionId, requestHash: submission.requestHash },
    submission.submittedByUserId,
  );
}

export function markSubmissionOutboxSynced(sessionId) {
  const db = getDb();
  const rows = db
    .select()
    .from(outbox)
    .where(and(eq(outbox.operation, 'session_submitted'), isNull(outbox.syncedAt)))
    .all();
  const now = nowISO();
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payloadJson);
      if (payload.sessionId === sessionId) {
        db.update(outbox).set({ syncedAt: now }).where(eq(outbox.id, row.id)).run();
      }
    } catch {
      // ignore malformed outbox payloads
    }
  }
}

export function clearOutboxForSession(sessionId) {
  const db = getDb();
  const rows = db.select().from(outbox).all();
  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payloadJson);
      if (payload.sessionId === sessionId) {
        db.delete(outbox).where(eq(outbox.id, row.id)).run();
      }
    } catch {
      // ignore malformed outbox payloads
    }
  }
}

export function isProfileComplete(user) {
  return Boolean(
    hasLegalName(user) &&
      hasDisplayName(user) &&
      user?.dateOfBirth &&
      user?.stateCode &&
      user?.permitIssueDate,
  );
}

export function isAdultProfileComplete(user) {
  return Boolean(
    user?.role === 'adult' && hasLegalName(user) && hasDisplayName(user),
  );
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
  const hasName = Boolean(
    remoteProfile.display_name?.trim() || remoteProfile.legal_name?.trim(),
  );
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

export function getUserAlias(ownerUserId, targetUserId) {
  const db = getDb();
  return (
    db
      .select()
      .from(userAliases)
      .where(
        and(eq(userAliases.ownerUserId, ownerUserId), eq(userAliases.targetUserId, targetUserId)),
      )
      .get() ?? null
  );
}

export function listUserAliasesForOwner(ownerUserId) {
  const db = getDb();
  return db.select().from(userAliases).where(eq(userAliases.ownerUserId, ownerUserId)).all();
}

export function upsertUserAliasLocal(ownerUserId, targetUserId, nickname, syncStatus = 'synced') {
  const db = getDb();
  const row = {
    ownerUserId,
    targetUserId,
    nickname: clampName(nickname, MAX_NICKNAME_LENGTH),
    syncStatus,
  };
  const existing = getUserAlias(ownerUserId, targetUserId);
  if (existing) {
    db.update(userAliases)
      .set(row)
      .where(
        and(eq(userAliases.ownerUserId, ownerUserId), eq(userAliases.targetUserId, targetUserId)),
      )
      .run();
  } else {
    db.insert(userAliases).values(row).run();
  }
  return row;
}

export function deleteUserAliasLocal(ownerUserId, targetUserId) {
  const db = getDb();
  db.delete(userAliases)
    .where(
      and(eq(userAliases.ownerUserId, ownerUserId), eq(userAliases.targetUserId, targetUserId)),
    )
    .run();
}

export function listPendingUserAliasSync(ownerUserId) {
  const db = getDb();
  return db
    .select()
    .from(userAliases)
    .where(eq(userAliases.ownerUserId, ownerUserId))
    .all()
    .filter((row) => row.syncStatus !== 'synced');
}

export function markUserAliasSynced(ownerUserId, targetUserId) {
  const db = getDb();
  db.update(userAliases)
    .set({ syncStatus: 'synced' })
    .where(
      and(eq(userAliases.ownerUserId, ownerUserId), eq(userAliases.targetUserId, targetUserId)),
    )
    .run();
}
