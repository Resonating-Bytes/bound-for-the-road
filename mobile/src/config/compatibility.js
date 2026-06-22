/** App ↔ backend compatibility constants — keep in sync with Supabase app_config seed. */

import appJson from '../../app.json';
import capabilityContract from './requiredBackendCapabilities.json';

/** Runtime app semver — read from mobile/app.json (single source of truth). */
export const APP_VERSION = appJson.expo.version;

/** Oldest backend_revision this app build supports (Supabase migration id). */
export const MIN_BACKEND_REVISION = '20260629120000';

export const CURRENT_PAYLOAD_SCHEMA_VERSION = 2;
export const SUPPORTED_PAYLOAD_SCHEMA_VERSION = 2;

/** Contract version for get_app_compatibility shape (see docs/RPC_CONTRACT.md). */
export const COMPATIBILITY_CONTRACT_VERSION = capabilityContract.contractVersion;

/** Named backend capability strings — single source in requiredBackendCapabilities.json. */
export const BACKEND_CAPABILITIES = capabilityContract.capabilities;

/** RPC / edge capabilities this build requires on the backend. */
export const REQUIRED_BACKEND_CAPABILITIES = Object.values(BACKEND_CAPABILITIES);

/**
 * Policy when get_app_compatibility is unavailable or errors.
 * - `open` — allow remote writes (dev-friendly default in __DEV__)
 * - `closed` — block remote writes until check succeeds (production default)
 *
 * Override with EXPO_PUBLIC_COMPATIBILITY_RPC_FAIL_POLICY=open|closed
 */
export function getCompatibilityRpcFailPolicy() {
  return (
    process.env.EXPO_PUBLIC_COMPATIBILITY_RPC_FAIL_POLICY ??
    (typeof __DEV__ !== 'undefined' && __DEV__ ? 'open' : 'closed')
  );
}

/** @deprecated Prefer getCompatibilityRpcFailPolicy() — kept for docs/tests referencing the name. */
export const COMPATIBILITY_RPC_FAIL_POLICY = getCompatibilityRpcFailPolicy();

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

export function isCompatibilityFailOpen() {
  return getCompatibilityRpcFailPolicy() !== 'closed';
}
