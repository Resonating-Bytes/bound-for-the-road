import * as Notifications from 'expo-notifications';
import { IL_RULES } from '../config/states/IL';

let handlerConfigured = false;

function configureNotificationHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationPermissions() {
  configureNotificationHandler();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleSessionNudge(sessionId, startedAt) {
  configureNotificationHandler();
  await ensureNotificationPermissions();
  const triggerAt = new Date(startedAt);
  triggerAt.setHours(triggerAt.getHours() + IL_RULES.nudgeHours);

  if (triggerAt.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `session-nudge-${sessionId}`,
    content: {
      title: 'Still driving?',
      body: `Your practice session has been running for ${IL_RULES.nudgeHours} hours. Open Bound for the Road to stop or continue.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
    },
  });
}

export async function cancelSessionNudge(sessionId) {
  configureNotificationHandler();
  try {
    await Notifications.cancelScheduledNotificationAsync(`session-nudge-${sessionId}`);
  } catch {
    // notification may not exist
  }
}

/** Cancel all local scheduled notifications tied to a session (nudge + stale-expired). */
export async function cancelSessionNotifications(sessionId) {
  configureNotificationHandler();
  await cancelSessionNudge(sessionId);
  try {
    await Notifications.cancelScheduledNotificationAsync(`session-stale-${sessionId}`);
  } catch {
    // notification may not exist
  }
}

export async function cancelSessionNotificationsForIds(sessionIds) {
  if (!sessionIds?.length) return;
  await Promise.all(sessionIds.map((sessionId) => cancelSessionNotifications(sessionId)));
}

export async function notifyStaleSessionExpired(sessionId) {
  configureNotificationHandler();
  await ensureNotificationPermissions();
  await Notifications.scheduleNotificationAsync({
    identifier: `session-stale-${sessionId}`,
    content: {
      title: 'Session auto-stopped',
      body: `Your practice session was running over ${IL_RULES.staleActiveHours} hours and was stopped. Review and save or discard.`,
    },
    trigger: null,
  });
}
