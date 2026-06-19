import { useEffect } from 'react';
import { onApprovalPushReceived } from '../lib/pushRefreshEvents';

/** Re-fetch when a matching approval push arrives or is tapped. */
export function useApprovalPushRefresh(pushTypes, refresh) {
  const types = Array.isArray(pushTypes) ? pushTypes : [pushTypes];

  useEffect(() => {
    return onApprovalPushReceived((data) => {
      if (types.includes(data.type)) refresh();
    });
  }, [refresh, types.join('|')]);
}
