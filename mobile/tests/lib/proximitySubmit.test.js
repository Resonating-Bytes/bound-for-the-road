jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('../../src/db/queries', () => ({
  getLatestLocationSampleForSession: jest.fn(),
}));

jest.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('../../src/lib/proximityRealtime', () => ({
  collectAdultProximityResponses: jest.fn(),
}));

import * as Location from 'expo-location';
import { getLatestLocationSampleForSession } from '../../src/db/queries';
import { collectAdultProximityResponses } from '../../src/lib/proximityRealtime';
import {
  resolveTeenSubmitLocation,
  collectNearbyAdultIdsAtSubmit,
} from '../../src/lib/proximitySubmit';

describe('proximitySubmit', () => {
  const originalMockAdult = process.env.EXPO_PUBLIC_PROXIMITY_MOCK_ADULT_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EXPO_PUBLIC_PROXIMITY_MOCK_ADULT_ID;
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 41.88, longitude: -87.63 },
    });
    collectAdultProximityResponses.mockResolvedValue(new Map());
  });

  afterEach(() => {
    if (originalMockAdult === undefined) {
      delete process.env.EXPO_PUBLIC_PROXIMITY_MOCK_ADULT_ID;
    } else {
      process.env.EXPO_PUBLIC_PROXIMITY_MOCK_ADULT_ID = originalMockAdult;
    }
  });

  test('resolveTeenSubmitLocation prefers last session sample', async () => {
    getLatestLocationSampleForSession.mockReturnValue({
      latitude: '41.0',
      longitude: '-87.0',
    });

    const location = await resolveTeenSubmitLocation('session-1');
    expect(location).toEqual({ latitude: 41, longitude: -87 });
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  test('resolveTeenSubmitLocation falls back to one-shot GPS', async () => {
    getLatestLocationSampleForSession.mockReturnValue(null);

    const location = await resolveTeenSubmitLocation('session-1');
    expect(location).toEqual({ latitude: 41.88, longitude: -87.63 });
  });

  test('collectNearbyAdultIdsAtSubmit returns dev mock when linked', async () => {
    process.env.EXPO_PUBLIC_PROXIMITY_MOCK_ADULT_ID = 'adult-a';
    const nearby = await collectNearbyAdultIdsAtSubmit({
      teenUserId: 'teen-1',
      sessionId: 'session-1',
      linkedAdultIds: ['adult-a', 'adult-b'],
    });
    expect(nearby).toEqual(['adult-a']);
    expect(collectAdultProximityResponses).not.toHaveBeenCalled();
  });

  test('collectNearbyAdultIdsAtSubmit returns closest adult within radius', async () => {
    getLatestLocationSampleForSession.mockReturnValue({
      latitude: '41.88',
      longitude: '-87.63',
    });
    collectAdultProximityResponses.mockResolvedValue(
      new Map([
        ['adult-a', { latitude: 41.881, longitude: -87.63 }],
        ['adult-b', { latitude: 41.8802, longitude: -87.63 }],
        ['adult-c', { latitude: 42.5, longitude: -88.0 }],
      ]),
    );

    const nearby = await collectNearbyAdultIdsAtSubmit({
      teenUserId: 'teen-1',
      sessionId: 'session-1',
      linkedAdultIds: ['adult-a', 'adult-b', 'adult-c'],
    });

    expect(nearby).toEqual(['adult-b']);
  });

  test('collectNearbyAdultIdsAtSubmit returns empty when no teen location', async () => {
    getLatestLocationSampleForSession.mockReturnValue(null);
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const nearby = await collectNearbyAdultIdsAtSubmit({
      teenUserId: 'teen-1',
      sessionId: 'session-1',
      linkedAdultIds: ['adult-a'],
    });

    expect(nearby).toEqual([]);
    expect(collectAdultProximityResponses).not.toHaveBeenCalled();
  });
});
