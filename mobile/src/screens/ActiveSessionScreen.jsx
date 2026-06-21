import { useEffect, useState, useCallback } from 'react';
import { Text, Pressable, StyleSheet, AppState, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getSessionById, stopSession } from '../db/queries';
import { durationMinutes, formatDuration } from '../utils/time';
import { cancelSessionNotifications } from '../utils/notifications';
import { roadCategoryLabel } from '../utils/roadCategory';
import { createSessionSunWindow, dayNightPhaseAt } from '../utils/dayNight';
import { useForegroundLocationSampling } from '../hooks/useForegroundLocationSampling';
import { Screen } from '../components/Screen';

function elapsedFromStart(startedAt) {
  if (!startedAt) return 0;
  return durationMinutes(startedAt, new Date().toISOString());
}

function locationStatusHint(status) {
  switch (status) {
    case 'denied':
      return 'Location off — road category not tracked while driving.';
    case 'unavailable':
      return 'Location unavailable on this device.';
    case 'requesting':
      return 'Waiting for location permission…';
    default:
      return null;
  }
}

function DayNightIcon({ phase }) {
  const isNight = phase === 'night';
  return (
    <Ionicons
      name={isNight ? 'moon' : 'sunny'}
      size={28}
      color="#e5e7eb"
      accessibilityLabel={isNight ? 'Night driving' : 'Day driving'}
    />
  );
}

export function ActiveSessionScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [session, setSession] = useState(() => getSessionById(sessionId));
  const [, setTick] = useState(0);
  const isActive = session?.status === 'active';
  const { status: locationStatus, latest, sunWindow } = useForegroundLocationSampling(
    sessionId,
    session?.startedAt,
    isActive,
  );

  const refresh = useCallback(() => {
    setSession(getSessionById(sessionId));
    setTick((n) => n + 1);
  }, [sessionId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const elapsed = elapsedFromStart(session?.startedAt);
  const locationHint = locationStatusHint(locationStatus);
  const displaySunWindow =
    sunWindow ?? (session?.startedAt ? createSessionSunWindow(session.startedAt) : null);
  const liveDayNight = displaySunWindow
    ? dayNightPhaseAt(new Date().toISOString(), displaySunWindow)
    : 'day';
  const roadCategory = latest?.roadCategory;
  const showRoadCategory = locationStatus === 'tracking';

  async function handleStop() {
    stopSession(sessionId);
    await cancelSessionNotifications(sessionId);
    navigation.replace('ReviewSession', { sessionId });
  }

  if (!session) {
    return (
      <Screen style={styles.screen}>
        <StatusBar style="light" />
        <Text style={styles.missing}>Session not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.label}>Practice in progress</Text>

      <View style={styles.statsStack}>
        <DayNightIcon phase={liveDayNight} />
        {showRoadCategory ? (
          <View style={styles.roadCategoryBlock}>
            <Text style={styles.statValue}>{roadCategoryLabel(roadCategory)}</Text>
            <Text style={styles.statLabel}>Road category</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.timer}>{formatDuration(elapsed)}</Text>

      {locationHint ? <Text style={styles.locationHint}>{locationHint}</Text> : null}

      <Text style={styles.hint}>Stop when you&apos;re done driving.</Text>
      <Pressable style={styles.stopBtn} onPress={handleStop}>
        <Text style={styles.stopBtnText}>Stop session</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { fontSize: 18, color: '#9ca3af', marginBottom: 16 },
  timer: {
    fontSize: 64,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 24,
    fontVariant: ['tabular-nums'],
  },
  statsStack: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  roadCategoryBlock: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  locationHint: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  hint: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  missing: { color: '#9ca3af', fontSize: 16 },
  stopBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  stopBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
