import NetInfo from '@react-native-community/netinfo';

function isReachableState(state) {
  if (state.isConnected !== true) return false;
  if (state.isInternetReachable === false) return false;
  if (state.type === 'none' || state.type === 'unknown') return false;
  return true;
}

/** True when the device likely has a route to the internet (best-effort). */
export async function isNetworkOnline() {
  const state = await NetInfo.fetch();
  return isReachableState(state);
}

export function isNetworkOnlineSync(state) {
  return isReachableState(state ?? {});
}

export function isNetworkFailureError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase();
  return (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('load failed')
  );
}

export function subscribeNetwork(listener) {
  return NetInfo.addEventListener(listener);
}
