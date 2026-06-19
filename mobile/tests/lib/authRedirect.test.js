jest.mock('expo-constants', () => ({
  appOwnership: 'expo',
  executionEnvironment: 'storeClient',
  ExecutionEnvironment: {
    StoreClient: 'storeClient',
    Bare: 'bare',
    Standalone: 'standalone',
  },
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `exp://192.168.1.1:8082/--/${path}`),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(({ scheme, path } = {}) => {
    if (scheme) return `${scheme}://${path}`;
    return `exp://192.168.1.1:8082/--/${path}`;
  }),
}));

import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { getAuthRedirectUri } from '../../src/lib/authRedirect';

describe('authRedirect', () => {
  beforeEach(() => {
    Constants.appOwnership = 'expo';
    Constants.executionEnvironment = ExecutionEnvironment.StoreClient;
  });

  test('uses Linking.createURL in Expo Go', () => {
    const uri = getAuthRedirectUri();
    expect(uri).toMatch(/^exp:\/\//);
    expect(Linking.createURL).toHaveBeenCalledWith('auth/callback');
  });

  test('uses custom scheme in dev/production build', () => {
    Constants.appOwnership = null;
    Constants.executionEnvironment = ExecutionEnvironment.Bare;
    const uri = getAuthRedirectUri();
    expect(uri).toBe('boundfortheroad://auth/callback');
    expect(makeRedirectUri).toHaveBeenCalledWith({
      scheme: 'boundfortheroad',
      path: 'auth/callback',
    });
  });
});
