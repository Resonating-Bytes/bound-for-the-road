import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { insertLocationSample } from '../db/queries';
import { classifyRoadCategoryFromSpeedMps, roadCategoryLabel } from '../utils/roadCategory';
import { createSessionSunWindow } from '../utils/dayNight';

const SAMPLE_OPTIONS = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 5000,
  distanceInterval: 10,
};

/**
 * Foreground-only GPS sampling during an active session (Expo Go).
 * Sun window fixed at session start (refined once on first GPS fix).
 */
export function useForegroundLocationSampling(sessionId, sessionStartedAt, enabled = true) {
  const [status, setStatus] = useState('idle');
  const [latest, setLatest] = useState(null);
  const [sunWindow, setSunWindow] = useState(null);
  const appStateRef = useRef(AppState.currentState);
  const sunWindowRef = useRef(null);
  const coordsRefinedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !sessionStartedAt) {
      setStatus('idle');
      setLatest(null);
      setSunWindow(null);
      sunWindowRef.current = null;
      coordsRefinedRef.current = false;
      return undefined;
    }

    const initialWindow = createSessionSunWindow(sessionStartedAt);
    sunWindowRef.current = initialWindow;
    coordsRefinedRef.current = false;
    setSunWindow(initialWindow);
    setLatest({ roadCategory: null });

    let subscription = null;
    let cancelled = false;

    function refineSunWindow(latitude, longitude) {
      if (coordsRefinedRef.current) return;
      coordsRefinedRef.current = true;
      const refined = createSessionSunWindow(sessionStartedAt, latitude, longitude);
      sunWindowRef.current = refined;
      setSunWindow(refined);
    }

    function applySample(fix) {
      if (cancelled || appStateRef.current !== 'active') return;
      const { latitude, longitude, speed, accuracy } = fix.coords;
      refineSunWindow(latitude, longitude);
      const recordedAt = new Date(fix.timestamp).toISOString();
      const roadCategory = classifyRoadCategoryFromSpeedMps(speed);
      insertLocationSample({
        sessionId,
        recordedAt,
        latitude,
        longitude,
        speedMps: speed,
        accuracyM: accuracy,
        roadCategory,
      });
      setLatest({ roadCategory });
    }

    async function start() {
      setStatus('requesting');
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (cancelled) return;
      if (!servicesEnabled) {
        setStatus('unavailable');
        return;
      }

      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      setStatus('tracking');
      try {
        const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) applySample(fix);
      } catch {
        // watchPosition will deliver first fix
      }

      subscription = await Location.watchPositionAsync(SAMPLE_OPTIONS, applySample);
    }

    const appSub = AppState.addEventListener('change', (next) => {
      appStateRef.current = next;
    });

    start().catch(() => {
      if (!cancelled) setStatus('unavailable');
    });

    return () => {
      cancelled = true;
      subscription?.remove();
      appSub.remove();
    };
  }, [sessionId, sessionStartedAt, enabled]);

  return { status, latest, sunWindow, roadCategoryLabel };
}
