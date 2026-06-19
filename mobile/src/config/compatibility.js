/** App ↔ backend compatibility constants — keep in sync with Supabase app_config seed. */

import appJson from '../../app.json';

/** Runtime app semver — read from mobile/app.json (single source of truth). */
export const APP_VERSION = appJson.expo.version;

/** Oldest backend_revision this app build supports (Supabase migration id). */
export const MIN_BACKEND_REVISION = '20260621120000';

export const CURRENT_PAYLOAD_SCHEMA_VERSION = 1;
export const SUPPORTED_PAYLOAD_SCHEMA_VERSION = 1;

/** RPC / edge capabilities this build requires on the backend. */
export const REQUIRED_BACKEND_CAPABILITIES = [
  'decline_submission',
  'send_approval_push_session_submitted',
  'send_approval_push_session_approved',
  'send_approval_push_session_declined',
  'send_approval_push_session_withdrawn',
  'accept_link_invite',
];

/**
 * Set EXPO_PUBLIC_FORCE_COMPATIBILITY_BANNER=true in mobile/.env to preview the warning banner UI.
 * Restart Expo after changing. Remove or set false when done verifying.
 */
export const FORCE_COMPATIBILITY_PREVIEW =
  process.env.EXPO_PUBLIC_FORCE_COMPATIBILITY_BANNER === 'true';

/**
 * Store links for Settings "Get update". Prefer platform-specific URLs; fall back to EXPO_PUBLIC_APP_UPDATE_URL.
 * iOS: App Store listing. Android: Play Store listing. Generic URL: landing page that redirects by device.
 */
export const APP_UPDATE_URL = process.env.EXPO_PUBLIC_APP_UPDATE_URL ?? '';
export const APP_UPDATE_URL_IOS = process.env.EXPO_PUBLIC_APP_UPDATE_URL_IOS ?? '';
export const APP_UPDATE_URL_ANDROID = process.env.EXPO_PUBLIC_APP_UPDATE_URL_ANDROID ?? '';

export function getAppUpdateUrl(platform) {
  const platformUrl =
    platform === 'ios' ? APP_UPDATE_URL_IOS : platform === 'android' ? APP_UPDATE_URL_ANDROID : '';
  return (platformUrl || APP_UPDATE_URL).trim();
}
