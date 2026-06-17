import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Share,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import {
  listSavedSessions,
  getProgress,
  getActiveSession,
  getDraftSession,
  createActiveSession,
  reopenSavedSession,
  getSessionById,
  expireStaleActiveSession,
} from '../db/queries';
import { IL_RULES } from '../config/states/IL';
import { formatDate, formatDuration, addMonths } from '../utils/time';
import { dayNightLabel } from '../utils/dayNight';
import { renderExportTemplate } from '../utils/export';
import {
  scheduleSessionNudge,
  cancelSessionNudge,
  notifyStaleSessionExpired,
} from '../utils/notifications';

export function DashboardScreen({ navigation }) {
  const { userId, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [progress, setProgress] = useState({ totalMinutes: 0, nightMinutes: 0 });

  const refresh = useCallback(() => {
    if (!userId) return;
    setSessions(listSavedSessions(userId));
    setProgress(getProgress(userId));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      refresh();

      let cancelled = false;
      (async () => {
        const expired = expireStaleActiveSession(userId);
        if (cancelled) return;
        if (expired) {
          await cancelSessionNudge(expired.id);
          await notifyStaleSessionExpired(expired.id);
          navigation.replace('ReviewSession', { sessionId: expired.id, staleExpired: true });
          return;
        }
        const active = getActiveSession(userId);
        if (cancelled) return;
        if (active) {
          navigation.replace('ActiveSession', { sessionId: active.id });
          return;
        }
        const draft = getDraftSession(userId);
        if (cancelled) return;
        if (draft) {
          navigation.replace('ReviewSession', { sessionId: draft.id });
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [userId, navigation, refresh]),
  );

  async function handleStart() {
    const active = getActiveSession(userId);
    if (active) {
      navigation.navigate('ActiveSession', { sessionId: active.id });
      return;
    }
    const draft = getDraftSession(userId);
    if (draft) {
      navigation.navigate('ReviewSession', { sessionId: draft.id });
      return;
    }
    const session = createActiveSession(userId, user?.stateCode ?? 'IL');
    await scheduleSessionNudge(session.id, session.startedAt);
    navigation.navigate('ActiveSession', { sessionId: session.id });
  }

  async function handleExportAll() {
    const rows = listSavedSessions(userId);
    const text = renderExportTemplate(rows, user);
    await Share.share({ message: text });
  }

  function handleEdit(sessionId) {
    const before = getSessionById(sessionId);
    reopenSavedSession(sessionId);
    navigation.navigate('ReviewSession', {
      sessionId,
      editing: true,
      editBackup: {
        requestHash: before.requestHash,
        payloadJson: before.payloadJson,
        notes: before.notes,
      },
    });
  }

  const eligibility = user?.permitIssueDate
    ? addMonths(user.permitIssueDate, IL_RULES.holdingMonths)
    : null;

  return (
    <Screen style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Dashboard</Text>
        <Pressable onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.link}>Settings</Text>
        </Pressable>
      </View>

      {eligibility && (
        <Text style={styles.eligibility}>
          Earliest license eligibility: {formatDate(eligibility)}
        </Text>
      )}

      <ProgressBar
        label="Total practice"
        currentMinutes={progress.totalMinutes}
        targetHours={IL_RULES.totalHours}
      />
      <ProgressBar
        label="Night practice"
        currentMinutes={progress.nightMinutes}
        targetHours={IL_RULES.nightHours}
        color="#6366f1"
      />

      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={handleStart}>
          <Text style={styles.primaryBtnText}>Start session</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={handleExportAll}>
          <Text style={styles.secondaryBtnText}>Export all</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Saved sessions</Text>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No saved sessions yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => handleEdit(item.id)}>
            <View>
              <Text style={styles.rowDate}>{formatDate(item.startedAt)}</Text>
              <Text style={styles.rowMeta}>
                {formatDuration(item.durationMinutes ?? 0)} · {dayNightLabel(item.dayNight)}
              </Text>
            </View>
            <Text style={styles.editLink}>Edit</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#1a2b3c', marginBottom: 4 },
  link: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  eligibility: { fontSize: 14, color: '#5a6b7c', marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryBtnText: { color: '#1a2b3c', fontWeight: '600', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1a2b3c', marginBottom: 8 },
  empty: { color: '#6a7b8c', fontSize: 15, marginTop: 8 },
  row: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowDate: { fontSize: 16, fontWeight: '600', color: '#1a2b3c' },
  rowMeta: { fontSize: 14, color: '#5a6b7c', marginTop: 2 },
  editLink: { color: '#2563eb', fontWeight: '600' },
});
