import { getRemoteSyncAt } from '../db/queries';
import { pullAndMergeTeenSessions, fetchAndStoreTeenSyncWatermark } from './sessionSync';

export function isSyncStaleError(error) {
  const message = String(error?.message ?? error ?? '');
  return message.includes('sync_stale');
}

/** Re-merge teen data and retry once when the server reports a stale sync watermark. */
export async function withTeenSyncRetry(teenUserId, operation) {
  try {
    return await operation(getRemoteSyncAt(teenUserId));
  } catch (error) {
    if (!isSyncStaleError(error)) throw error;
    await pullAndMergeTeenSessions(teenUserId);
    return await operation(getRemoteSyncAt(teenUserId));
  }
}

/** Refresh adult view of a teen's watermark and retry once. */
export async function withAdultTeenSyncRetry(adultUserId, teenUserId, operation) {
  try {
    return await operation(getRemoteSyncAt(adultUserId, teenUserId));
  } catch (error) {
    if (!isSyncStaleError(error)) throw error;
    await fetchAndStoreTeenSyncWatermark(adultUserId, teenUserId);
    return await operation(getRemoteSyncAt(adultUserId, teenUserId));
  }
}
