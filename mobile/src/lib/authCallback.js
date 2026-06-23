import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { getSupabase } from './supabase';

let pendingPasswordRecovery = false;

/** Consumed by AuthContext when a recovery deep link may not emit PASSWORD_RECOVERY. */
export function takePendingPasswordRecovery() {
  const pending = pendingPasswordRecovery;
  pendingPasswordRecovery = false;
  return pending;
}

function markPendingPasswordRecovery() {
  pendingPasswordRecovery = true;
}

/** True when the URL is our Supabase auth redirect (OAuth, email confirm, password recovery, or auth error). */
export function isAuthCallbackUrl(url) {
  if (!url) return false;

  const hasAuthPayload =
    url.includes('code=') ||
    url.includes('access_token=') ||
    url.includes('token_hash=') ||
    url.includes('type=recovery') ||
    url.includes('type=signup') ||
    url.includes('error=') ||
    url.includes('error_code=');

  if (!hasAuthPayload) return false;

  if (url.includes('auth/callback')) return true;

  // Expo Go: root exp URL with auth_callback=1 (no /--/ path).
  if (url.includes('auth_callback=1') || url.includes('auth_callback%3D1')) return true;

  // Legacy Expo Go links that still used /--/auth/callback.
  if (url.includes('/--/auth/callback')) return true;

  return false;
}

function parseAuthCallbackParams(url) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  const code = String(params.error_code ?? errorCode ?? params.error ?? '');
  const description = params.error_description
    ? decodeURIComponent(String(params.error_description).replace(/\+/g, ' '))
    : '';
  return { params, errorCode, code, description };
}

/** True when Supabase says the email OTP was consumed or timed out (common on a second tap). */
export function isAuthLinkAlreadyUsedError(url) {
  const { params, errorCode, code, description } = parseAuthCallbackParams(url);
  if (!params.error && !params.error_code && !errorCode) return false;

  const lowerDescription = description.toLowerCase();
  return (
    code === 'otp_expired' ||
    lowerDescription.includes('invalid or has expired') ||
    lowerDescription.includes('expired')
  );
}

export const AUTH_ALREADY_CONFIRMED_NOTICE =
  'Your email is already confirmed. Sign in with your password to continue.';

export const AUTH_PASSWORD_RESET_EXPIRED_NOTICE =
  'This password reset link has expired. Request a new one from the app.';

/** User-facing message when Supabase redirects with error query params (expired confirm link, etc.). */
export function getAuthCallbackError(url) {
  const { params, errorCode, code, description } = parseAuthCallbackParams(url);
  if (!params.error && !params.error_code && !errorCode) return null;

  if (isAuthLinkAlreadyUsedError(url)) {
    if (params.type === 'recovery' || url.includes('type=recovery')) {
      return AUTH_PASSWORD_RESET_EXPIRED_NOTICE;
    }
    return AUTH_ALREADY_CONFIRMED_NOTICE;
  }

  if (description) return description;
  if (code === 'access_denied') return 'This sign-in link was denied or is no longer valid.';
  return 'Could not complete sign-in from this link. Try signing in from the app.';
}

/**
 * Handle an auth deep link. "Already used" links usually mean the first open confirmed
 * the email (e.g. on another device); send the user to sign-in instead of a dead end.
 */
export async function resolveAuthCallback(url) {
  if (!isAuthCallbackUrl(url)) return { type: 'ignored' };

  if (isAuthLinkAlreadyUsedError(url)) {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      return { type: 'session', session: data.session, alreadyUsed: true };
    }
    return { type: 'already_used', message: getAuthCallbackError(url) };
  }

  const callbackError = getAuthCallbackError(url);
  if (callbackError) {
    return { type: 'error', message: callbackError };
  }

  try {
    const { params: linkParams } = QueryParams.getQueryParams(url);
    if (linkParams.type === 'recovery') {
      markPendingPasswordRecovery();
    }

    const session = await createSessionFromUrl(url);
    if (session) return { type: 'session', session };
    return { type: 'error', message: 'Could not complete sign-in from this link.' };
  } catch (e) {
    return { type: 'error', message: e.message ?? 'Could not complete sign-in from this link.' };
  }
}

export async function createSessionFromUrl(url) {
  const callbackError = getAuthCallbackError(url);
  if (callbackError) {
    throw new Error(callbackError);
  }

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  if (params.error_description) {
    const description = decodeURIComponent(String(params.error_description).replace(/\+/g, ' '));
    throw new Error(description);
  }
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

  if (params.token_hash && params.type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: params.type,
    });
    if (error) throw error;
    return data.session;
  }

  return null;
}
