import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SectionList,
  Share,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconCircleButton } from '../components/IconCircleButton';
import {
  listSavedSessions,
  getProgress,
  getActiveSession,
  getDraftSession,
  createActiveSession,
  reopenSavedSession,
  getSessionById,
  expireStaleActiveSession,
  getSessionApprovalContext,
} from '../db/queries';
import { syncApprovalsForTeen, syncDeclinedSubmissionsForTeen, withdrawSessionSubmission, fetchRemoteUserName, syncSessionReopenedForEdit } from '../lib/submissions';
import { getSessionDisplayStatus } from '../utils/sessionStatus';
import { groupSessionsForDashboard } from '../utils/dashboardSessions';
import { useApprovalPushRefresh } from '../hooks/useApprovalPushRefresh';
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
  const [statusBySessionId, setStatusBySessionId] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      await syncApprovalsForTeen(userId);
      await syncDeclinedSubmissionsForTeen(userId);
    } catch {
      // Offline — show local approval state only
    }
    const rows = listSavedSessions(userId);
    setSessions(rows);
    setProgress(getProgress(userId));

    const statuses = {};
    await Promise.all(
      rows.map(async (session) => {
        const ctx = getSessionApprovalContext(session.id);
        let approverName;
        if (ctx?.approval?.approvedByUserId) {
          approverName = await fetchRemoteUserName(ctx.approval.approvedByUserId);
        }
        statuses[session.id] = getSessionDisplayStatus(session, {
          submission: ctx?.submission,
          approval: ctx?.approval,
          latestApproval: ctx?.latestApproval,
          approverName,
        });
      }),
    );
    setStatusBySessionId(statuses);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return undefined;
      let cancelled = false;

      (async () => {
        await refresh();
        if (cancelled) return;

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

  const sessionSections = useMemo(
    () => groupSessionsForDashboard(sessions, statusBySessionId),
    [sessions, statusBySessionId],
  );

  function renderSessionRow(item) {
    const status = statusBySessionId[item.id];
    return (
      <View style={styles.row}>
        <Pressable style={styles.rowMain} onPress={() => handleEdit(item.id)}>
          <View style={styles.rowContent}>
            <Text style={styles.rowDate}>{formatDate(item.startedAt)}</Text>
            <Text style={styles.rowMeta}>
              {formatDuration(item.durationMinutes ?? 0)} · {dayNightLabel(item.dayNight)}
            </Text>
            {status?.label ? (
              <Text
                style={[
                  styles.statusText,
                  status.key === 'approved' && styles.statusApproved,
                  status.key === 'pending' && styles.statusPending,
                  status.key === 'needs_revision' && styles.statusNeedsRevision,
                  status.key === 'superseded' && styles.statusSuperseded,
                ]}
              >
                {status.label}
              </Text>
            ) : null}
          </View>
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
        {status?.key === 'pending' ? (
          <Pressable onPress={() => handleWithdraw(item.id)}>
            <Text style={styles.withdrawLink}>Withdraw</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  useApprovalPushRefresh(['session_approved', 'session_declined'], refresh);

  async function handlePullRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

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
    const ctx = getSessionApprovalContext(sessionId);
    if (ctx?.approval) {
      Alert.alert(
        'Edit approved session?',
        'Editing will require your supervisor to approve the updated record.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Edit',
            onPress: () => openEdit(sessionId, before),
          },
        ],
      );
      return;
    }
    openEdit(sessionId, before);
  }

  function openEdit(sessionId, before) {
    reopenSavedSession(sessionId);
    syncSessionReopenedForEdit(sessionId).catch((e) => {
      console.warn('Remote edit sync failed:', e.message);
    });
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

  function handleWithdraw(sessionId) {
    Alert.alert(
      'Withdraw submission?',
      'This removes the session from your log and clears it from your supervisor\'s pending list.',
      [
        { text: 'Keep pending', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await withdrawSessionSubmission(sessionId);
              refresh();
            } catch (e) {
              Alert.alert('Error', e.message ?? 'Could not withdraw submission.');
            }
          },
        },
      ],
    );
  }

  const eligibility = user?.permitIssueDate
    ? addMonths(user.permitIssueDate, IL_RULES.holdingMonths)
    : null;

  return (
    <Screen withHeader>
      <ScreenHeader
        title="Dashboard"
        rightAction={
          <IconCircleButton
            icon="settings-outline"
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Settings"
          />
        }
      />

      <View style={styles.body}>
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

      <SectionList
        style={styles.list}
        contentContainerStyle={sessionSections.length === 0 ? styles.listEmpty : undefined}
        sections={sessionSections}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handlePullRefresh} />
        }
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<Text style={styles.empty}>No submitted sessions yet.</Text>}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.listSectionTitle}>{title}</Text>
        )}
        renderItem={({ item }) => renderSessionRow(item)}
      />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
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
  listSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2b3c',
    marginTop: 4,
    marginBottom: 8,
  },
  list: { flex: 1 },
  listEmpty: { flexGrow: 1 },
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
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowContent: { flex: 1, paddingRight: 8 },
  rowDate: { fontSize: 16, fontWeight: '600', color: '#1a2b3c' },
  rowMeta: { fontSize: 14, color: '#5a6b7c', marginTop: 2 },
  statusText: { fontSize: 13, marginTop: 6, color: '#5a6b7c' },
  statusApproved: { color: '#15803d' },
  statusPending: { color: '#b45309' },
  statusNeedsRevision: { color: '#dc2626' },
  statusSuperseded: { color: '#9333ea' },
  editLink: { color: '#2563eb', fontWeight: '600' },
  withdrawLink: { color: '#dc2626', fontWeight: '600', fontSize: 14, marginLeft: 8 },
});
