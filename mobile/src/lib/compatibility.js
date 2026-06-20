import {
  APP_VERSION,
  MIN_BACKEND_REVISION,
  REQUIRED_BACKEND_CAPABILITIES,
  SUPPORTED_PAYLOAD_SCHEMA_VERSION,
  FORCE_COMPATIBILITY_PREVIEW,
  isCompatibilityFailOpen,
} from '../config/compatibility';
import { COMPATIBILITY_STATE, WRITE_BLOCKED_STATES } from '../config/compatibilityStates';
import { getSupabase, isSupabaseConfigured } from './supabase';

/** Cached result from the latest startup compatibility check. */
let cachedCompatibility = { ok: true, skipped: true, state: COMPATIBILITY_STATE.CHECK_SKIPPED };

export function setCachedCompatibility(result) {
  cachedCompatibility = result ?? { ok: true, skipped: true, state: COMPATIBILITY_STATE.CHECK_SKIPPED };
}

export function getCachedCompatibility() {
  return cachedCompatibility;
}

export function assertRemoteWriteAllowed() {
  if (FORCE_COMPATIBILITY_PREVIEW) {
    throw new Error(getPreviewCompatibilityResult().message);
  }
  if (!canUseRemoteWrite(cachedCompatibility)) {
    throw new Error(
      cachedCompatibility.message ??
        'Server compatibility check failed. Submit and approval sync are disabled.',
    );
  }
}

export function parseAppVersion(version) {
  const parts = String(version ?? '0.0.0')
    .split('.')
    .map((n) => Number.parseInt(n, 10));
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

export function compareAppVersions(a, b) {
  const left = parseAppVersion(a);
  const right = parseAppVersion(b);
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

export function isBackendRevisionSupported(backendRevision) {
  if (!backendRevision) return false;
  return String(backendRevision) >= MIN_BACKEND_REVISION;
}

export function missingCapabilities(remoteCapabilities = []) {
  const remote = new Set(remoteCapabilities);
  return REQUIRED_BACKEND_CAPABILITIES.filter((cap) => !remote.has(cap));
}

export function getPreviewCompatibilityResult() {
  return {
    ok: false,
    state: COMPATIBILITY_STATE.PREVIEW,
    preview: true,
    backendStale: true,
    message:
      'Preview: server setup is behind this app version. Submit and approval sync are disabled until migrations are applied.',
  };
}

/** Compare app version to server min/latest for Settings update UI. */
export function getAppUpdateStatus(remote) {
  if (!remote) {
    return {
      required: false,
      optional: false,
      minVersion: null,
      latestVersion: null,
    };
  }

  const minVersion = remote.min_app_version ?? APP_VERSION;
  const latestVersion = remote.latest_app_version ?? minVersion;
  const required = compareAppVersions(APP_VERSION, minVersion) < 0;
  const optional = !required && compareAppVersions(APP_VERSION, latestVersion) < 0;

  return { required, optional, minVersion, latestVersion };
}

export function getCompatibilityStatusLabel(compatibility) {
  switch (compatibility?.state) {
    case COMPATIBILITY_STATE.PREVIEW:
      return 'Preview (forced banner)';
    case COMPATIBILITY_STATE.CHECK_SKIPPED:
      return compatibility.warning ? 'Check skipped (server)' : 'Check skipped';
    case COMPATIBILITY_STATE.CHECK_ERROR:
      return 'Check failed (server)';
    case COMPATIBILITY_STATE.UPDATE_REQUIRED:
      return 'App update required';
    case COMPATIBILITY_STATE.BACKEND_STALE:
      return 'Server update required';
    case COMPATIBILITY_STATE.CAPABILITY_MISSING:
      return 'Server missing features';
    case COMPATIBILITY_STATE.PAYLOAD_SCHEMA_UNSUPPORTED:
      return 'Session format unsupported';
    case COMPATIBILITY_STATE.UPDATE_AVAILABLE:
      return 'App update available';
    case COMPATIBILITY_STATE.COMPATIBLE:
      return 'Compatible';
    default:
      return 'Unknown';
  }
}

/** Plain-language status for Settings (user-actionable only). */
export function getSettingsCompatibilityLabel(compatibility) {
  switch (compatibility?.state) {
    case COMPATIBILITY_STATE.PREVIEW:
      return 'Preview mode';
    case COMPATIBILITY_STATE.CHECK_SKIPPED:
      return compatibility.warning ? 'Could not check for updates' : 'Update check skipped';
    case COMPATIBILITY_STATE.CHECK_ERROR:
      return 'Could not verify server — sync disabled';
    case COMPATIBILITY_STATE.UPDATE_REQUIRED:
      return 'Update required';
    case COMPATIBILITY_STATE.BACKEND_STALE:
      return 'Submit and approval sync temporarily unavailable';
    case COMPATIBILITY_STATE.CAPABILITY_MISSING:
      return 'Server setup incomplete — sync disabled';
    case COMPATIBILITY_STATE.PAYLOAD_SCHEMA_UNSUPPORTED:
      return 'Update app to sync sessions';
    case COMPATIBILITY_STATE.UPDATE_AVAILABLE:
      return 'Update available';
    case COMPATIBILITY_STATE.COMPATIBLE:
      return 'Up to date';
    default:
      return 'Unknown';
  }
}

/**
 * Evaluate get_app_compatibility() payload against this app build.
 * Returns a result with explicit `state` (see compatibilityStates.js).
 */
export function evaluateBackendCompatibility(remote) {
  if (!remote) {
    return {
      ok: false,
      state: COMPATIBILITY_STATE.CHECK_ERROR,
      message: 'Compatibility check returned no data.',
    };
  }

  const appOutdated = compareAppVersions(APP_VERSION, remote.min_app_version) < 0;
  const backendStale = !isBackendRevisionSupported(remote.backend_revision);
  const caps = missingCapabilities(remote.capabilities ?? []);

  if (appOutdated) {
    return {
      ok: false,
      state: COMPATIBILITY_STATE.UPDATE_REQUIRED,
      appOutdated: true,
      message: `This app (${APP_VERSION}) is older than required (${remote.min_app_version}). Please update.`,
      remote,
    };
  }

  if (backendStale) {
    return {
      ok: false,
      state: COMPATIBILITY_STATE.BACKEND_STALE,
      backendStale: true,
      message:
        'Server setup is behind this app version. Submit and approval sync are disabled until migrations are applied.',
      remote,
    };
  }

  if (caps.length) {
    return {
      ok: false,
      state: COMPATIBILITY_STATE.CAPABILITY_MISSING,
      backendStale: true,
      missingCapabilities: caps,
      message: `Server is missing required features: ${caps.join(', ')}.`,
      remote,
    };
  }

  if (
    remote.payload_schema_version != null &&
    Number(remote.payload_schema_version) > SUPPORTED_PAYLOAD_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      state: COMPATIBILITY_STATE.PAYLOAD_SCHEMA_UNSUPPORTED,
      backendStale: true,
      message: 'Server expects a newer session format than this app supports. Please update the app.',
      remote,
    };
  }

  const updateStatus = getAppUpdateStatus(remote);

  if (updateStatus.optional) {
    return {
      ok: true,
      state: COMPATIBILITY_STATE.UPDATE_AVAILABLE,
      remote,
      updateOptional: true,
      latestAppVersion: updateStatus.latestVersion,
    };
  }

  return {
    ok: true,
    state: COMPATIBILITY_STATE.COMPATIBLE,
    remote,
  };
}

function buildSkippedCompatibilityResult({ warning } = {}) {
  if (isCompatibilityFailOpen()) {
    return {
      ok: true,
      skipped: true,
      state: COMPATIBILITY_STATE.CHECK_SKIPPED,
      warning,
    };
  }

  return {
    ok: false,
    skipped: true,
    state: COMPATIBILITY_STATE.CHECK_ERROR,
    warning,
    message:
      'Could not verify server compatibility. Submit and approval sync are disabled until the check succeeds.',
  };
}

export async function fetchBackendCompatibility() {
  if (!isSupabaseConfigured()) {
    return { ok: true, skipped: true, state: COMPATIBILITY_STATE.CHECK_SKIPPED };
  }

  const { data, error } = await getSupabase().rpc('get_app_compatibility');
  if (error) {
    return buildSkippedCompatibilityResult({ warning: error.message });
  }

  return evaluateBackendCompatibility(data);
}

export function assertPayloadSchemaSupported(schemaVersion) {
  const version = Number(schemaVersion ?? 1);
  if (version > SUPPORTED_PAYLOAD_SCHEMA_VERSION) {
    throw new Error(
      `Session data uses schema v${version}, but this app only supports up to v${SUPPORTED_PAYLOAD_SCHEMA_VERSION}. Update the app.`,
    );
  }
}

/** Remote write paths (submit, approve, decline, discard) need a compatible backend. */
export function canUseRemoteWrite(compatibility) {
  if (FORCE_COMPATIBILITY_PREVIEW) return false;
  if (!compatibility) return isCompatibilityFailOpen();
  if (compatibility.skipped) {
    return compatibility.ok !== false;
  }
  if (compatibility.state && WRITE_BLOCKED_STATES.has(compatibility.state)) {
    return false;
  }
  return Boolean(compatibility.ok);
}

export function getActiveCompatibilityDisplay(compatibility) {
  if (FORCE_COMPATIBILITY_PREVIEW) {
    return getPreviewCompatibilityResult();
  }
  return compatibility;
}

export function shouldShowCompatibilityBanner(compatibility, options) {
  return getHeaderBanners(compatibility, options).length > 0;
}

/**
 * Header banners below ScreenHeader title row. Multiple items stack vertically.
 * @returns {Array<{ id: string; variant: 'warning'|'preview'|'info'; message: string; actionLabel?: string; onAction?: () => void }>}
 */
export function getHeaderBanners(compatibility, { loading, canRemoteWrite, onRetry }) {
  if (loading) return [];

  const active = getActiveCompatibilityDisplay(compatibility);

  if (active.preview || active.state === COMPATIBILITY_STATE.PREVIEW) {
    return [
      {
        id: 'compat-preview',
        variant: 'preview',
        message: `[Preview] ${active.message}`,
      },
    ];
  }

  if (canRemoteWrite || !active.message) {
    return [];
  }

  if (active.skipped && active.state === COMPATIBILITY_STATE.CHECK_SKIPPED) {
    return [];
  }

  return [
    {
      id: 'compat-block',
      variant: 'warning',
      message: active.message,
      actionLabel: onRetry ? 'Retry' : undefined,
      onAction: onRetry,
    },
  ];
}

export { COMPATIBILITY_STATE };
