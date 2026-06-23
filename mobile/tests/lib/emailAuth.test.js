jest.mock('../../src/lib/supabase', () => ({
  getSupabase: jest.fn(),
}));

jest.mock('../../src/lib/authRedirect', () => ({
  getEmailAuthRedirectUri: () => 'boundfortheroad://auth/callback',
}));

import { getSupabase } from '../../src/lib/supabase';
import {
  mapAuthError,
  normalizeEmail,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  signUpWithEmail,
  signInWithEmail,
  requestPasswordReset,
  resendSignupConfirmation,
} from '../../src/lib/emailAuth';

describe('emailAuth', () => {
  const mockSignUp = jest.fn();
  const mockSignIn = jest.fn();
  const mockResend = jest.fn();
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    getSupabase.mockReturnValue({
      auth: {
        signUp: mockSignUp,
        signInWithPassword: mockSignIn,
        resend: mockResend,
        resetPasswordForEmail: mockReset,
      },
    });
  });

  test('normalizeEmail trims and lowercases', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  test('validateEmail rejects invalid addresses', () => {
    expect(validateEmail('')).toBeTruthy();
    expect(validateEmail('not-an-email')).toBeTruthy();
    expect(validateEmail('user@example.com')).toBeNull();
  });

  test('validatePassword enforces minimum length', () => {
    expect(validatePassword('short')).toBeTruthy();
    expect(validatePassword('longenough')).toBeNull();
  });

  test('validatePasswordMatch detects mismatch', () => {
    expect(validatePasswordMatch('a', 'b')).toBeTruthy();
    expect(validatePasswordMatch('same', 'same')).toBeNull();
  });

  test('mapAuthError maps unconfirmed email', () => {
    expect(mapAuthError({ message: 'Email not confirmed' })).toContain('Confirm your email');
  });

  test('signUpWithEmail passes redirect and reports needsConfirmation', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    });

    const result = await signUpWithEmail('user@example.com', 'password123');
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
      options: { emailRedirectTo: 'boundfortheroad://auth/callback' },
    });
    expect(result.needsConfirmation).toBe(true);
  });

  test('signInWithEmail maps invalid credentials', async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    await expect(signInWithEmail('user@example.com', 'password123')).rejects.toThrow(
      'Invalid email or password',
    );
  });

  test('requestPasswordReset always returns generic message', async () => {
    mockReset.mockResolvedValue({ error: { message: 'User not found' } });
    const message = await requestPasswordReset('missing@example.com');
    expect(message).toContain('If an account exists');
  });

  test('resendSignupConfirmation calls Supabase resend', async () => {
    mockResend.mockResolvedValue({ error: null });
    await resendSignupConfirmation('user@example.com');
    expect(mockResend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'user@example.com',
      options: { emailRedirectTo: 'boundfortheroad://auth/callback' },
    });
  });
});
