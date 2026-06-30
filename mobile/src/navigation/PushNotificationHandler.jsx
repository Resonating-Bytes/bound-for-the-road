import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { isSupabaseConfigured } from '../lib/supabase';
import { registerPushToken } from '../lib/pushTokens';
import { emitApprovalPushReceived } from '../lib/pushRefreshEvents';
import { navigateFromPushPayload } from './navigationRef';
import { isSupervisorRole } from '../utils/roles';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function PushNotificationHandler({ userId, role }) {
  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return undefined;

    registerPushToken(userId).catch((e) => {
      console.warn('Push registration failed:', e.message);
    });

    function handleApprovalPushData(data) {
      if (!data?.type) return;
      const teenOnly = data.type === 'session_approved' || data.type === 'session_declined';
      const adultOnly = data.type === 'pending_approval' || data.type === 'submission_withdrawn';
      if (teenOnly && role !== 'teen') return;
      if (adultOnly && !isSupervisorRole(role)) return;
      if (teenOnly || adultOnly) {
        emitApprovalPushReceived(data);
      }
    }

    function handleResponse(response) {
      const data = response?.notification?.request?.content?.data;
      handleApprovalPushData(data);
      navigateFromPushPayload(data, role);
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      handleApprovalPushData(notification?.request?.content?.data);
    });

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [userId, role]);

  return null;
}
