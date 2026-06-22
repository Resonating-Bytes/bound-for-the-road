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
  reopenSavedSession: jest.fn(),
  updateDraftSessionFields: jest.fn(),
  getSessionApprovalContext: jest.fn(() => ({
    submission: { requestHash: 'hash-new', superseded: false },
    approval: null,
    latestApproval: null,
  })),
  getApprovalForHash: jest.fn(() => null),
  hasUnsyncedSubmissionOutbox: jest.fn(() => false),
  countLocationSamplesForSession: jest.fn(() => 0),
  recomputeSessionRoadCategory: jest.fn(() => ({
    highwayRoadMinutes: null,
  })),
  listSavedSessions: jest.fn(() => []),
}));

jest.mock('../../src/lib/submissions', () => ({
  submitSessionForApproval: jest.fn(() => Promise.resolve()),
  sendSavedSessionForApproval: jest.fn(() => Promise.resolve()),
  discardSessionSubmission: jest.fn(() => Promise.resolve()),
  fetchRemoteUserName: jest.fn(() => Promise.resolve('Supervisor')),
  syncSessionReopenedForEdit: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/components/DateTimePickerField', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    DateTimePickerField: ({ value, accessibilityLabel }) => (
      <Text accessibilityLabel={accessibilityLabel}>{value ?? 'unset'}</Text>
    ),
  };
});

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
import { render, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReviewSessionScreen } from '../../src/screens/ReviewSessionScreen';
import { getSessionById } from '../../src/db/queries';

const navigation = {
  reset: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
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
  durationMinutes: 60,
  nightMinutes: 0,
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
    expect(getByText('Discard session')).toBeTruthy();
    expect(getByText('Submit for approval')).toBeTruthy();
    expect(queryByText('Back')).toBeNull();
  });

  test('shows saved-session actions when session is no longer draft', async () => {
    getSessionById.mockReturnValue({ ...draftSession, status: 'saved', requestHash: 'hash-new' });
    const { getByText, queryByText, findByText, getByLabelText } = await renderReview({
      sessionId: 'sess-001',
      editing: false,
    });
    expect(getByLabelText('Go back')).toBeTruthy();
    expect(getByText('Edit session')).toBeTruthy();
    expect(queryByText('Back to dashboard')).toBeNull();
    expect(queryByText('Submit for approval')).toBeNull();
    expect(await findByText('Pending approval')).toBeTruthy();
  });

  test('shows notes editor and save when editing a saved entry', async () => {
    getSessionById.mockReturnValue({ ...draftSession, status: 'saved', requestHash: 'hash-new', notes: 'Original' });
    const { getByPlaceholderText, getByText } = await renderReview({
      sessionId: 'sess-001',
      editing: true,
      editBackup: {
        notes: 'Original',
        requestHash: 'hash-new',
        payloadJson: '{}',
        startedAt: '2026-06-01T14:00:00.000Z',
        endedAt: '2026-06-01T15:00:00.000Z',
        durationMinutes: 60,
        nightMinutes: 0,
      },
    });
    expect(getByPlaceholderText('Route, weather, supervisor name…')).toBeTruthy();
    expect(getByText('Submit for approval')).toBeTruthy();
  });

  test('back from edit pops stack instead of resetting dashboard', async () => {
    getSessionById.mockReturnValue({ ...draftSession, status: 'saved', requestHash: 'hash-new', notes: 'Original' });
    const { getByLabelText } = await renderReview({
      sessionId: 'sess-001',
      editing: true,
      editBackup: {
        notes: 'Original',
        requestHash: 'hash-new',
        payloadJson: '{}',
        startedAt: '2026-06-01T14:00:00.000Z',
        endedAt: '2026-06-01T15:00:00.000Z',
        durationMinutes: 60,
        nightMinutes: 0,
      },
    });
    fireEvent.press(getByLabelText('Go back'));
    expect(navigation.goBack).toHaveBeenCalled();
    expect(navigation.reset).not.toHaveBeenCalled();
  });
});
