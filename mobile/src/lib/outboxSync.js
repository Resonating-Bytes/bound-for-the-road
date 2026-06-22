import { AppState } from 'react-native';
import {
  pushApprovalToRemote,
  pushDeclineToRemote,
  pushSubmittedSessionToRemote,
  pushWithdrawToRemote,
} from './submissions';
import { pullAndMergeTeenSessions } from './sessionSync';
import { isNetworkOnline, subscribeNetwork } from './network';
import { isSupabaseConfigured, getSupabase } from './supabase';
import { canUseRemoteWrite, getCachedCompatibility } from './compatibility';
import {
  getSessionById,
  getSubmissionForSession,
  getUserById,
  listPendingOutboxRowsForUser,
  markOutboxRowSynced,
} from '../db/queries';

const OPERATIONS = {
  session_submitted: processSessionSubmitted,
  session_approved: processSessionApproved,
  session_declined: processSessionDeclined,
  session_withdrawn: processSessionWithdrawn,
};

let flushInFlight = null;
let retryTimer = null;
let retryAttempt = 0;
let lastError = null;
let notifyState = () => {};
let activeAuthUserId = null;

const MAX_BACKOFF_MS = 5 * 60 * 1000;

async function resolveAuthUserId() {
  if (!isSupabaseConfigured()) return null;
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  return user?.id ?? null;
}

function canFlush() {
  if (!isSupabaseConfigured()) return false;
  if (!canUseRemoteWrite(getCachedCompatibility())) return false;
  return true;
}

async function syncInboundForPendingUsers(pendingRows) {
  const teenUserIds = new Set();

  for (const row of pendingRows) {
    if (row.userId) {
      const user = getUserById(row.userId);
      if (user?.role === 'teen') {
        teenUserIds.add(row.userId);
      }
    }

    if (row.operation !== 'session_submitted') continue;
    try {
      const payload = JSON.parse(row.payloadJson);
      const session = getSessionById(payload?.sessionId);
      if (session?.teenUserId) {
        teenUserIds.add(session.teenUserId);
      }
    } catch {
      // ignore malformed payloads
    }
  }

  for (const teenUserId of teenUserIds) {
    await pullAndMergeTeenSessions(teenUserId);
  }
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

  if (session.timeInvalid) {
    console.warn(`Outbox: deferring session_submitted for ${sessionId} until overlap is resolved`);
    return;
  }

  await pushSubmittedSessionToRemote(sessionId, session, submission);
}

async function processSessionApproved(row, payload) {
  if (!payload?.sessionId || !payload?.requestHash) {
    markOutboxRowSynced(row.id);
    return;
  }

  await pushApprovalToRemote(payload);
  markOutboxRowSynced(row.id);
}

async function processSessionDeclined(row, payload) {
  if (!payload?.sessionId || !payload?.requestHash) {
    markOutboxRowSynced(row.id);
    return;
  }

  await pushDeclineToRemote(payload);
  markOutboxRowSynced(row.id);
}

async function processSessionWithdrawn(row, payload) {
  if (!payload?.sessionId || !payload?.requestHash) {
    markOutboxRowSynced(row.id);
    return;
  }

  await pushWithdrawToRemote(payload);
  markOutboxRowSynced(row.id);
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
 * Pulls and merges teen sessions before flushing so validity runs on the full set.
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

    const authUserId = await resolveAuthUserId();
    activeAuthUserId = authUserId;
    if (!authUserId) {
      notifyState();
      return { processed: 0, failed: false };
    }

    const pending = listPendingOutboxRowsForUser(authUserId);
    if (!pending.length) {
      lastError = null;
      retryAttempt = 0;
      clearRetry();
      notifyState();
      return { processed: 0, failed: false };
    }

    try {
      await syncInboundForPendingUsers(pending);
    } catch (e) {
      lastError = e.message ?? 'Sync failed';
      console.warn('Inbound sync before outbox flush failed:', lastError);
      scheduleRetry();
      notifyState();
      return { processed: 0, failed: true };
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

export function getOutboxSyncSnapshot(userId = activeAuthUserId) {
  const pending = userId ? listPendingOutboxRowsForUser(userId) : [];
  return {
    pendingCount: pending.length,
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

