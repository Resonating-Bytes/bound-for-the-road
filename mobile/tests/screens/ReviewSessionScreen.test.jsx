jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ userId: 'teen-001' }),
}));

jest.mock('../../src/context/CompatibilityContext', () => ({
  useCompatibility: () => ({ canRemoteWrite: true }),
}));

jest.mock('../../src/db/queries', () => ({
  getSessionById: jest.fn(),
  hasActiveLink: jest.fn(() => true),
  discardDraft: jest.fn(),
  resumeSession: jest.fn(),
  softDeleteSession: jest.fn(),
  restoreSavedSession: jest.fn(),
}));

jest.mock('../../src/lib/submissions', () => ({
  submitSessionForApproval: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/components/ScreenHeader', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    ScreenHeader: ({ title, onBack }) => (
      <View>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back">
            <Text>Back</Text>
          </Pressable>
        ) : null}
        <Text>{title}</Text>
      </View>
    ),
  };
});

jest.mock('../../src/utils/notifications', () => ({
  cancelSessionNotifications: jest.fn(() => Promise.resolve()),
  scheduleSessionNudge: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/config/timezoneCentroids', () => ({
  getDeviceTimezone: () => 'America/Chicago',
  timezoneCentroid: () => ({ lat: 41.8781, lon: -87.6298 }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReviewSessionScreen } from '../../src/screens/ReviewSessionScreen';
import { getSessionById } from '../../src/db/queries';

const navigation = {
  reset: jest.fn(),
  replace: jest.fn(),
};

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderReview(params) {
  return render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <ReviewSessionScreen route={{ params }} navigation={navigation} />
    </SafeAreaProvider>,
  );
}

const draftSession = {
  id: 'sess-001',
  status: 'draft',
  startedAt: '2026-06-01T14:00:00.000Z',
  endedAt: '2026-06-01T15:00:00.000Z',
  dayNight: 'day',
  notes: '',
  requestHash: null,
};

describe('ReviewSessionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionById.mockReturnValue(draftSession);
  });

  test('shows Resume on fresh draft review', async () => {
    const { getByText, queryByText } = await renderReview({ sessionId: 'sess-001', editing: false });
    expect(getByText('Review session')).toBeTruthy();
    expect(getByText('Resume')).toBeTruthy();
    expect(getByText('Discard')).toBeTruthy();
    expect(getByText('Submit for approval')).toBeTruthy();
    expect(queryByText('Back')).toBeNull();
  });

  test('shows back to dashboard when session is no longer draft', async () => {
    getSessionById.mockReturnValue({ ...draftSession, status: 'saved' });
    const { getByText, queryByText } = await renderReview({ sessionId: 'sess-001', editing: false });
    expect(getByText('Back to dashboard')).toBeTruthy();
    expect(queryByText('Submit for approval')).toBeNull();
  });

  test('hides Resume and shows Back when editing saved entry', async () => {
    const { getByText, queryByText, getByLabelText } = await renderReview({
      sessionId: 'sess-001',
      editing: true,
      editBackup: { notes: '', requestHash: 'abc', payloadJson: '{}' },
    });
    expect(getByText('Edit session')).toBeTruthy();
    expect(queryByText('Resume')).toBeNull();
    expect(getByLabelText('Go back')).toBeTruthy();
    expect(getByText('Discard edits')).toBeTruthy();
    expect(getByText('Delete from log')).toBeTruthy();
  });
});
