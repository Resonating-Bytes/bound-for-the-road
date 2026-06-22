import { isSyncStaleError } from '../../src/lib/syncRetry';

describe('isSyncStaleError', () => {
  test('detects sync_stale in message', () => {
    expect(isSyncStaleError(new Error('sync_stale'))).toBe(true);
    expect(isSyncStaleError({ message: 'sync_stale' })).toBe(true);
    expect(isSyncStaleError(new Error('network failed'))).toBe(false);
  });
});
