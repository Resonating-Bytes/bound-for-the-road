import { getUserById } from '../db/queries';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { clampName, hasDisplayName, hasLegalName, MAX_DISPLAY_NAME_LENGTH, MAX_LEGAL_NAME_LENGTH } from '../utils/names';

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
