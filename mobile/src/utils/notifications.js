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
      body: `Your practice session has been running for ${IL_RULES.nudgeHours} hours. Open TeenDriver to stop or continue.`,
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
