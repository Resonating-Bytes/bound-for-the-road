jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

const mockExchangeCodeForSession = jest.fn();
const mockSetSession = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      exchangeCodeForSession: (...args) => mockExchangeCodeForSession(...args),
      setSession: (...args) => mockSetSession(...args),
    },
  }),
}));

import { createSessionFromUrl } from '../../src/lib/googleAuth';

describe('googleAuth', () => {
  beforeEach(() => {
    mockExchangeCodeForSession.mockReset();
    mockSetSession.mockReset();
  });

  test('createSessionFromUrl exchanges PKCE code', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: 'auth-uuid' } } },
      error: null,
    });

    const session = await createSessionFromUrl(
      'boundfortheroad://auth/callback?code=abc123',
    );

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(session.user.id).toBe('auth-uuid');
  });

  test('createSessionFromUrl sets session from access_token', async () => {
    mockSetSession.mockResolvedValue({
      data: { session: { user: { id: 'auth-uuid' } } },
      error: null,
    });

    await createSessionFromUrl(
      'boundfortheroad://auth/callback?access_token=token1&refresh_token=token2',
    );

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'token1',
      refresh_token: 'token2',
    });
  });
});
