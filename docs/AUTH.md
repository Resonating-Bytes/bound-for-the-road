# Authentication

How Bound for the Road authenticates users across iOS and Android, what the backend receives, and how an auth identity maps to an app User record.

Read this before writing any auth-related code or backend endpoints.

---

## Provider summary

| Platform | Provider | Notes |
|----------|----------|-------|
| iOS | Sign in with Apple | **Required** by Apple when any other social login is offered |
| iOS | Google Sign-In | Optional but recommended for users without Apple ID |
| Android | Google Sign-In | Primary provider |
| Android | Sign in with Apple | Not available as native SDK; excluded from Android |
| iOS + Android | Email + password | Supabase Auth — sign-up, confirm, sign-in, forgot/reset |

---

## Current implementation (Phase 2 — Supabase)

The app uses **Supabase Auth**, not a custom JWT backend. Google OAuth and email/password share one session model (`@supabase/supabase-js`); `public.users` is created by the `handle_new_auth_user` trigger.

| Flow | Client API | Mobile module |
|------|------------|---------------|
| Google sign-in | `signInWithOAuth({ provider: 'google' })` | `lib/googleAuth.js` |
| Email sign-up | `auth.signUp` + `emailRedirectTo` | `lib/emailAuth.js` |
| Email sign-in | `auth.signInWithPassword` | `lib/emailAuth.js` |
| Confirm email | Link opens app → `auth/callback` | `lib/authCallback.js` |
| Forgot password | `auth.resetPasswordForEmail` | `lib/emailAuth.js` |
| Reset password | `auth.updateUser({ password })` after `PASSWORD_RECOVERY` | `AuthContext` |
| Resend confirmation | `auth.resend({ type: 'signup' })` | Sign-in screen |

After any successful auth, `AuthContext.applyAuthUser` merges the Supabase user into local SQLite (same path as Google).

**Dashboard setup:** enable Email provider, confirm-email, and SMTP — see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

The sections below describe provider token shapes and original Phase 1 planning; they are **not** the live wire-up (no custom `POST /auth/signin` endpoint).

---

## How each provider works

### Sign in with Apple (iOS only)

1. Teen or adult taps "Sign in with Apple" button (rendered by `expo-apple-authentication`).
2. iOS shows the system sheet — user authenticates with Face ID / Touch ID / password.
3. Apple returns an **identity token** (JWT) to the app. It contains:
   - `sub` — Apple's stable unique user ID (persists across app installs on same Apple ID)
   - `email` — user's email, **only provided on first sign-in**. On subsequent sign-ins Apple does not re-send it. The backend must store it on first receipt.
   - `email_verified` — boolean
4. Apple also returns a **full name** (given + family) — again, **only on first sign-in**. Store it immediately.
5. The app sends the identity token to the Bound for the Road backend.
6. The backend verifies the token's signature against Apple's public keys (fetched from `https://appleid.apple.com/auth/keys`).
7. Backend looks up or creates a User record keyed on `apple_sub`.
8. Backend returns a Bound for the Road session token.

**Important:** Apple's email relay — users can choose "Hide My Email," in which case Apple provides a relay address (`@privaterelay.appleid.com`). The app should accept this and not require a real email for core functionality.

### Google Sign-In (iOS + Android)

1. Teen or adult taps "Sign in with Google" button (rendered via `expo-auth-session` with Google OAuth, or `@react-native-google-signin/google-signin`).
2. User authenticates in a browser tab or system sheet.
3. Google returns an **ID token** (JWT) containing:
   - `sub` — Google's stable unique user ID
   - `email` — always present and reliable
   - `name`, `given_name`, `family_name` — always present
   - `picture` — profile photo URL (not used in MVP)
4. The app sends the ID token to the Bound for the Road backend.
5. Backend verifies the token by calling `https://oauth2.googleapis.com/tokeninfo?id_token=TOKEN` or using Google's public keys directly.
6. Backend looks up or creates a User record keyed on `google_sub`.
7. Backend returns a Bound for the Road session token.

---

## Backend flow (both providers)

```
App                          Bound for the Road Backend
 |                                   |
 |-- POST /auth/signin ------------> |
 |   { provider, identity_token,     |
 |     display_name? }               |
 |                                   |-- Verify token with provider
 |                                   |-- Look up User by (provider, sub)
 |                                   |-- If not found: create User record
 |                                   |-- If found: update last_seen
 |                                   |-- Issue Bound for the Road session token (JWT)
 |                                   |
 |<-- { session_token, user_id, ---- |
 |      is_new_user }                |
```

`is_new_user: true` tells the app to show the onboarding flow (role selection, name, etc.). `false` means go straight to the dashboard.

---

## Bound for the Road session token

- Format: JWT signed with a server secret (HS256 or RS256).
- Payload: `{ user_id, role, iat, exp }`
- Expiry: 30 days. Refresh silently on app open if within 7 days of expiry.
- Stored on device in **SecureStore** (`expo-secure-store`) — never in AsyncStorage or local DB in plaintext.
- Included as `Authorization: Bearer <token>` on all authenticated API calls.

---

## User record (backend + local)

When a user first signs in, the backend creates a User record. The app stores a local copy for offline use.

| Field | Source | Notes |
|-------|--------|-------|
| `id` | Backend (UUID) | Primary key everywhere |
| `role` | Set during onboarding | `teen` or `adult` — chosen after first sign-in |
| `legalName` | Set during onboarding | Used on exports and approval records |
| `email` | From provider (first sign-in) | Stored by backend; shown in profile |
| `dateOfBirth` | Teen onboarding only | Used to verify 13+ |
| `stateCode` | Teen onboarding only | `IL` for MVP |
| `authProvider` | `apple` or `google` | |
| `providerSub` | From token `sub` | Keyed lookup for future sign-ins |
| `createdAt` | Backend | |

A user cannot have both an Apple and Google identity linked to the same account in MVP. Account merging is post-MVP.

---

## Role selection

After `is_new_user: true`, the app shows a role selection screen before the rest of onboarding:

> "Are you a teen driver or a supervising adult?"
> [ I'm a teen driver ] [ I'm a supervising adult ]

This sets `role` on the User record. The role cannot be changed after onboarding without contacting support (prevents teens from switching to adult to approve their own sessions).

---

## Onboarding gates

| Role | Required fields before app is usable |
|------|--------------------------------------|
| Teen | legalName, dateOfBirth (13+ check), stateCode, permitIssueDate |
| Adult | legalName |

`permitIssueDate` is used to calculate the 9-month holding period eligibility date on the dashboard. It is self-reported — the app does not verify it.

---

## Sign-out

- Clears session token from SecureStore (Phase 1: mock auth flag).
- **Does not wipe local DB** — session data remains keyed by `userId` for same user on re-sign-in ([DECISIONS.md](./DECISIONS.md)).
- Settings → **Delete all my data on this device** — hard delete current user's rows.
- Does **not** revoke Apple/Google identity.
- Phase 2: optional `AppleAuthentication.signOutAsync()` on iOS.

**Post-MVP:** encrypted SQLite at rest ([WISHLIST.md](./WISHLIST.md)).

---

## Expo Go limitations

- `expo-apple-authentication` requires a real device and a provisioned bundle ID. It will not work in Expo Go in production configuration.
- Google Sign-In via `expo-auth-session` works in Expo Go for UI testing with a development OAuth client, but the returned tokens cannot be verified against a real backend without the correct redirect URI registered.
- **For Phase 1 (Expo Go):** mock the auth flow. The sign-in screens are built, but tapping "Sign in" creates a hardcoded local user and skips token verification. Real auth is wired up in Phase 2 (dev build).

---

## Security notes

- Never log or store raw identity tokens beyond the verification step.
- Never store the Bound for the Road session token in AsyncStorage — use SecureStore only.
- The `role` field on the backend is the authoritative source. The app should re-fetch user profile on session resume and not trust a locally cached role for approval eligibility checks.
- Device clock manipulation affects token expiry checks locally but not on the backend (the backend uses server time to issue and validate session tokens).

---

## Libraries

| Need | Library |
|------|---------|
| Sign in with Apple | `expo-apple-authentication` |
| Google Sign-In | `expo-auth-session` with Google config, or `@react-native-google-signin/google-signin` |
| Secure token storage | `expo-secure-store` |
| HTTP client | `fetch` (built-in) or `axios` |

`expo-auth-session` is the managed-workflow-friendly option and works in Expo Go for UI prototyping. `@react-native-google-signin/google-signin` is more robust for production but requires a dev build. Decision can be deferred to Phase 2.
