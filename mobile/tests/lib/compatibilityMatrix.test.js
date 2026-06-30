import { COMPATIBILITY_STATE } from '../../src/config/compatibilityStates';
import {
  evaluateBackendCompatibility,
  canUseRemoteWrite,
  fetchBackendCompatibility,
} from '../../src/lib/compatibility';
import { BACKEND_CAPABILITIES } from '../../src/config/compatibility';

jest.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(),
  getSupabase: jest.fn(),
}));

const fullCapabilities = Object.values(BACKEND_CAPABILITIES);

const compatibleRemote = {
  backend_revision: '20260630120000',
  min_app_version: '1.0.0',
  latest_app_version: '1.5.1',
  payload_schema_version: '2',
  capabilities: fullCapabilities,
};

/** Documented compatibility matrix — keep aligned with docs/RPC_CONTRACT.md */
const MATRIX = [
  {
    name: 'compatible backend',
    remote: compatibleRemote,
    expectState: COMPATIBILITY_STATE.COMPATIBLE,
    expectWrite: true,
  },
  {
    name: 'app below min_app_version',
    remote: { ...compatibleRemote, min_app_version: '99.0.0' },
    expectState: COMPATIBILITY_STATE.UPDATE_REQUIRED,
    expectWrite: false,
  },
  {
    name: 'backend below MIN_BACKEND_REVISION',
    remote: { ...compatibleRemote, backend_revision: '20260618120000' },
    expectState: COMPATIBILITY_STATE.BACKEND_STALE,
    expectWrite: false,
  },
  {
    name: 'missing register_push_token capability',
    remote: {
      ...compatibleRemote,
      capabilities: fullCapabilities.filter((c) => c !== BACKEND_CAPABILITIES.REGISTER_PUSH_TOKEN),
    },
    expectState: COMPATIBILITY_STATE.CAPABILITY_MISSING,
    expectWrite: false,
  },
  {
    name: 'payload schema too new',
    remote: { ...compatibleRemote, payload_schema_version: '99' },
    expectState: COMPATIBILITY_STATE.PAYLOAD_SCHEMA_UNSUPPORTED,
    expectWrite: false,
  },
  {
    name: 'optional update only',
    remote: { ...compatibleRemote, latest_app_version: '99.0.0' },
    expectState: COMPATIBILITY_STATE.UPDATE_AVAILABLE,
    expectWrite: true,
  },
];

describe('compatibility matrix', () => {
  test.each(MATRIX)('$name', ({ remote, expectState, expectWrite }) => {
    const result = evaluateBackendCompatibility(remote);
    expect(result.state).toBe(expectState);
    expect(canUseRemoteWrite(result)).toBe(expectWrite);
  });
});

describe('fetchBackendCompatibility RPC paths', () => {
  const env = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
    jest.resetModules();
  });

  test('skips when Supabase is not configured', async () => {
    const { isSupabaseConfigured: configured } = require('../../src/lib/supabase');
    configured.mockReturnValue(false);
    const result = await fetchBackendCompatibility();
    expect(result.state).toBe(COMPATIBILITY_STATE.CHECK_SKIPPED);
    expect(canUseRemoteWrite(result)).toBe(true);
  });

  test('fail-open on RPC error when policy is open', async () => {
    process.env.EXPO_PUBLIC_COMPATIBILITY_RPC_FAIL_POLICY = 'open';
    jest.resetModules();
    const { isSupabaseConfigured: configured, getSupabase: supabase } = require('../../src/lib/supabase');
    const compat = require('../../src/lib/compatibility');
    configured.mockReturnValue(true);
    supabase.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'function not found' } }),
    });

    const result = await compat.fetchBackendCompatibility();
    expect(result.ok).toBe(true);
    expect(result.state).toBe(COMPATIBILITY_STATE.CHECK_SKIPPED);
    expect(compat.canUseRemoteWrite(result)).toBe(true);
  });

  test('fail-closed on RPC error when policy is closed', async () => {
    process.env.EXPO_PUBLIC_COMPATIBILITY_RPC_FAIL_POLICY = 'closed';
    jest.resetModules();
    const { isSupabaseConfigured: configured, getSupabase: supabase } = require('../../src/lib/supabase');
    const compat = require('../../src/lib/compatibility');
    configured.mockReturnValue(true);
    supabase.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'function not found' } }),
    });

    const result = await compat.fetchBackendCompatibility();
    expect(result.ok).toBe(false);
    expect(result.state).toBe(COMPATIBILITY_STATE.CHECK_ERROR);
    expect(compat.canUseRemoteWrite(result)).toBe(false);
  });
});
