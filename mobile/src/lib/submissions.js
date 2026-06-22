import { getSupabase, isSupabaseConfigured } from './supabase';
import { getLocalNickname } from './userAliases';
import { casualLabel, firstTokenFromLegalName } from '../utils/names';
import {
  submitSession,
  getSubmissionForSession,
  getSubmissionByHash,
  upsertApproval,
  getUserById,
  discardSubmittedSession,
  returnSessionForRevision,
  healDraftAfterDecline,
  getSessionById,
  listSavedSessions,
  getApprovalForHash,
  getDraftSession,
  markSubmissionOutboxSynced,
  clearOutboxForSession,
  hasUnsyncedSubmissionOutbox,
  enqueueOutbox,
} from '../db/queries';
import { generateId, nowISO } from '../utils/time';
import { notifyApprovalPush, PUSH_EVENTS } from './approvalPush';
import { canUseRemoteWrite, getCachedCompatibility, assertRemoteWriteAllowed } from './compatibility';
import { isNetworkOnline, isNetworkFailureError } from './network';
import { legacyNightMinutes } from '../utils/dayNight';
import { withTeenSyncRetry, withAdultTeenSyncRetry } from './syncRetry';
import { fetchAndStoreTeenSyncWatermark } from './sessionSync';

function isRemoteWriteAllowed() {
  if (!isSupabaseConfigured()) return false;
  return canUseRemoteWrite(getCachedCompatibility());
}

export async function pushSubmittedSessionToRemote(sessionId, session, submission) {
  await withTeenSyncRetry(session.teenUserId, async (clientSyncAt) => {
    const { error } = await getSupabase().rpc('submit_session_for_approval', {
      p_client_sync_at: clientSyncAt,
      p_session: mapSessionToRemote(session),
      p_request_hash: submission.requestHash,
      p_payload_json: submission.payloadJson,
      p_submitted_at: submission.submittedAt,
    });
    if (error) throw error;
  });
  await notifyApprovalPush(PUSH_EVENTS.SESSION_SUBMITTED, {
    sessionId: session.id,
    requestHash: submission.requestHash,
  });
  markSubmissionOutboxSynced(sessionId);
  await fetchAndStoreTeenSyncWatermark(session.teenUserId, session.teenUserId);
}

function mapSessionToRemote(session) {
  return {
    id: session.id,
    teen_user_id: session.teenUserId,
    state_code: session.stateCode,
    status: session.status,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    duration_minutes: session.durationMinutes,
    night_minutes: session.nightMinutes,
    notes: session.notes,
    request_hash: session.requestHash,
    payload_json: session.payloadJson,
    active_supervisor_id: session.activeSupervisorId,
    deleted_at: session.deletedAt,
  };
}

function mapRemoteSession(row) {
  if (!row) return null;
  const durationMinutes = row.duration_minutes ?? row.durationMinutes ?? null;
  let nightMinutes = row.night_minutes ?? row.nightMinutes ?? null;
  if (nightMinutes == null && (row.day_night ?? row.dayNight)) {
    nightMinutes = legacyNightMinutes(row.day_night ?? row.dayNight, durationMinutes);
  }
  return {
    id: row.id,
    teenUserId: row.teen_user_id ?? row.teenUserId,
    startedAt: row.started_at ?? row.startedAt,
    endedAt: row.ended_at ?? row.endedAt,
    durationMinutes,
    nightMinutes,
    notes: row.notes,
    requestHash: row.request_hash ?? row.requestHash,
    status: row.status,
    deletedAt: row.deleted_at ?? row.deletedAt,
  };
}

function mapRemoteApproval(row) {
  return {
    id: row.id,
    requestHash: row.request_hash,
    sessionId: row.session_id,
    approvedByUserId: row.approved_by_user_id,
    approvedAt: row.approved_at,
    joinedSession: row.joined_session,
    supervisorInVehicleName: row.supervisor_in_vehicle_name,
    approverPresent: row.approver_present,
  };
}

async function requireAuthUserId() {
  const {
    data: { user },
    error,
  } = await getSupabase().auth.getUser();
  if (error || !user?.id) {
    throw new Error('Not signed in');
  }
  return user.id;
}

export async function syncSessionToRemote(session) {
  if (!isSupabaseConfigured()) return;
  const authUserId = await requireAuthUserId();
  const remote = mapSessionToRemote(session);
  remote.teen_user_id = authUserId;
  const { error } = await getSupabase().from('sessions').upsert(remote, { onConflict: 'id' });
  if (error) throw error;
}

export async function syncSubmissionToRemote(submission) {
  if (!isSupabaseConfigured()) return;
  const authUserId = await requireAuthUserId();
  const { error } = await getSupabase().from('submissions').upsert(
    {
      request_hash: submission.requestHash,
      session_id: submission.sessionId,
      payload_json: submission.payloadJson,
      submitted_at: submission.submittedAt,
      submitted_by_user_id: authUserId,
      superseded: submission.superseded,
    },
    { onConflict: 'request_hash' },
  );
  if (error) throw error;
}

export async function markSubmissionSupersededRemote(requestHash) {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabase()
    .from('submissions')
    .update({ superseded: true })
    .eq('request_hash', requestHash);
  if (error) throw error;
}

/** Mark all remote submission rows for a session superseded (before a new submit). */
export async function supersedeAllRemoteSubmissionsForSession(sessionId) {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabase()
    .from('submissions')
    .update({ superseded: true })
    .eq('session_id', sessionId);
  if (error) throw error;
}

export async function syncSessionReopenedForEdit(sessionId) {
  if (!isSupabaseConfigured()) return;
  const session = getSessionById(sessionId);
  if (!session) return;
  await supersedeAllRemoteSubmissionsForSession(sessionId);
  await syncSessionToRemote(session);
}

/** Save session to the local log only (counts toward progress). */
export async function saveSessionToLog(sessionId, opts) {
  return submitSession(sessionId, opts);
}

/**
 * Save locally and queue for supervisor approval when valid.
 * Remote push happens via outbox flush after inbound sync + validity recompute.
 * @returns {{ session: object; remoteSynced: boolean; pendingRemote?: boolean; pendingReason?: 'offline' | 'blocked'; timeInvalid?: boolean }}
 */
export async function submitSessionForApproval(sessionId, opts) {
  await submitSession(sessionId, opts);
  const updated = getSessionById(sessionId);
  const timeInvalid = Boolean(updated?.timeInvalid);

  if (timeInvalid) {
    return { session: updated, remoteSynced: false, timeInvalid: true };
  }

  const hasPendingOutbox = hasUnsyncedSubmissionOutbox(sessionId);
  if (!isSupabaseConfigured() || !hasPendingOutbox) {
    return { session: updated, remoteSynced: false, timeInvalid: false };
  }

  if (!isRemoteWriteAllowed()) {
    return {
      session: updated,
      remoteSynced: false,
      pendingRemote: true,
      pendingReason: 'blocked',
      timeInvalid: false,
    };
  }

  if (!(await isNetworkOnline())) {
    return {
      session: updated,
      remoteSynced: false,
      pendingRemote: true,
      pendingReason: 'offline',
      timeInvalid: false,
    };
  }

  const { flushOutbox } = require('./outboxSync');
  await flushOutbox();

  const synced = !hasUnsyncedSubmissionOutbox(sessionId);
  return {
    session: getSessionById(sessionId) ?? updated,
    remoteSynced: synced,
    pendingRemote: !synced,
    pendingReason: synced ? undefined : 'offline',
    timeInvalid: false,
  };
}

/** When remote writes are allowed, push a saved session that was queued offline. */
export async function sendSavedSessionForApproval(sessionId) {
  if (!isRemoteWriteAllowed()) {
    throw new Error('Update the app before sending for supervisor approval.');
  }
  const session = getSessionById(sessionId);
  const submission = getSubmissionForSession(sessionId);
  if (!session || session.status !== 'saved' || !submission) {
    throw new Error('This session is not ready to send for approval.');
  }
  if (session.timeInvalid) {
    throw new Error('Fix overlapping session times before sending for approval.');
  }
  if (!hasUnsyncedSubmissionOutbox(sessionId)) {
    throw new Error('This session was already sent for approval.');
  }
  if (!(await isNetworkOnline())) {
    throw new Error('Connect to the internet to send for supervisor approval.');
  }
  const { flushOutbox } = require('./outboxSync');
  await flushOutbox();
  if (hasUnsyncedSubmissionOutbox(sessionId)) {
    throw new Error('Could not send for approval. Try again when online.');
  }
  return getSessionById(sessionId);
}

export async function discardSessionSubmission(sessionId) {
  const submission = getSubmissionForSession(sessionId);
  const session = discardSubmittedSession(sessionId);
  clearOutboxForSession(sessionId);
  if (!isSupabaseConfigured() || !submission) {
    return session;
  }

  const payload = { sessionId: session.id, requestHash: submission.requestHash };
  const userId = session.teenUserId;

  if (!isRemoteWriteAllowed()) {
    enqueueOutbox('session_withdrawn', payload, userId);
    return session;
  }
  if (!(await isNetworkOnline())) {
    enqueueOutbox('session_withdrawn', payload, userId);
    return session;
  }
  try {
    await pushWithdrawToRemote(payload);
  } catch (e) {
    if (isNetworkFailureError(e)) {
      enqueueOutbox('session_withdrawn', payload, userId);
    } else {
      console.warn('Remote discard sync failed:', e.message);
    }
  }
  return session;
}

export async function pushWithdrawToRemote({ sessionId, requestHash }) {
  const current = getSessionById(sessionId);
  if (!current) return;

  await withTeenSyncRetry(current.teenUserId, async (clientSyncAt) => {
    const { error } = await getSupabase().rpc('withdraw_submission_synced', {
      p_client_sync_at: clientSyncAt,
      p_request_hash: requestHash,
      p_session: mapSessionToRemote(current),
    });
    if (error) throw error;
  });

  await notifyApprovalPush(PUSH_EVENTS.SESSION_DISCARDED, {
    sessionId,
    requestHash,
  });
  await fetchAndStoreTeenSyncWatermark(current.teenUserId, current.teenUserId);
}

async function assertSubmissionStillPending(sessionId, requestHash) {
  const supabase = getSupabase();
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('superseded')
    .eq('request_hash', requestHash)
    .eq('session_id', sessionId)
    .maybeSingle();
  if (subError) throw subError;
  if (!submission || submission.superseded) {
    throw new Error('This session is no longer pending approval.');
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from('sessions')
    .select('status, deleted_at')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!sessionRow || sessionRow.status === 'deleted' || sessionRow.deleted_at) {
    throw new Error('This session is no longer available.');
  }

  const { data: approval, error: approvalError } = await supabase
    .from('approvals')
    .select('request_hash')
    .eq('request_hash', requestHash)
    .maybeSingle();
  if (approvalError) throw approvalError;
  if (approval) {
    throw new Error('This session has already been approved.');
  }
}

/** Legal name shown on approved sessions (supervisor snapshot when stored). */
export async function resolveApproverName(approval) {
  const snapshot = approval?.supervisorInVehicleName?.trim();
  if (snapshot) return snapshot;
  if (approval?.approvedByUserId) {
    return fetchRemoteUserLegalName(approval.approvedByUserId);
  }
  return 'Supervisor';
}

export async function fetchRemoteUserLegalName(userId) {
  if (!isSupabaseConfigured()) {
    return getUserById(userId)?.legalName ?? 'Supervisor';
  }
  const { data, error } = await getSupabase()
    .from('users')
    .select('legal_name')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data?.legal_name?.trim()) {
    return getUserById(userId)?.legalName ?? 'Supervisor';
  }
  return data.legal_name.trim();
}

/** Casual label for a user as seen by viewerUserId (alias → display name). */
export async function fetchRemoteUserLabel(viewerUserId, targetUserId, fallback = 'Supervisor') {
  if (!targetUserId) return fallback;

  const local = getUserById(targetUserId);
  const localNickname = viewerUserId ? getLocalNickname(viewerUserId, targetUserId) : null;

  if (!isSupabaseConfigured()) {
    return casualLabel({
      nickname: localNickname,
      displayName: local?.displayName ?? firstTokenFromLegalName(local?.legalName),
      fallback,
    });
  }

  const { data, error } = await getSupabase()
    .from('users')
    .select('display_name, legal_name')
    .eq('id', targetUserId)
    .maybeSingle();

  let displayName = local?.displayName ?? '';
  let legalName = local?.legalName ?? '';
  if (!error && data) {
    legalName = data.legal_name?.trim() || legalName;
    displayName = data.display_name?.trim() || firstTokenFromLegalName(legalName);
  }

  let nickname = localNickname;
  if (viewerUserId && isSupabaseConfigured()) {
    const { data: aliasRow } = await getSupabase()
      .from('user_aliases')
      .select('nickname')
      .eq('owner_user_id', viewerUserId)
      .eq('target_user_id', targetUserId)
      .maybeSingle();
    if (aliasRow?.nickname?.trim()) {
      nickname = aliasRow.nickname.trim();
    }
  }

  return casualLabel({ nickname, displayName, fallback });
}

/** @deprecated Use fetchRemoteUserLabel or fetchRemoteUserLegalName. */
export async function fetchRemoteUserName(userId) {
  return fetchRemoteUserLegalName(userId);
}

export async function fetchPendingSubmissionsForAdult() {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from('submissions')
    .select(
      `
      request_hash,
      session_id,
      payload_json,
      submitted_at,
      submitted_by_user_id,
      superseded,
      sessions (
        id,
        teen_user_id,
        started_at,
        ended_at,
        duration_minutes,
        night_minutes,
        day_night,
        notes
      )
    `,
    )
    .eq('superseded', false);

  if (error) throw error;
  if (!rows?.length) return [];

  const hashes = rows.map((row) => row.request_hash);
  const { data: approvalRows, error: approvalError } = await supabase
    .from('approvals')
    .select('request_hash')
    .in('request_hash', hashes);
  if (approvalError) throw approvalError;

  const approvedHashes = new Set((approvalRows ?? []).map((row) => row.request_hash));
  const pending = rows.filter((row) => !approvedHashes.has(row.request_hash));

  const teenIds = [...new Set(pending.map((row) => row.sessions?.teen_user_id).filter(Boolean))];
  const teenNames = {};
  const {
    data: { user: authUser },
  } = await getSupabase().auth.getUser();
  const viewerId = authUser?.id;
  await Promise.all(
    teenIds.map(async (teenId) => {
      teenNames[teenId] = await fetchRemoteUserLabel(viewerId, teenId, 'Driver');
    }),
  );

  return pending
    .map((row) => ({
      requestHash: row.request_hash,
      sessionId: row.session_id,
      payloadJson: row.payload_json,
      submittedAt: row.submitted_at,
      submittedByUserId: row.submitted_by_user_id,
      session: mapRemoteSession(row.sessions),
      teenName: teenNames[row.sessions?.teen_user_id] ?? 'Driver',
    }))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export async function fetchApprovedSubmissionsForAdult() {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from('approvals')
    .select(
      `
      id,
      request_hash,
      session_id,
      approved_by_user_id,
      approved_at,
      joined_session,
      approver_present,
      supervisor_in_vehicle_name,
      sessions!inner (
        id,
        teen_user_id,
        started_at,
        ended_at,
        duration_minutes,
        night_minutes,
        day_night,
        notes,
        status,
        deleted_at
      )
    `,
    )
    .order('approved_at', { ascending: false });

  if (error) throw error;
  if (!rows?.length) return [];

  const filtered = rows.filter(
    (row) => row.sessions?.status === 'saved' && !row.sessions?.deleted_at,
  );

  const teenIds = [...new Set(filtered.map((row) => row.sessions?.teen_user_id).filter(Boolean))];
  const approverIdsNeedingFetch = [
    ...new Set(
      filtered
        .filter((row) => !row.supervisor_in_vehicle_name?.trim())
        .map((row) => row.approved_by_user_id)
        .filter(Boolean),
    ),
  ];
  const teenNames = {};
  const approverNames = {};

  const {
    data: { user: authUser },
  } = await getSupabase().auth.getUser();
  const viewerId = authUser?.id;

  await Promise.all([
    ...teenIds.map(async (teenId) => {
      teenNames[teenId] = await fetchRemoteUserLabel(viewerId, teenId, 'Driver');
    }),
    ...approverIdsNeedingFetch.map(async (approverId) => {
      approverNames[approverId] = await fetchRemoteUserLegalName(approverId);
    }),
  ]);

  return filtered.map((row) => ({
    requestHash: row.request_hash,
    sessionId: row.session_id,
    approvedAt: row.approved_at,
    approvedByUserId: row.approved_by_user_id,
    joinedSession: row.joined_session,
    approverPresent: row.approver_present,
    supervisorInVehicleName: row.supervisor_in_vehicle_name?.trim() || null,
    approverName:
      row.supervisor_in_vehicle_name?.trim() ||
      approverNames[row.approved_by_user_id] ||
      'Supervisor',
    session: mapRemoteSession(row.sessions),
    teenName: teenNames[row.sessions?.teen_user_id] ?? 'Driver',
  }));
}

export async function pushDeclineToRemote({ sessionId, requestHash, approvedByUserId, teenUserId }) {
  await assertSubmissionStillPending(sessionId, requestHash);

  const session = getSessionById(sessionId);
  const teenId = teenUserId ?? session?.teenUserId;
  const adultId = approvedByUserId ?? (await requireAuthUserId());

  await withAdultTeenSyncRetry(adultId, teenId, async (clientSyncAt) => {
    const { error } = await getSupabase().rpc('decline_submission', {
      p_request_hash: requestHash,
      p_client_sync_at: clientSyncAt,
    });
    if (error) throw error;
  });

  await notifyApprovalPush(PUSH_EVENTS.SESSION_DECLINED, {
    sessionId,
    requestHash,
  });
  if (teenId && adultId) {
    await fetchAndStoreTeenSyncWatermark(adultId, teenId);
  }
}

export async function pushApprovalToRemote({
  sessionId,
  requestHash,
  approvedByUserId,
  joinedSession,
  supervisorInVehicleName,
  approverPresent,
  approvalId,
  approvedAt,
  teenUserId,
}) {
  await assertSubmissionStillPending(sessionId, requestHash);

  const session = getSessionById(sessionId);
  const teenId = teenUserId ?? session?.teenUserId;

  const local = await withAdultTeenSyncRetry(approvedByUserId, teenId, async (clientSyncAt) => {
    const { data, error } = await getSupabase().rpc('approve_submission_synced', {
      p_client_sync_at: clientSyncAt,
      p_request_hash: requestHash,
      p_session_id: sessionId,
      p_approval_id: approvalId ?? generateId(),
      p_approved_at: approvedAt ?? nowISO(),
      p_joined_session: joinedSession,
      p_supervisor_in_vehicle_name: supervisorInVehicleName,
      p_approver_present: approverPresent,
    });
    if (error) throw error;
    return mapRemoteApproval(data);
  });

  upsertApproval(local);
  await notifyApprovalPush(PUSH_EVENTS.SESSION_APPROVED, {
    sessionId,
    requestHash,
  });
  if (teenId) {
    await fetchAndStoreTeenSyncWatermark(approvedByUserId, teenId);
  }
  return local;
}

export async function approveSubmissionRemote({
  sessionId,
  requestHash,
  approvedByUserId,
  joinedSession,
  supervisorInVehicleName,
  approverPresent,
}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is required to approve sessions.');
  }

  assertRemoteWriteAllowed();

  const { flushOutbox } = require('./outboxSync');
  await flushOutbox();

  const approvalId = generateId();
  const approvedAt = nowISO();
  const outboxPayload = {
    sessionId,
    requestHash,
    approvedByUserId,
    joinedSession,
    supervisorInVehicleName,
    approverPresent,
    approvalId,
    approvedAt,
  };

  const localApproval = {
    id: approvalId,
    requestHash,
    sessionId,
    approvedByUserId,
    approvedAt,
    joinedSession,
    supervisorInVehicleName,
    approverPresent,
  };

  if (!(await isNetworkOnline())) {
    upsertApproval(localApproval);
    enqueueOutbox('session_approved', outboxPayload, approvedByUserId);
    return localApproval;
  }

  try {
    return await pushApprovalToRemote(outboxPayload);
  } catch (e) {
    if (isNetworkFailureError(e)) {
      upsertApproval(localApproval);
      enqueueOutbox('session_approved', outboxPayload, approvedByUserId);
      return localApproval;
    }
    throw e;
  }
}

export async function declineSubmissionRemote({ sessionId, requestHash }) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is required to send a session back.');
  }

  assertRemoteWriteAllowed();

  const { flushOutbox } = require('./outboxSync');
  await flushOutbox();

  const authUserId = await requireAuthUserId();
  const payload = { sessionId, requestHash };

  if (!(await isNetworkOnline())) {
    enqueueOutbox('session_declined', payload, authUserId);
    return;
  }

  try {
    await pushDeclineToRemote(payload);
  } catch (e) {
    if (isNetworkFailureError(e)) {
      enqueueOutbox('session_declined', payload, authUserId);
      return;
    }
    throw e;
  }
}

export async function syncDeclinedSubmissionsForTeen(teenUserId) {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabase();
  for (const session of listSavedSessions(teenUserId)) {
    const submission = getSubmissionForSession(session.id);
    if (!submission || submission.superseded) continue;
    if (getApprovalForHash(submission.requestHash)) continue;

    const { data, error } = await supabase
      .from('submissions')
      .select('superseded')
      .eq('request_hash', submission.requestHash)
      .maybeSingle();

    if (error || !data?.superseded) continue;
    const updated = returnSessionForRevision(session.id);
    await syncSessionToRemote(updated);
  }

  const draft = getDraftSession(teenUserId);
  if (!draft) return;

  const { data: remoteSession, error: sessionError } = await supabase
    .from('sessions')
    .select('status, request_hash')
    .eq('id', draft.id)
    .maybeSingle();

  if (sessionError || remoteSession?.status !== 'saved') return;

  const healed = healDraftAfterDecline(draft.id);
  if (healed) {
    await syncSessionToRemote(healed);
  }
}

export async function syncApprovalsForTeen(teenUserId) {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabase()
    .from('approvals')
    .select(
      `
      id,
      request_hash,
      session_id,
      approved_by_user_id,
      approved_at,
      joined_session,
      supervisor_in_vehicle_name,
      approver_present,
      sessions!inner ( teen_user_id )
    `,
    )
    .eq('sessions.teen_user_id', teenUserId);

  if (error) throw error;

  return (data ?? []).map((row) => upsertApproval(mapRemoteApproval(row)));
}

export async function fetchSubmissionDetail(requestHash) {
  const local = getSubmissionByHash(requestHash);
  if (local?.payloadJson) {
    const session = getSessionById(local.sessionId);
    const approval = getApprovalForHash(requestHash);
    let approverName;
    if (approval?.approvedByUserId) {
      approverName = await resolveApproverName(approval);
    }
    return {
      submission: local,
      session,
      payload: JSON.parse(local.payloadJson),
      approval,
      approverName,
    };
  }

  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('submissions')
    .select(
      `
      request_hash,
      session_id,
      payload_json,
      submitted_at,
      submitted_by_user_id,
      superseded,
      sessions (
        id,
        teen_user_id,
        started_at,
        ended_at,
        duration_minutes,
        night_minutes,
        day_night,
        notes,
        request_hash,
        status,
        deleted_at
      )
    `,
    )
    .eq('request_hash', requestHash)
    .maybeSingle();

  if (error) throw error;

  const { data: approvalData } = await supabase
    .from('approvals')
    .select(
      'id, request_hash, session_id, approved_by_user_id, approved_at, joined_session, supervisor_in_vehicle_name, approver_present',
    )
    .eq('request_hash', requestHash)
    .maybeSingle();

  const approval = approvalData ? mapRemoteApproval(approvalData) : null;
  const approverName = approval ? await resolveApproverName(approval) : null;

  if (!data) {
    if (!approval) return null;

    const { data: sessionRow, error: sessionError } = await supabase
      .from('sessions')
      .select('id, teen_user_id, started_at, ended_at, duration_minutes, night_minutes, day_night, notes, request_hash')
      .eq('id', approval.sessionId)
      .maybeSingle();

    if (sessionError || !sessionRow) return null;

    return {
      submission: null,
      session: mapRemoteSession(sessionRow),
      payload: null,
      approval,
      approverName,
    };
  }

  return {
    submission: {
      requestHash: data.request_hash,
      sessionId: data.session_id,
      payloadJson: data.payload_json,
      submittedAt: data.submitted_at,
      submittedByUserId: data.submitted_by_user_id,
      superseded: data.superseded,
    },
    session: mapRemoteSession(data.sessions),
    payload: JSON.parse(data.payload_json),
    approval,
    approverName,
  };
}
