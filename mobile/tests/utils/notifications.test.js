jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
}));

import * as Notifications from 'expo-notifications';
import {
  cancelSessionNotifications,
  cancelSessionNotificationsForIds,
} from '../../src/utils/notifications';

describe('notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('cancelSessionNotifications clears nudge and stale identifiers', async () => {
    await cancelSessionNotifications('session-123');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'session-nudge-session-123',
    );
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'session-stale-session-123',
    );
  });

  test('cancelSessionNotificationsForIds cancels each session', async () => {
    await cancelSessionNotificationsForIds(['a', 'b']);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(4);
  });

  test('cancelSessionNotificationsForIds no-ops on empty list', async () => {
    await cancelSessionNotificationsForIds([]);
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});
