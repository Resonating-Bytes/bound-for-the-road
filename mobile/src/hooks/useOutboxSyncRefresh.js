import { useEffect, useRef } from 'react';
import { useSync } from '../context/SyncContext';

/** Re-fetch when pending outbox rows finish syncing in the background. */
export function useOutboxSyncRefresh(refresh) {
  const { pendingCount } = useSync();
  const prevPendingRef = useRef(pendingCount);

  useEffect(() => {
    if (prevPendingRef.current > pendingCount) {
      refresh();
    }
    prevPendingRef.current = pendingCount;
  }, [pendingCount, refresh]);
}
