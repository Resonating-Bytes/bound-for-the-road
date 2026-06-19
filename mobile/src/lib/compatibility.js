import {
  APP_VERSION,
  MIN_BACKEND_REVISION,
  REQUIRED_BACKEND_CAPABILITIES,
  SUPPORTED_PAYLOAD_SCHEMA_VERSION,
  FORCE_COMPATIBILITY_PREVIEW,
} from '../config/compatibility';
import { getSupabase, isSupabaseConfigured } from './supabase';

/** Cached result from the latest startup compatibility check. */
let cachedCompatibility = { ok: true, skipped: true };

export function setCachedCompatibility(result) {
  cachedCompatibility = result ?? { ok: true, skipped: true };
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
  if (compatibility?.preview) return 'Preview (forced banner)';
  if (compatibility?.skipped) {
    return compatibility.warning ? 'Check skipped (server)' : 'Check skipped';
  }
  if (compatibility?.appOutdated) return 'App update required';
  if (compatibility?.backendStale) return 'Server update required';
  if (compatibility?.updateOptional) return 'App update available';
  if (compatibility?.ok) return 'Compatible';
  return 'Unknown';
}

/** Plain-language status for Settings (user-actionable only). */
export function getSettingsCompatibilityLabel(compatibility) {
  if (compatibility?.preview) return 'Preview mode';
  if (compatibility?.skipped) {
    return compatibility.warning ? 'Could not check for updates' : 'Update check skipped';
  }
  if (compatibility?.appOutdated) return 'Update required';
  if (compatibility?.backendStale) {
    return 'Submit and approval sync temporarily unavailable';
  }
  if (compatibility?.updateOptional) return 'Update available';
  if (compatibility?.ok) return 'Up to date';
  return 'Unknown';
}

/**
 * @returns {{
 *   ok: boolean;
 *   skipped?: boolean;
 *   appOutdated?: boolean;
 *   backendStale?: boolean;
 *   missingCapabilities?: string[];
 *   message?: string;
 *   remote?: Record<string, unknown>;
 * }}
 */
export function evaluateBackendCompatibility(remote) {
  if (!remote) {
    return { ok: false, message: 'Compatibility check returned no data.' };
  }

  const appOutdated = compareAppVersions(APP_VERSION, remote.min_app_version) < 0;
  const backendStale = !isBackendRevisionSupported(remote.backend_revision);
  const caps = missingCapabilities(remote.capabilities ?? []);

  if (appOutdated) {
    return {
      ok: false,
      appOutdated: true,
      message: `This app (${APP_VERSION}) is older than required (${remote.min_app_version}). Please update.`,
      remote,
    };
  }

  if (backendStale) {
    return {
      ok: false,
      backendStale: true,
      message:
        'Server setup is behind this app version. Submit and approval sync are disabled until migrations are applied.',
      remote,
    };
  }

  if (caps.length) {
    return {
      ok: false,
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
      backendStale: true,
      message: 'Server expects a newer session format than this app supports. Please update the app.',
      remote,
    };
  }

  const updateStatus = getAppUpdateStatus(remote);

  return {
    ok: true,
    remote,
    updateOptional: updateStatus.optional,
    latestAppVersion: updateStatus.latestVersion,
  };
}

export async function fetchBackendCompatibility() {
  if (!isSupabaseConfigured()) {
    return { ok: true, skipped: true };
  }

  const { data, error } = await getSupabase().rpc('get_app_compatibility');
  if (error) {
    return {
      ok: true,
      skipped: true,
      warning: error.message,
    };
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

export function canUseRemoteSync(compatibility) {
  if (!compatibility || compatibility.skipped) return true;
  return compatibility.ok !== false || (!compatibility.backendStale && !compatibility.missingCapabilities?.length);
}

/** Remote write paths (submit, approve, decline, withdraw) need a compatible backend. */
export function canUseRemoteWrite(compatibility) {
  if (FORCE_COMPATIBILITY_PREVIEW) return false;
  if (!compatibility || compatibility.skipped) return true;
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

  if (active.preview) {
    return [
      {
        id: 'compat-preview',
        variant: 'preview',
        message: `[Preview] ${active.message}`,
      },
    ];
  }

  if (active.skipped || canRemoteWrite || !active.message) {
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
