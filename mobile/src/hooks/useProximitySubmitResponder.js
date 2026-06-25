import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

import { useAuth } from '../context/AuthContext';
import { subscribeAdultProximityResponder } from '../lib/proximityRealtime';
import { isSupabaseConfigured } from '../lib/supabase';

async function readAdultLocationIfAllowed() {
  if (AppState.currentState !== 'active') return null;

  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    // OS permission dialog only when never asked; granted/denied → no second prompt.
    if (status === 'undetermined') {
      ({ status } = await Location.requestForegroundPermissionsAsync());
    }
    if (AppState.currentState !== 'active') return null;
    if (status !== 'granted') return null;

    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    if (AppState.currentState !== 'active') return null;

    const latitude = fix.coords.latitude;
    const longitude = fix.coords.longitude;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

/**
 * When the adult dashboard is mounted, listen for teen submit proximity checks
 * and respond with current location if the app is in the foreground.
 */
export function useProximitySubmitResponder(linkedTeenIds, enabled = true) {
  const { userId } = useAuth();
  const linkedTeenIdsKey = linkedTeenIds?.slice().sort().join('\0') ?? '';

  useEffect(() => {
    if (!enabled || !userId || !linkedTeenIds?.length || !isSupabaseConfigured()) {
      return undefined;
    }

    const teenIds = linkedTeenIds;
    let unsub = () => {};
    let cancelled = false;

    subscribeAdultProximityResponder(userId, teenIds, readAdultLocationIfAllowed)
      .then((unsubscribe) => {
        if (cancelled) {
          unsubscribe();
        } else {
          unsub = unsubscribe;
        }
      })
      .catch((e) => {
        console.warn('Proximity responder setup failed:', e.message ?? e);
      });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [enabled, userId, linkedTeenIdsKey]);
}
