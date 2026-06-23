import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

function isExpoGo() {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

function expoGoHostFromConstants() {
  if (Constants.expoConfig?.hostUri) {
    const host = String(Constants.expoConfig.hostUri).replace(/^\/+/, '');
    return host.split('/')[0].split('?')[0];
  }

  if (Constants.linkingUri) {
    const withoutScheme = Constants.linkingUri.replace(/^exp:\/\//, '');
    const pathIndex = withoutScheme.indexOf('/--');
    const host = pathIndex >= 0 ? withoutScheme.slice(0, pathIndex) : withoutScheme;
    return host.split('?')[0];
  }

  return '';
}

/**
 * Deep link target inside the app (OAuth + email when no web bridge).
 * Expo Go uses the root exp:// URL with a query flag — not /--/auth/callback, which
 * targets expo-router and makes Expo Go show "Could not connect to the server"
 * before our JS runs.
 */
export function getAppAuthCallbackUri() {
  if (isExpoGo()) {
    const host = expoGoHostFromConstants();
    if (host) {
      return `exp://${host}?auth_callback=1`;
    }

    return Linking.createURL('', { queryParams: { auth_callback: '1' } });
  }

  return makeRedirectUri({
    scheme: 'boundfortheroad',
    path: 'auth/callback',
  });
}

/**
 * Redirect for email confirm / password-reset links.
 * When EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL is set, Supabase redirects to a small HTTPS
 * page first so desktop clicks and otp_expired never hand a broken exp:// URL to Expo Go.
 */
export function getEmailAuthRedirectUri() {
  const appUri = getAppAuthCallbackUri();
  const webBridge = process.env.EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL?.trim();
  if (!webBridge) return appUri;
  if (!/^https:\/\//i.test(webBridge)) {
    console.warn('EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL must be HTTPS; using in-app redirect.');
    return appUri;
  }

  const separator = webBridge.includes('?') ? '&' : '?';
  return `${webBridge}${separator}app_redirect=${encodeURIComponent(appUri)}`;
}

/**
 * OAuth redirect for Supabase (in-app browser must return directly to the app scheme).
 * Add both this URL and getEmailAuthRedirectUri() in Supabase → Redirect URLs.
 */
export function getAuthRedirectUri() {
  return getAppAuthCallbackUri();
}
