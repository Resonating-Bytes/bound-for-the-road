import { AppState } from 'react-native';
import {
  getSessionById,
  getSubmissionForSession,
  listPendingOutboxRows,
  markOutboxRowSynced,
} from '../db/queries';
import { canUseRemoteWrite, getCachedCompatibility } from './compatibility';
import { pushSubmittedSessionToRemote } from './submissions';
import { isNetworkOnline, subscribeNetwork } from './network';
import { isSupabaseConfigured } from './supabase';

const OPERATIONS = {
  session_submitted: processSessionSubmitted,
};

let flushInFlight = null;
let retryTimer = null;
let retryAttempt = 0;
let lastError = null;
let notifyState = () => {};

const MAX_BACKOFF_MS = 5 * 60 * 1000;

function canFlush() {
  if (!isSupabaseConfigured()) return false;
  if (!canUseRemoteWrite(getCachedCompatibility())) return false;
  return true;
}

async function processSessionSubmitted(row, payload) {
  const sessionId = payload?.sessionId;
  if (!sessionId) {
    markOutboxRowSynced(row.id);
    return;
  }

  const session = getSessionById(sessionId);
  const submission = getSubmissionForSession(sessionId);
  if (!session || !submission || submission.superseded) {
    markOutboxRowSynced(row.id);
    return;
  }

  await pushSubmittedSessionToRemote(sessionId, session, submission);
}

function scheduleRetry() {
  if (retryTimer) return;
  const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** retryAttempt);
  retryAttempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    flushOutbox().catch(() => {});
  }, delay);
}

function clearRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

/**
 * Replay pending outbox rows when online and remote writes are allowed.
 * @returns {{ processed: number; failed: boolean }}
 */
export async function flushOutbox() {
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    if (!canFlush()) {
      notifyState();
      return { processed: 0, failed: false };
    }

    if (!(await isNetworkOnline())) {
      notifyState();
      return { processed: 0, failed: false };
    }

    const pending = listPendingOutboxRows();
    if (!pending.length) {
      lastError = null;
      retryAttempt = 0;
      clearRetry();
      notifyState();
      return { processed: 0, failed: false };
    }

    let processed = 0;
    for (const row of pending) {
      let payload;
      try {
        payload = JSON.parse(row.payloadJson);
      } catch {
        markOutboxRowSynced(row.id);
        processed += 1;
        continue;
      }

      const handler = OPERATIONS[row.operation];
      if (!handler) {
        console.warn(`Unknown outbox operation: ${row.operation}`);
        markOutboxRowSynced(row.id);
        processed += 1;
        continue;
      }

      try {
        await handler(row, payload);
        processed += 1;
      } catch (e) {
        lastError = e.message ?? 'Sync failed';
        console.warn('Outbox replay failed:', lastError);
        scheduleRetry();
        notifyState();
        return { processed, failed: true };
      }
    }

    lastError = null;
    retryAttempt = 0;
    clearRetry();
    notifyState();
    return { processed, failed: false };
  })();

  try {
    return await flushInFlight;
  } finally {
    flushInFlight = null;
    notifyState();
  }
}

export function getOutboxSyncSnapshot() {
  return {
    pendingCount: listPendingOutboxRows().length,
    lastError,
    isSyncing: Boolean(flushInFlight),
  };
}

/** Subscribe to connectivity + foreground; call stop() on unmount. */
export function startOutboxSync(onStateChange) {
  notifyState = onStateChange ?? (() => {});

  const trigger = () => {
    flushOutbox().catch(() => {});
  };

  const unsubscribeNet = subscribeNetwork((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      trigger();
    } else {
      notifyState();
    }
  });

  const appSub = AppState.addEventListener('change', (next) => {
    if (next === 'active') trigger();
  });

  trigger();

  return () => {
    notifyState = () => {};
    unsubscribeNet();
    appSub.remove();
    clearRetry();
  };
}
