const listeners = new Set();

export function emitApprovalPushReceived(data) {
  if (!data?.type) return;
  for (const listener of listeners) {
    listener(data);
  }
}

export function onApprovalPushReceived(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
