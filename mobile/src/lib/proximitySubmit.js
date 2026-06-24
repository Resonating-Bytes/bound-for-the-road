import * as Location from 'expo-location';

import { generateId } from '../utils/time';
import { getLatestLocationSampleForSession } from '../db/queries';
import { isSupabaseConfigured } from './supabase';
import { pickClosestAdultWithinRadius } from './geo';
import {
  PROXIMITY_PUSH_RADIUS_METERS,
  PROXIMITY_RESPONSE_WAIT_MS,
  PROXIMITY_SUBMIT_MAX_AGE_MS,
} from './proximityConfig';
import { collectAdultProximityResponses } from './proximityRealtime';

/**
 * Last known session GPS sample, or a one-shot current fix at submit.
 *
 * @returns {Promise<{ latitude: number, longitude: number } | null>}
 */
export async function resolveTeenSubmitLocation(sessionId) {
  const latest = getLatestLocationSampleForSession(sessionId);
  if (latest) {
    const latitude = Number(latest.latitude);
    const longitude = Number(latest.longitude);
    const recordedAtMs = Date.parse(latest.recordedAt);
    const sampleFresh =
      Number.isFinite(recordedAtMs) &&
      Date.now() - recordedAtMs <= PROXIMITY_SUBMIT_MAX_AGE_MS;
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && sampleFresh) {
      return { latitude, longitude };
    }
  }

  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'undetermined') {
      ({ status } = await Location.requestForegroundPermissionsAsync());
    }
    if (status !== 'granted') return null;
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const latitude = fix.coords.latitude;
    const longitude = fix.coords.longitude;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

/**
 * Closest linked adult who responded and is within radius of the teen submit location.
 * Returns [] when proximity cannot run or no adult qualifies — caller should push to all linked.
 *
 * @returns {Promise<string[]>}
 */
export async function collectNearbyAdultIdsAtSubmit({
  teenUserId,
  sessionId,
  linkedAdultIds,
  submittedAt,
}) {
  if (!Array.isArray(linkedAdultIds) || !linkedAdultIds.length) {
    return [];
  }

  const mockId = process.env.EXPO_PUBLIC_PROXIMITY_MOCK_ADULT_ID?.trim();
  if (__DEV__ && mockId && linkedAdultIds.includes(mockId)) {
    return [mockId];
  }

  if (!isSupabaseConfigured()) {
    return [];
  }

  if (submittedAt) {
    const submittedAtMs = Date.parse(submittedAt);
    if (
      !Number.isFinite(submittedAtMs) ||
      Date.now() - submittedAtMs > PROXIMITY_SUBMIT_MAX_AGE_MS
    ) {
      return [];
    }
  }

  const teenLocation = await resolveTeenSubmitLocation(sessionId);
  if (!teenLocation) {
    return [];
  }

  const requestId = generateId();
  const responses = await collectAdultProximityResponses({
    teenUserId,
    requestId,
    sessionId,
    latitude: teenLocation.latitude,
    longitude: teenLocation.longitude,
    linkedAdultIds,
    waitMs: PROXIMITY_RESPONSE_WAIT_MS,
  });

  const closest = pickClosestAdultWithinRadius(
    teenLocation.latitude,
    teenLocation.longitude,
    responses,
    linkedAdultIds,
    PROXIMITY_PUSH_RADIUS_METERS,
  );

  return closest ? [closest] : [];
}
