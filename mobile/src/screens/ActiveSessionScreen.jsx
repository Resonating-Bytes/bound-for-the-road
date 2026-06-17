import { useEffect, useState, useCallback } from 'react';
import { Text, Pressable, StyleSheet, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { getSessionById, stopSession } from '../db/queries';
import { durationMinutes, formatDuration } from '../utils/time';
import { cancelSessionNudge } from '../utils/notifications';
import { Screen } from '../components/Screen';

function elapsedFromStart(startedAt) {
  if (!startedAt) return 0;
  return durationMinutes(startedAt, new Date().toISOString());
}

export function ActiveSessionScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const [session, setSession] = useState(() => getSessionById(sessionId));
  const [, setTick] = useState(0);

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

  async function handleStop() {
    stopSession(sessionId);
    await cancelSessionNudge(sessionId);
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
      <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
      <Text style={styles.hint}>Stop when you're done driving.</Text>
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
  label: { fontSize: 18, color: '#9ca3af', marginBottom: 8 },
  timer: {
    fontSize: 64,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
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
