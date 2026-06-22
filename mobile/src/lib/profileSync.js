import { getUserById, upsertUser } from '../db/queries';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { clampName, hasDisplayName, hasLegalName, MAX_DISPLAY_NAME_LENGTH, MAX_LEGAL_NAME_LENGTH, firstTokenFromLegalName } from '../utils/names';

export function mapRemoteUser(row) {
  if (!row) return null;
  const legalName = row.legal_name ?? '';
  return {
    id: row.id,
    role: row.role ?? 'teen',
    legalName,
    displayName: row.display_name?.trim() || firstTokenFromLegalName(legalName),
    email: row.email ?? null,
    dateOfBirth: row.date_of_birth ?? null,
    stateCode: row.state_code ?? 'IL',
    permitIssueDate: row.permit_issue_date ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function mapProfileToRemote(profile) {
  return {
    id: profile.id,
    role: profile.role ?? 'teen',
    legal_name: clampName(profile.legalName, MAX_LEGAL_NAME_LENGTH),
    display_name: clampName(profile.displayName, MAX_DISPLAY_NAME_LENGTH),
    email: profile.email ?? null,
    date_of_birth: profile.dateOfBirth ?? null,
    state_code: profile.stateCode ?? 'IL',
    permit_issue_date: profile.permitIssueDate ?? null,
  };
}

/**
 * Merge local SQLite profile with Supabase row. When remote updated_at is newer,
 * remote wins for editable fields (permit date, names, etc.).
 */
export function mergeProfileWithRemote({
  existing,
  remote,
  roleLockedLocally,
  oauthLegalName = '',
  oauthDisplayName = '',
  authEmail = null,
}) {
  if (!existing) {
    return {
      id: remote?.id,
      role: remote?.role ?? 'teen',
      legalName: remote?.legalName || oauthLegalName,
      displayName: remote?.displayName || oauthDisplayName,
      email: authEmail ?? remote?.email ?? null,
      dateOfBirth: remote?.dateOfBirth ?? null,
      stateCode: remote?.stateCode ?? 'IL',
      permitIssueDate: remote?.permitIssueDate ?? null,
      updatedAt: remote?.updatedAt ?? null,
    };
  }

  const remoteTime = remote?.updatedAt ? Date.parse(remote.updatedAt) : NaN;
  const localTime = existing.updatedAt ? Date.parse(existing.updatedAt) : 0;
  const remoteIsNewer = remote && Number.isFinite(remoteTime) && remoteTime > localTime;

  if (remoteIsNewer) {
    return {
      ...existing,
      role: roleLockedLocally ? existing.role : (remote.role ?? existing.role),
      legalName: remote.legalName || existing.legalName || oauthLegalName,
      displayName: remote.displayName || existing.displayName || oauthDisplayName,
      email: existing.email || authEmail || remote.email || null,
      dateOfBirth: remote.dateOfBirth ?? existing.dateOfBirth ?? null,
      stateCode: remote.stateCode ?? existing.stateCode ?? 'IL',
      permitIssueDate: remote.permitIssueDate ?? existing.permitIssueDate ?? null,
      updatedAt: remote.updatedAt,
    };
  }

  return {
    ...existing,
    role: roleLockedLocally ? existing.role : (remote?.role ?? existing.role),
    legalName: existing.legalName || remote?.legalName || oauthLegalName,
    displayName: existing.displayName || remote?.displayName || oauthDisplayName,
    email: existing.email || authEmail || remote?.email || null,
    dateOfBirth: existing.dateOfBirth ?? remote?.dateOfBirth ?? null,
    stateCode: existing.stateCode ?? remote?.stateCode ?? 'IL',
    permitIssueDate: existing.permitIssueDate ?? remote?.permitIssueDate ?? null,
  };
}

export async function fetchRemoteProfile(userId) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from('users')
    .select(
      'id, role, legal_name, display_name, email, date_of_birth, state_code, permit_issue_date, updated_at',
    )
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Pull profile from Supabase and merge into local SQLite (newer remote wins). */
export async function pullAndApplyRemoteProfile(userId, mergeOptions) {
  const remoteRow = await fetchRemoteProfile(userId);
  const remote = mapRemoteUser(remoteRow);
  const existing = getUserById(userId);
  const merged = mergeProfileWithRemote({ existing, remote, ...mergeOptions });
  return upsertUser({ ...merged, id: userId });
}

export async function syncProfileToSupabase(profile) {
  if (!isSupabaseConfigured() || !profile?.id) return;

  const { error } = await getSupabase()
    .from('users')
    .upsert(mapProfileToRemote(profile), { onConflict: 'id' });

  if (error) {
    console.warn('Supabase profile sync failed:', error.message);
    throw error;
  }
}

/** Push profile and align local updatedAt with the server row for multi-device merge. */
export async function syncProfileToSupabaseAndStamp(profile) {
  await syncProfileToSupabase(profile);
  const remoteRow = await fetchRemoteProfile(profile.id);
  const remoteUpdatedAt = remoteRow?.updated_at;
  if (!remoteUpdatedAt) return getUserById(profile.id);
  return upsertUser({ ...getUserById(profile.id), updatedAt: remoteUpdatedAt });
}

export async function ensureRemoteUserProfile(userId) {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabase();
  const { data: existing, error: readError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return;

  const local = getUserById(userId);
  if (!hasLegalName(local) || !hasDisplayName(local)) {
    throw new Error('Complete your profile before creating an invite code.');
  }

  await syncProfileToSupabase(local);
}
