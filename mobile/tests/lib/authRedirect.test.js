jest.mock('expo-constants', () => ({
  appOwnership: 'expo',
  executionEnvironment: 'storeClient',
  expoConfig: { hostUri: '192.168.1.1:8082' },
  linkingUri: null,
  ExecutionEnvironment: {
    StoreClient: 'storeClient',
    Bare: 'bare',
    Standalone: 'standalone',
  },
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path, options) => {
    const qs = options?.queryParams
      ? `?${new URLSearchParams(options.queryParams).toString()}`
      : '';
    if (path) return `exp://192.168.1.1:8082/--/${path}${qs}`;
    return `exp://192.168.1.1:8082${qs}`;
  }),
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
import {
  getAppAuthCallbackUri,
  getAuthRedirectUri,
  getEmailAuthRedirectUri,
} from '../../src/lib/authRedirect';

describe('authRedirect', () => {
  const originalWebRedirect = process.env.EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL;

  beforeEach(() => {
    Constants.appOwnership = 'expo';
    Constants.executionEnvironment = ExecutionEnvironment.StoreClient;
    Constants.expoConfig = { hostUri: '192.168.1.1:8082' };
    Constants.linkingUri = null;
    delete process.env.EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL;
    Linking.createURL.mockClear();
  });

  afterAll(() => {
    if (originalWebRedirect === undefined) {
      delete process.env.EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL;
    } else {
      process.env.EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL = originalWebRedirect;
    }
  });

  test('builds Expo Go redirect from hostUri without createURL', () => {
    const uri = getAppAuthCallbackUri();
    expect(uri).toBe('exp://192.168.1.1:8082?auth_callback=1');
    expect(Linking.createURL).not.toHaveBeenCalled();
    expect(getAuthRedirectUri()).toBe(uri);
  });

  test('falls back to createURL when hostUri missing', () => {
    Constants.expoConfig = null;
    Constants.linkingUri = null;
    expect(getAppAuthCallbackUri()).toBe('exp://192.168.1.1:8082?auth_callback=1');
    expect(Linking.createURL).toHaveBeenCalled();
  });

  test('uses custom scheme in dev/production build', () => {
    Constants.appOwnership = null;
    Constants.executionEnvironment = ExecutionEnvironment.Bare;
    const uri = getAppAuthCallbackUri();
    expect(uri).toBe('boundfortheroad://auth/callback');
    expect(makeRedirectUri).toHaveBeenCalledWith({
      scheme: 'boundfortheroad',
      path: 'auth/callback',
    });
  });

  test('wraps email redirect in HTTPS bridge when configured', () => {
    process.env.EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL = 'https://example.com/auth-callback';
    const uri = getEmailAuthRedirectUri();
    expect(uri).toMatch(/^https:\/\/example\.com\/auth-callback\?app_redirect=/);
    expect(decodeURIComponent(uri)).toContain('exp://192.168.1.1:8082?auth_callback=1');
  });
});
