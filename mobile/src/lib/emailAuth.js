import { getSupabase } from './supabase';
import { getEmailAuthRedirectUri } from './authRedirect';

export const MIN_PASSWORD_LENGTH = 8;

const INVALID_CREDENTIALS = 'Invalid email or password.';
const GENERIC_RESET_SENT =
  'If an account exists for that email, we sent a link to reset your password.';
const CONFIRM_EMAIL_MESSAGE =
  'Check your email to confirm your account, then sign in.';
const EMAIL_NOT_CONFIRMED =
  'Confirm your email before signing in. Use “Resend confirmation” if you need a new link.';

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function validateEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function validatePasswordMatch(password, confirmPassword) {
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
}

/** Map Supabase Auth errors to user-facing copy. */
export function mapAuthError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase();

  if (message.includes('invalid login credentials')) {
    return INVALID_CREDENTIALS;
  }
  if (message.includes('email not confirmed')) {
    return EMAIL_NOT_CONFIRMED;
  }
  if (message.includes('user already registered')) {
    return 'An account with this email already exists. Sign in or reset your password.';
  }
  if (message.includes('password should be at least')) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (message.includes('signup is disabled')) {
    return 'Email sign-up is not enabled for this app yet.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Wait a moment and try again.';
  }

  return error?.message ?? 'Something went wrong. Try again.';
}

function authRedirectTo() {
  return getEmailAuthRedirectUri();
}

export async function signUpWithEmail(email, password) {
  const normalized = normalizeEmail(email);
  const emailError = validateEmail(normalized);
  if (emailError) throw new Error(emailError);
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  const { data, error } = await getSupabase().auth.signUp({
    email: normalized,
    password,
    options: { emailRedirectTo: authRedirectTo() },
  });
  if (error) throw new Error(mapAuthError(error));

  const needsConfirmation = !data.session;
  return {
    user: data.user,
    session: data.session,
    needsConfirmation,
    message: needsConfirmation ? CONFIRM_EMAIL_MESSAGE : null,
  };
}

export async function signInWithEmail(email, password) {
  const normalized = normalizeEmail(email);
  const emailError = validateEmail(normalized);
  if (emailError) throw new Error(emailError);
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error) throw new Error(mapAuthError(error));
  return data.session;
}

export async function resendSignupConfirmation(email) {
  const normalized = normalizeEmail(email);
  const emailError = validateEmail(normalized);
  if (emailError) throw new Error(emailError);

  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email: normalized,
    options: { emailRedirectTo: authRedirectTo() },
  });
  if (error) throw new Error(mapAuthError(error));
  return CONFIRM_EMAIL_MESSAGE;
}

export async function requestPasswordReset(email) {
  const normalized = normalizeEmail(email);
  const emailError = validateEmail(normalized);
  if (emailError) throw new Error(emailError);

  const { error } = await getSupabase().auth.resetPasswordForEmail(normalized, {
    redirectTo: authRedirectTo(),
  });
  // Always succeed from the user's perspective (no email enumeration).
  if (error) {
    console.warn('Password reset request failed:', error.message);
  }
  return GENERIC_RESET_SENT;
}

export async function completePasswordReset(newPassword) {
  const passwordError = validatePassword(newPassword);
  if (passwordError) throw new Error(passwordError);

  const { data, error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) throw new Error(mapAuthError(error));
  return data.user;
}
