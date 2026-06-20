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
} from '../../src/lib/compatibility';

describe('compatibility', () => {
  const compatibleRemote = {
    backend_revision: '20260623120000',
    min_app_version: '1.0.0',
    payload_schema_version: '1',
    capabilities: [
      'decline_submission',
      'send_approval_push_session_submitted',
      'send_approval_push_session_approved',
      'send_approval_push_session_declined',
      'send_approval_push_session_withdrawn',
      'accept_link_invite',
    ],
  };

  test('compareAppVersions orders semver tuples', () => {
    expect(compareAppVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
    expect(compareAppVersions('0.9.9', '1.0.0')).toBeLessThan(0);
  });

  test('evaluateBackendCompatibility accepts current backend', () => {
    const result = evaluateBackendCompatibility(compatibleRemote);
    expect(result.ok).toBe(true);
  });

  test('evaluateBackendCompatibility flags stale backend revision', () => {
    const result = evaluateBackendCompatibility({
      ...compatibleRemote,
      backend_revision: '20260618120000',
    });
    expect(result.ok).toBe(false);
    expect(result.backendStale).toBe(true);
  });

  test('evaluateBackendCompatibility flags outdated app', () => {
    const result = evaluateBackendCompatibility({
      ...compatibleRemote,
      min_app_version: '9.0.0',
    });
    expect(result.ok).toBe(false);
    expect(result.appOutdated).toBe(true);
  });

  test('missingCapabilities reports required gaps', () => {
    expect(missingCapabilities(['decline_submission'])).toContain(
      'send_approval_push_session_withdrawn',
    );
  });

  test('assertPayloadSchemaSupported allows current and rejects newer', () => {
    expect(() => assertPayloadSchemaSupported(1)).not.toThrow();
    expect(() => assertPayloadSchemaSupported(99)).toThrow(/schema v99/);
  });

  test('assertRemoteWriteAllowed respects cached compatibility', () => {
    setCachedCompatibility({ ok: true });
    expect(() => assertRemoteWriteAllowed()).not.toThrow();

    setCachedCompatibility({
      ok: false,
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
    expect(getSettingsCompatibilityLabel({ ok: true })).toBe('Up to date');
    expect(getSettingsCompatibilityLabel({ backendStale: true })).toBe(
      'Submit and approval sync temporarily unavailable',
    );
  });

  test('getHeaderBanners returns warning banner when writes blocked', () => {
    const banners = getHeaderBanners(
      { ok: false, backendStale: true, message: 'Server behind.' },
      { loading: false, canRemoteWrite: false, onRetry: jest.fn() },
    );
    expect(banners).toHaveLength(1);
    expect(banners[0].variant).toBe('warning');
    expect(banners[0].actionLabel).toBe('Retry');
  });

  test('getHeaderBanners returns empty when compatible', () => {
    const banners = getHeaderBanners(
      { ok: true, skipped: false },
      { loading: false, canRemoteWrite: true },
    );
    expect(banners).toHaveLength(0);
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
