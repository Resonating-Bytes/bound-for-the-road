import { getSupabase, isSupabaseConfigured } from './supabase';
import { APP_VERSION } from '../config/compatibility';

export const PUSH_EVENTS = {
  SESSION_SUBMITTED: 'session_submitted',
  SESSION_APPROVED: 'session_approved',
  SESSION_DECLINED: 'session_declined',
  SESSION_DISCARDED: 'session_withdrawn',
};

export async function notifyApprovalPush(event, { sessionId, requestHash, nearbyAdultIds } = {}) {
  if (!isSupabaseConfigured()) return;

  const body = { event, sessionId, requestHash, clientVersion: APP_VERSION };
  if (Array.isArray(nearbyAdultIds) && nearbyAdultIds.length) {
    body.nearbyAdultIds = nearbyAdultIds;
  }

  try {
    const { error } = await getSupabase().functions.invoke('send-approval-push', {
      body,
    });
    if (error) {
      console.warn('Approval push invoke failed:', error.message);
    }
  } catch (e) {
    console.warn('Approval push invoke failed:', e.message ?? e);
  }
}
