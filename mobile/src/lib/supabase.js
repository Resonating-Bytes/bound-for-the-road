/**
 * Supabase client (Phase 2). No-op until EXPO_PUBLIC_* env vars are set.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client = null;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseConfig() {
  return {
    url: supabaseUrl || null,
    anonKeyConfigured: Boolean(supabaseAnonKey),
  };
}

export function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env',
    );
  }
  if (!client) {
    const { createClient } = require('@supabase/supabase-js');
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }
  return client;
}

/** Ping REST API — works without a signed-in user. */
export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/users?select=id&limit=0`, {
      headers: {
        apikey: supabaseAnonKey,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message ?? 'network_error' };
  }
}

export function resetSupabaseClientForTests() {
  client = null;
}
