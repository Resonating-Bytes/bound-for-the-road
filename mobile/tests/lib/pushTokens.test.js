const mockRpc = jest.fn(() => Promise.resolve({ error: null }));

jest.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(() => true),
  getSupabase: jest.fn(() => ({
    rpc: mockRpc,
    from: jest.fn(() => ({
      delete: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
    })),
  })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test-project' } } },
}));

import { registerPushToken } from '../../src/lib/pushTokens';

describe('pushTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registerPushToken uses register_push_token RPC', async () => {
    await registerPushToken('adult-001');

    expect(mockRpc).toHaveBeenCalledWith('register_push_token', {
      p_token: 'ExponentPushToken[test]',
      p_platform: 'ios',
    });
  });
});
