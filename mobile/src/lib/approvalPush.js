import { getSupabase, isSupabaseConfigured } from './supabase';

export const PUSH_EVENTS = {
  SESSION_SUBMITTED: 'session_submitted',
  SESSION_APPROVED: 'session_approved',
  SESSION_DECLINED: 'session_declined',
  SESSION_WITHDRAWN: 'session_withdrawn',
};

export async function notifyApprovalPush(event, { sessionId, requestHash }) {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await getSupabase().functions.invoke('send-approval-push', {
      body: { event, sessionId, requestHash },
    });
    if (error) {
      console.warn('Approval push invoke failed:', error.message);
    }
  } catch (e) {
    console.warn('Approval push invoke failed:', e.message ?? e);
  }
}
