const mockExchangeCodeForSession = jest.fn();
const mockSetSession = jest.fn();
const mockVerifyOtp = jest.fn();
const mockGetSession = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  getSupabase: () => ({
    auth: {
      exchangeCodeForSession: (...args) => mockExchangeCodeForSession(...args),
      setSession: (...args) => mockSetSession(...args),
      verifyOtp: (...args) => mockVerifyOtp(...args),
      getSession: (...args) => mockGetSession(...args),
    },
  }),
}));

import {
  createSessionFromUrl,
  isAuthCallbackUrl,
  getAuthCallbackError,
  isAuthLinkAlreadyUsedError,
  resolveAuthCallback,
  AUTH_ALREADY_CONFIRMED_NOTICE,
} from '../../src/lib/authCallback';

describe('authCallback', () => {
  beforeEach(() => {
    mockExchangeCodeForSession.mockReset();
    mockSetSession.mockReset();
    mockVerifyOtp.mockReset();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  test('isAuthCallbackUrl detects oauth and email callbacks', () => {
    expect(isAuthCallbackUrl('boundfortheroad://auth/callback?code=abc')).toBe(true);
    expect(isAuthCallbackUrl('boundfortheroad://auth/callback#access_token=t')).toBe(true);
    expect(isAuthCallbackUrl('boundfortheroad://auth/callback?token_hash=h&type=signup')).toBe(true);
    expect(isAuthCallbackUrl('boundfortheroad://auth/callback?error_code=otp_expired')).toBe(true);
    expect(isAuthCallbackUrl('exp://192.168.1.1:8082?auth_callback=1&error_code=otp_expired')).toBe(true);
    expect(
      isAuthCallbackUrl(
        'exp://192.168.68.175:8082/--/auth/callback?error_code=otp_expired',
      ),
    ).toBe(true);
    expect(isAuthCallbackUrl('https://example.com')).toBe(false);
  });

  test('getAuthCallbackError explains expired email links', () => {
    const url =
      'exp://192.168.68.175:8082/--/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    expect(isAuthLinkAlreadyUsedError(url)).toBe(true);
    expect(getAuthCallbackError(url)).toBe(AUTH_ALREADY_CONFIRMED_NOTICE);
  });

  test('resolveAuthCallback treats already-used links as sign-in prompt when logged out', async () => {
    const url =
      'boundfortheroad://auth/callback?error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    const result = await resolveAuthCallback(url);
    expect(result).toEqual({ type: 'already_used' });
    expect(mockGetSession).toHaveBeenCalled();
  });

  test('resolveAuthCallback keeps session when link was already used but user is signed in', async () => {
    const session = { user: { id: 'auth-uuid' } };
    mockGetSession.mockResolvedValue({ data: { session } });
    const result = await resolveAuthCallback(
      'boundfortheroad://auth/callback?error_code=otp_expired',
    );
    expect(result).toEqual({ type: 'session', session, alreadyUsed: true });
  });

  test('createSessionFromUrl exchanges PKCE code', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { user: { id: 'auth-uuid' } } },
      error: null,
    });

    const session = await createSessionFromUrl('boundfortheroad://auth/callback?code=abc123');
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

  test('createSessionFromUrl verifies email OTP token_hash', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { session: { user: { id: 'auth-uuid' } } },
      error: null,
    });

    await createSessionFromUrl(
      'boundfortheroad://auth/callback?token_hash=hash1&type=signup',
    );

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash1',
      type: 'signup',
    });
  });
});
