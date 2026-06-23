import * as WebBrowser from 'expo-web-browser';
import { getSupabase } from './supabase';
import { getAuthRedirectUri } from './authRedirect';
import { createSessionFromUrl } from './authCallback';

WebBrowser.maybeCompleteAuthSession();

export { createSessionFromUrl, isAuthCallbackUrl, getAuthCallbackError, resolveAuthCallback, isAuthLinkAlreadyUsedError, AUTH_ALREADY_CONFIRMED_NOTICE } from './authCallback';

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
