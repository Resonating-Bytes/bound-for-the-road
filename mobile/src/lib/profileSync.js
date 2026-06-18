import { getUserById } from '../db/queries';
import { getSupabase, isSupabaseConfigured } from './supabase';

export function mapProfileToRemote(profile) {
  return {
    id: profile.id,
    role: profile.role ?? 'teen',
    legal_name: profile.legalName,
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
  if (!local?.legalName?.trim()) {
    throw new Error('Complete your profile before creating an invite code.');
  }

  await syncProfileToSupabase(local);
}
