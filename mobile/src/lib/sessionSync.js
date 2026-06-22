import { getSupabase, isSupabaseConfigured } from './supabase';
import { legacyNightMinutes } from '../utils/dayNight';
import {
  upsertSessionFromRemote,
  upsertSubmissionFromRemote,
  recomputeSessionTimeValidation,
  setRemoteSyncAt,
} from '../db/queries';

export async function fetchTeenSyncWatermark(teenUserId) {
  const { data, error } = await getSupabase().rpc('teen_sync_watermark', {
    p_teen_id: teenUserId,
  });
  if (error) throw error;
  return data;
}

/** Store the server watermark after a successful pull or dashboard refresh. */
export async function fetchAndStoreTeenSyncWatermark(viewerUserId, teenUserId) {
  const watermark = await fetchTeenSyncWatermark(teenUserId);
  if (watermark) {
    setRemoteSyncAt(viewerUserId, watermark, teenUserId);
  }
  return watermark;
}

function mapFullRemoteSession(row) {
  if (!row) return null;
  const durationMinutes = row.duration_minutes ?? row.durationMinutes ?? null;
  let nightMinutes = row.night_minutes ?? row.nightMinutes ?? null;
  if (nightMinutes == null && (row.day_night ?? row.dayNight)) {
    nightMinutes = legacyNightMinutes(row.day_night ?? row.dayNight, durationMinutes);
  }
  return {
    id: row.id,
    teenUserId: row.teen_user_id ?? row.teenUserId,
    stateCode: row.state_code ?? row.stateCode ?? 'IL',
    status: row.status,
    startedAt: row.started_at ?? row.startedAt,
    endedAt: row.ended_at ?? row.endedAt,
    durationMinutes,
    nightMinutes,
    notes: row.notes ?? null,
    requestHash: row.request_hash ?? row.requestHash ?? null,
    payloadJson: row.payload_json ?? row.payloadJson ?? null,
    activeSupervisorId: row.active_supervisor_id ?? row.activeSupervisorId ?? null,
    deletedAt: row.deleted_at ?? row.deletedAt ?? null,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

/**
 * Pull saved/deleted sessions, submissions, and approvals from Supabase into local SQLite.
 * Skips rows with unsynced local outbox entries. Recomputes overlap validity after merge.
 */
export async function pullAndMergeTeenSessions(teenUserId) {
  if (!isSupabaseConfigured() || !teenUserId) return;

  const supabase = getSupabase();
  const { data: sessionRows, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('teen_user_id', teenUserId);

  if (sessionError) throw sessionError;

  for (const row of sessionRows ?? []) {
    upsertSessionFromRemote(mapFullRemoteSession(row));
  }

  const sessionIds = (sessionRows ?? []).map((row) => row.id);
  if (sessionIds.length) {
    const { data: submissionRows, error: subError } = await supabase
      .from('submissions')
      .select('*')
      .in('session_id', sessionIds);
    if (subError) throw subError;

    for (const row of submissionRows ?? []) {
      upsertSubmissionFromRemote({
        requestHash: row.request_hash,
        sessionId: row.session_id,
        payloadJson: row.payload_json,
        submittedAt: row.submitted_at,
        submittedByUserId: row.submitted_by_user_id,
        superseded: row.superseded,
      });
    }
  }

  const { syncApprovalsForTeen, syncDeclinedSubmissionsForTeen } = await import('./submissions');
  await syncApprovalsForTeen(teenUserId);
  await syncDeclinedSubmissionsForTeen(teenUserId);
  recomputeSessionTimeValidation(teenUserId);
  await fetchAndStoreTeenSyncWatermark(teenUserId, teenUserId);
}
