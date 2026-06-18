import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

function isExpoGo() {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

export function getAuthRedirectUri() {
  if (isExpoGo()) {
    return Linking.createURL('auth/callback');
  }

  return makeRedirectUri({
    scheme: 'boundfortheroad',
    path: 'auth/callback',
  });
}
