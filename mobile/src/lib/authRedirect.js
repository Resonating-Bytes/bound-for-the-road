import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

function isExpoGo() {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/**
 * OAuth redirect for Supabase.
 * Expo Go must use exp:// (not the app custom scheme). Dev/production builds use boundfortheroad://.
 * Add the returned URL in Supabase → Auth → URL Configuration → Redirect URLs.
 */
export function getAuthRedirectUri() {
  if (isExpoGo()) {
    return Linking.createURL('auth/callback');
  }

  return makeRedirectUri({
    scheme: 'boundfortheroad',
    path: 'auth/callback',
  });
}
