/** Queue auth deep links that arrive before App.jsx mounts its handler. */
const listeners = new Set();
const pendingUrls = [];
let lastPublishedUrl = null;
let lastPublishedAt = 0;
const DEDUPE_MS = 3000;

export function subscribeAuthLinkUrls(handler) {
  listeners.add(handler);
  pendingUrls.forEach((url) => handler(url));
  pendingUrls.length = 0;
  return () => listeners.delete(handler);
}

export function publishAuthLinkUrl(url) {
  if (!url) return;

  const now = Date.now();
  if (url === lastPublishedUrl && now - lastPublishedAt < DEDUPE_MS) return;
  lastPublishedUrl = url;
  lastPublishedAt = now;

  if (listeners.size === 0) {
    if (!pendingUrls.includes(url)) {
      pendingUrls.push(url);
    }
    return;
  }
  listeners.forEach((handler) => handler(url));
}
