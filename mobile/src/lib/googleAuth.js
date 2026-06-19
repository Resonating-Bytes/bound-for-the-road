import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { getSupabase } from './supabase';
import { getAuthRedirectUri } from './authRedirect';

WebBrowser.maybeCompleteAuthSession();

export async function createSessionFromUrl(url) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  if (params.error_description) throw new Error(String(params.error_description));
  if (params.error) throw new Error(String(params.error));

  const supabase = getSupabase();

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
  }

  if (params.access_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token ?? '',
    });
    if (error) throw error;
    return data.session;
  }

  return null;
}

export async function signInWithGoogleOAuth() {
  const supabase = getSupabase();
  const redirectTo = getAuthRedirectUri();

  if (__DEV__) {
    console.log('[auth] OAuth redirectTo:', redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

  if (__DEV__) {
    try {
      const authUrl = new URL(data.url);
      console.log('[auth] authorize redirect_to:', authUrl.searchParams.get('redirect_to'));
      console.log('[auth] code_challenge_method:', authUrl.searchParams.get('code_challenge_method'));
    } catch {
      console.log('[auth] authorize URL:', data.url.slice(0, 120), '...');
    }
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return null;
  }
  if (result.type === 'success' && result.url) {
    return createSessionFromUrl(result.url);
  }
  return null;
}
