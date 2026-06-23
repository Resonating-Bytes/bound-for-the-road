/** Queue auth deep links that arrive before App.jsx mounts its handler. */
const listeners = new Set();
const pendingUrls = [];

export function subscribeAuthLinkUrls(handler) {
  listeners.add(handler);
  pendingUrls.forEach((url) => handler(url));
  pendingUrls.length = 0;
  return () => listeners.delete(handler);
}

export function publishAuthLinkUrl(url) {
  if (listeners.size === 0) {
    pendingUrls.push(url);
    return;
  }
  listeners.forEach((handler) => handler(url));
}
