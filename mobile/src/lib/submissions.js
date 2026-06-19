import { getSupabase, isSupabaseConfigured } from './supabase';
import {
  submitSession,
  getSubmissionForSession,
  getSubmissionByHash,
  upsertApproval,
  getUserById,
  withdrawSubmission,
  getSessionById,
} from '../db/queries';
import { generateId, nowISO } from '../utils/time';

function mapSessionToRemote(session) {
  return {
    id: session.id,
    teen_user_id: session.teenUserId,
    state_code: session.stateCode,
    status: session.status,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    duration_minutes: session.durationMinutes,
    day_night: session.dayNight,
    notes: session.notes,
    request_hash: session.requestHash,
    payload_json: session.payloadJson,
    active_supervisor_id: session.activeSupervisorId,
    deleted_at: session.deletedAt,
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

export async function syncSessionToRemote(session) {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabase()
    .from('sessions')
    .upsert(mapSessionToRemote(session), { onConflict: 'id' });
  if (error) throw error;
}

export async function syncSubmissionToRemote(submission) {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabase().from('submissions').upsert(
    {
      request_hash: submission.requestHash,
      session_id: submission.sessionId,
      payload_json: submission.payloadJson,
      submitted_at: submission.submittedAt,
      submitted_by_user_id: submission.submittedByUserId,
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

export async function submitSessionForApproval(sessionId, opts) {
  const session = await submitSession(sessionId, opts);
  const submission = getSubmissionForSession(sessionId);
  if (isSupabaseConfigured() && submission) {
    await syncSessionToRemote(session);
    await syncSubmissionToRemote(submission);
  }
  return session;
}

export async function withdrawSessionSubmission(sessionId) {
  const submission = getSubmissionForSession(sessionId);
  const session = withdrawSubmission(sessionId);
  if (isSupabaseConfigured() && submission) {
    await markSubmissionSupersededRemote(submission.requestHash);
    await syncSessionToRemote(session);
  }
  return session;
}

export async function fetchRemoteUserName(userId) {
  if (!isSupabaseConfigured()) {
    return getUserById(userId)?.legalName ?? 'Supervisor';
  }
  const { data, error } = await getSupabase()
    .from('users')
    .select('legal_name')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data?.legal_name) {
    return getUserById(userId)?.legalName ?? 'Supervisor';
  }
  return data.legal_name;
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
  await Promise.all(
    teenIds.map(async (teenId) => {
      teenNames[teenId] = await fetchRemoteUserName(teenId);
    }),
  );

  return pending
    .map((row) => ({
      requestHash: row.request_hash,
      sessionId: row.session_id,
      payloadJson: row.payload_json,
      submittedAt: row.submitted_at,
      submittedByUserId: row.submitted_by_user_id,
      session: row.sessions
        ? {
            id: row.sessions.id,
            teenUserId: row.sessions.teen_user_id,
            startedAt: row.sessions.started_at,
            endedAt: row.sessions.ended_at,
            durationMinutes: row.sessions.duration_minutes,
            dayNight: row.sessions.day_night,
            notes: row.sessions.notes,
          }
        : null,
      teenName: teenNames[row.sessions?.teen_user_id] ?? 'Driver',
    }))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
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

  const approval = {
    id: generateId(),
    request_hash: requestHash,
    session_id: sessionId,
    approved_by_user_id: approvedByUserId,
    approved_at: nowISO(),
    joined_session: joinedSession,
    supervisor_in_vehicle_name: supervisorInVehicleName,
    approver_present: approverPresent,
  };

  const { data, error } = await getSupabase().from('approvals').insert(approval).select().single();
  if (error) throw error;

  const local = mapRemoteApproval(data);
  upsertApproval(local);
  return local;
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
    return { submission: local, session, payload: JSON.parse(local.payloadJson) };
  }

  if (!isSupabaseConfigured()) return null;

  const { data, error } = await getSupabase()
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
        day_night,
        notes,
        request_hash
      )
    `,
    )
    .eq('request_hash', requestHash)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    submission: {
      requestHash: data.request_hash,
      sessionId: data.session_id,
      payloadJson: data.payload_json,
      submittedAt: data.submitted_at,
      submittedByUserId: data.submitted_by_user_id,
      superseded: data.superseded,
    },
    session: data.sessions
      ? {
          id: data.sessions.id,
          teenUserId: data.sessions.teen_user_id,
          startedAt: data.sessions.started_at,
          endedAt: data.sessions.ended_at,
          durationMinutes: data.sessions.duration_minutes,
          dayNight: data.sessions.day_night,
          notes: data.sessions.notes,
          requestHash: data.sessions.request_hash,
        }
      : null,
    payload: JSON.parse(data.payload_json),
  };
}
