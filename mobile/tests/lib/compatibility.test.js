import {
  compareAppVersions,
  evaluateBackendCompatibility,
  missingCapabilities,
  assertPayloadSchemaSupported,
  assertRemoteWriteAllowed,
  setCachedCompatibility,
  canUseRemoteWrite,
  getCachedCompatibility,
  getAppUpdateStatus,
  getHeaderBanners,
  getSettingsCompatibilityLabel,
  getCompatibilityStatusLabel,
  COMPATIBILITY_STATE,
} from '../../src/lib/compatibility';
import { BACKEND_CAPABILITIES } from '../../src/config/compatibility';

describe('compatibility', () => {
  const compatibleRemote = {
    backend_revision: '20260624120000',
    min_app_version: '1.0.0',
    latest_app_version: '1.5.1',
    payload_schema_version: '1',
    capabilities: Object.values(BACKEND_CAPABILITIES),
  };

  test('compareAppVersions orders semver tuples', () => {
    expect(compareAppVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
    expect(compareAppVersions('0.9.9', '1.0.0')).toBeLessThan(0);
  });

  test('evaluateBackendCompatibility accepts current backend', () => {
    const result = evaluateBackendCompatibility(compatibleRemote);
    expect(result.ok).toBe(true);
    expect(result.state).toBe(COMPATIBILITY_STATE.COMPATIBLE);
  });

  test('evaluateBackendCompatibility flags stale backend revision', () => {
    const result = evaluateBackendCompatibility({
      ...compatibleRemote,
      backend_revision: '20260618120000',
    });
    expect(result.ok).toBe(false);
    expect(result.state).toBe(COMPATIBILITY_STATE.BACKEND_STALE);
    expect(result.backendStale).toBe(true);
  });

  test('evaluateBackendCompatibility flags outdated app', () => {
    const result = evaluateBackendCompatibility({
      ...compatibleRemote,
      min_app_version: '9.0.0',
    });
    expect(result.ok).toBe(false);
    expect(result.state).toBe(COMPATIBILITY_STATE.UPDATE_REQUIRED);
    expect(result.appOutdated).toBe(true);
  });

  test('evaluateBackendCompatibility flags missing capabilities', () => {
    const result = evaluateBackendCompatibility({
      ...compatibleRemote,
      capabilities: ['decline_submission'],
    });
    expect(result.ok).toBe(false);
    expect(result.state).toBe(COMPATIBILITY_STATE.CAPABILITY_MISSING);
    expect(result.missingCapabilities?.length).toBeGreaterThan(0);
  });

  test('evaluateBackendCompatibility flags unsupported payload schema', () => {
    const result = evaluateBackendCompatibility({
      ...compatibleRemote,
      payload_schema_version: '99',
    });
    expect(result.ok).toBe(false);
    expect(result.state).toBe(COMPATIBILITY_STATE.PAYLOAD_SCHEMA_UNSUPPORTED);
  });

  test('missingCapabilities reports required gaps', () => {
    expect(missingCapabilities(['decline_submission'])).toContain(
      BACKEND_CAPABILITIES.SEND_APPROVAL_PUSH_SESSION_WITHDRAWN,
    );
  });

  test('assertPayloadSchemaSupported allows current and rejects newer', () => {
    expect(() => assertPayloadSchemaSupported(1)).not.toThrow();
    expect(() => assertPayloadSchemaSupported(99)).toThrow(/schema v99/);
  });

  test('assertRemoteWriteAllowed respects cached compatibility', () => {
    setCachedCompatibility({ ok: true, state: COMPATIBILITY_STATE.COMPATIBLE });
    expect(() => assertRemoteWriteAllowed()).not.toThrow();

    setCachedCompatibility({
      ok: false,
      state: COMPATIBILITY_STATE.BACKEND_STALE,
      backendStale: true,
      message: 'blocked',
    });
    expect(() => assertRemoteWriteAllowed()).toThrow('blocked');
    expect(canUseRemoteWrite(getCachedCompatibility())).toBe(false);
  });

  test('evaluateBackendCompatibility flags optional update when below latest', () => {
    const result = evaluateBackendCompatibility({
      ...compatibleRemote,
      min_app_version: '1.0.0',
      latest_app_version: '9.9.9',
    });
    expect(result.ok).toBe(true);
    expect(result.state).toBe(COMPATIBILITY_STATE.UPDATE_AVAILABLE);
    expect(result.updateOptional).toBe(true);
    expect(getAppUpdateStatus(result.remote).optional).toBe(true);
  });

  test('getAppUpdateStatus marks required below min', () => {
    const status = getAppUpdateStatus({
      min_app_version: '2.0.0',
      latest_app_version: '2.0.0',
    });
    expect(status.required).toBe(true);
    expect(status.optional).toBe(false);
  });

  test('getSettingsCompatibilityLabel uses plain language', () => {
    expect(getSettingsCompatibilityLabel({ ok: true, state: COMPATIBILITY_STATE.COMPATIBLE })).toBe(
      'Up to date',
    );
    expect(
      getSettingsCompatibilityLabel({ state: COMPATIBILITY_STATE.CAPABILITY_MISSING }),
    ).toBe('Server setup incomplete — sync disabled');
  });

  test('getCompatibilityStatusLabel maps explicit states', () => {
    expect(getCompatibilityStatusLabel({ state: COMPATIBILITY_STATE.CHECK_ERROR })).toBe(
      'Check failed (server)',
    );
  });

  test('getHeaderBanners returns warning banner when writes blocked', () => {
    const banners = getHeaderBanners(
      {
        ok: false,
        state: COMPATIBILITY_STATE.BACKEND_STALE,
        backendStale: true,
        message: 'Server behind.',
      },
      { loading: false, canRemoteWrite: false, onRetry: jest.fn() },
    );
    expect(banners).toHaveLength(1);
    expect(banners[0].variant).toBe('warning');
    expect(banners[0].actionLabel).toBe('Retry');
  });

  test('getHeaderBanners returns empty when compatible', () => {
    const banners = getHeaderBanners(
      { ok: true, state: COMPATIBILITY_STATE.COMPATIBLE },
      { loading: false, canRemoteWrite: true },
    );
    expect(banners).toHaveLength(0);
  });

  test('canUseRemoteWrite allows fail-open skip', () => {
    expect(
      canUseRemoteWrite({
        ok: true,
        skipped: true,
        state: COMPATIBILITY_STATE.CHECK_SKIPPED,
        warning: 'rpc missing',
      }),
    ).toBe(true);
  });

  test('canUseRemoteWrite blocks fail-closed check error', () => {
    expect(
      canUseRemoteWrite({
        ok: false,
        skipped: true,
        state: COMPATIBILITY_STATE.CHECK_ERROR,
        message: 'Could not verify',
      }),
    ).toBe(false);
  });

  test('getHeaderBanners shows banner for fail-closed check error', () => {
    const banners = getHeaderBanners(
      {
        ok: false,
        skipped: true,
        state: COMPATIBILITY_STATE.CHECK_ERROR,
        message: 'Could not verify server compatibility.',
      },
      { loading: false, canRemoteWrite: false, onRetry: jest.fn() },
    );
    expect(banners).toHaveLength(1);
    expect(banners[0].message).toContain('Could not verify');
  });
});

describe('getAppUpdateUrl', () => {
  const env = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
  });

  afterAll(() => {
    process.env = env;
  });

  test('prefers platform-specific URL', () => {
    process.env.EXPO_PUBLIC_APP_UPDATE_URL_IOS = 'https://apps.apple.com/app/example';
    process.env.EXPO_PUBLIC_APP_UPDATE_URL = 'https://example.com/update';
    const { getAppUpdateUrl } = require('../../src/config/compatibility');
    expect(getAppUpdateUrl('ios')).toBe('https://apps.apple.com/app/example');
  });

  test('falls back to generic URL', () => {
    delete process.env.EXPO_PUBLIC_APP_UPDATE_URL_IOS;
    process.env.EXPO_PUBLIC_APP_UPDATE_URL = 'https://example.com/update';
    const { getAppUpdateUrl } = require('../../src/config/compatibility');
    expect(getAppUpdateUrl('ios')).toBe('https://example.com/update');
  });
});
