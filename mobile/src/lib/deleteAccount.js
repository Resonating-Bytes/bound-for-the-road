import { getSupabase, isSupabaseConfigured } from './supabase';

export async function deleteRemoteAccount() {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabase().rpc('delete_my_account');
  if (error) throw error;
}
