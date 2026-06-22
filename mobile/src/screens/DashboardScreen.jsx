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
import { ListRowChevron } from '../components/ListRowChevron';
import { ExportOptionsModal } from '../components/ExportOptionsModal';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconCircleButton } from '../components/IconCircleButton';
import {
  listSavedSessions,
  getProgress,
  getActiveSession,
  getDraftSession,
  createActiveSession,
  createDefaultManualDraftSession,
  expireStaleActiveSession,
  getSessionById,
  reopenSavedSession,
  getSessionApprovalContext,
  hasUnsyncedSubmissionOutbox,
  recomputeSessionTimeValidation,
  hasApprovedExportableSession,
  listApprovedSessionsForExport,
} from '../db/queries';
import {
  fetchRemoteUserLabel,
  resolveApproverName,
  syncSessionReopenedForEdit,
} from '../lib/submissions';
import { pullAndMergeTeenSessions } from '../lib/sessionSync';
import { isSupabaseConfigured } from '../lib/supabase';
import { isNetworkOnline } from '../lib/network';
import { useCompatibility } from '../context/CompatibilityContext';
import { useTheme } from '../context/ThemeContext';
import { getPrimaryInvalidHint } from '../utils/sessionValidation';
import { getSessionDisplayStatus } from '../utils/sessionStatus';
import { groupSessionsForDashboard } from '../utils/dashboardSessions';
import { createSessionEditBackup } from '../utils/sessionEdit';
import { useApprovalPushRefresh } from '../hooks/useApprovalPushRefresh';
import { useOutboxSyncRefresh } from '../hooks/useOutboxSyncRefresh';
import { IL_RULES } from '../config/states/IL';
import { formatDate, formatDuration, addMonths } from '../utils/time';
import { formatDayNightSummary, computeDayNightMinutes } from '../utils/dayNight';
import { renderExportTemplate } from '../utils/export';
import { readExportIncludeRoadCategory, writeExportIncludeRoadCategory } from '../lib/exportPreferences';
import { TEEN_DASHBOARD_TITLE } from '../theme/headerTitleEffects';
import { isPermitActive, formatPermitStartsMessage } from '../utils/permitDate';
import {
  scheduleSessionNudge,
  cancelSessionNotifications,
  notifyStaleSessionExpired,
} from '../utils/notifications';

export function DashboardScreen({ navigation }) {
  const { userId, user, refreshProfileFromRemote } = useAuth();
  const { canRemoteWrite } = useCompatibility();
  const { theme } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [progress, setProgress] = useState({ totalMinutes: 0, nightMinutes: 0 });
  const [statusBySessionId, setStatusBySessionId] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportIncludeRoadCategory, setExportIncludeRoadCategory] = useState(false);

  const loadLocalDashboard = useCallback(() => {
    if (!userId) return;
    recomputeSessionTimeValidation(userId);
    const rows = listSavedSessions(userId);
    setSessions(rows);
    setProgress(getProgress(userId));

    const statuses = {};
    for (const session of rows) {
      const ctx = getSessionApprovalContext(session.id);
      const snapshotName = ctx?.approval?.supervisorInVehicleName?.trim() || null;
      statuses[session.id] = getSessionDisplayStatus(session, {
        submission: ctx?.submission,
        approval: ctx?.approval,
        latestApproval: ctx?.latestApproval,
        approverName: snapshotName,
        pendingRemoteSync: hasUnsyncedSubmissionOutbox(session.id),
        canRemoteWrite,
      });
    }
    setStatusBySessionId(statuses);
  }, [userId, canRemoteWrite]);

  const enrichFromRemote = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) return;
    if (!(await isNetworkOnline())) return;
    try {
      await refreshProfileFromRemote();
      await pullAndMergeTeenSessions(userId);
    } catch {
      return;
    }

    const rows = listSavedSessions(userId);
    setSessions(rows);
    setProgress(getProgress(userId));

    const statuses = {};
    await Promise.all(
      rows.map(async (session) => {
        const ctx = getSessionApprovalContext(session.id);
        let approverName = ctx?.approval?.supervisorInVehicleName?.trim() || null;
        if (ctx?.approval && !approverName) {
          approverName = await resolveApproverName(ctx.approval);
        }
        statuses[session.id] = getSessionDisplayStatus(session, {
          submission: ctx?.submission,
          approval: ctx?.approval,
          latestApproval: ctx?.latestApproval,
          approverName,
          pendingRemoteSync: hasUnsyncedSubmissionOutbox(session.id),
          canRemoteWrite,
        });
      }),
    );
    setStatusBySessionId(statuses);
  }, [userId, canRemoteWrite, refreshProfileFromRemote]);

  const refresh = useCallback(async () => {
    loadLocalDashboard();
    await enrichFromRemote();
  }, [loadLocalDashboard, enrichFromRemote]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return undefined;
      let cancelled = false;

      (async () => {
        loadLocalDashboard();
        enrichFromRemote().catch(() => {});
        if (cancelled) return;

        const expired = expireStaleActiveSession(userId);
        if (cancelled) return;
        if (expired) {
          await cancelSessionNotifications(expired.id);
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
    }, [userId, navigation, loadLocalDashboard, enrichFromRemote]),
  );

  const sessionSections = useMemo(
    () => groupSessionsForDashboard(sessions, statusBySessionId),
    [sessions, statusBySessionId],
  );

  function openSessionEdit(sessionId) {
    const before = getSessionById(sessionId);
    if (!before) return;
    reopenSavedSession(sessionId);
    syncSessionReopenedForEdit(sessionId).catch((e) => {
      console.warn('Remote edit sync failed:', e.message);
    });
    navigation.navigate('ReviewSession', {
      sessionId,
      editing: true,
      editBackup: createSessionEditBackup(before),
    });
  }

  function handleSessionRowPress(item) {
    const status = statusBySessionId[item.id];
    if (status?.key === 'needs_revision' || status?.key === 'time_invalid') {
      openSessionEdit(item.id);
      return;
    }
    navigation.navigate('ReviewSession', { sessionId: item.id });
  }

  function renderSessionRow(item, sectionKey) {
    const status = statusBySessionId[item.id];
    const invalidHint =
      sectionKey === 'invalid' ? getPrimaryInvalidHint(item, 'teen') : null;

    return (
      <Pressable
        style={[styles.row, sectionKey === 'invalid' && styles.rowInvalid]}
        onPress={() => handleSessionRowPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Session ${formatDate(item.startedAt)}`}
      >
        <View style={styles.rowBody}>
          <Text style={styles.rowDate}>{formatDate(item.startedAt)}</Text>
          <Text style={styles.rowMeta}>
            {formatDuration(item.durationMinutes ?? 0)} · {formatDayNightSummary(item.durationMinutes, item.nightMinutes)}
          </Text>
          {invalidHint ? (
            <Text style={styles.statusTimeInvalid}>{invalidHint}</Text>
          ) : status?.label ? (
            <Text
              style={[
                styles.statusText,
                status.key === 'approved' && styles.statusApproved,
                status.key === 'pending' && styles.statusPending,
                status.key === 'saved_local' && styles.statusSavedLocal,
                status.key === 'needs_revision' && styles.statusNeedsRevision,
                status.key === 'superseded' && styles.statusSuperseded,
                status.key === 'time_invalid' && styles.statusTimeInvalid,
              ]}
            >
              {status.label}
            </Text>
          ) : null}
        </View>
        <ListRowChevron />
      </Pressable>
    );
  }

  useApprovalPushRefresh(['session_approved', 'session_declined'], refresh);
  useOutboxSyncRefresh(refresh);

  async function handlePullRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function handleStart() {
    if (!permitActive) {
      Alert.alert('Permit not started yet', formatPermitStartsMessage(user?.permitIssueDate));
      return;
    }
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

  function handleManualEntry() {
    if (!permitActive) {
      Alert.alert('Permit not started yet', formatPermitStartsMessage(user?.permitIssueDate));
      return;
    }
    const active = getActiveSession(userId);
    if (active) {
      Alert.alert('Session in progress', 'Stop your active session before adding a manual entry.');
      return;
    }
    const draft = getDraftSession(userId);
    if (draft) {
      Alert.alert(
        'Draft in progress',
        'Finish or discard your current draft before adding a manual entry.',
      );
      return;
    }
    const session = createDefaultManualDraftSession(userId, user?.stateCode ?? 'IL');
    navigation.navigate('ReviewSession', { sessionId: session.id, manualEntry: true });
  }

  function handleExportAll() {
    if (!canExport) return;
    setExportIncludeRoadCategory(readExportIncludeRoadCategory(userId));
    setExportModalVisible(true);
  }

  async function handleConfirmExport() {
    writeExportIncludeRoadCategory(userId, exportIncludeRoadCategory);
    const rows = listApprovedSessionsForExport(userId);
    const text = renderExportTemplate(rows, user, {
      includeRoadCategory: exportIncludeRoadCategory,
    });
    setExportModalVisible(false);
    await Share.share({ message: text });
  }

  const eligibility = user?.permitIssueDate
    ? addMonths(user.permitIssueDate, IL_RULES.holdingMonths)
    : null;
  const permitActive = isPermitActive(user?.permitIssueDate);
  const canExport = userId ? hasApprovedExportableSession(userId) : false;

  return (
    <Screen withHeader>
      <ScreenHeader
        title={TEEN_DASHBOARD_TITLE}
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

      {!permitActive && user?.permitIssueDate ? (
        <Text style={styles.permitNotice}>{formatPermitStartsMessage(user.permitIssueDate)}</Text>
      ) : null}

      <ProgressBar
        label="Total practice"
        currentMinutes={progress.totalMinutes}
        targetHours={IL_RULES.totalHours}
      />
      <ProgressBar
        label="Night practice"
        currentMinutes={progress.nightMinutes}
        targetHours={IL_RULES.nightHours}
      />

      <View style={styles.actions}>
        <Pressable
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.accent },
            !permitActive && styles.disabledBtn,
          ]}
          onPress={handleStart}
          disabled={!permitActive}
        >
          <Text style={[styles.primaryBtnText, { color: theme.accentText }]}>Start session</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, !canExport && styles.disabledBtn]}
          onPress={handleExportAll}
          disabled={!canExport}
        >
          <Text style={[styles.secondaryBtnText, !canExport && styles.disabledBtnText]}>
            Export all
          </Text>
        </Pressable>
      </View>

      {!canExport ? (
        <Text style={styles.exportHint}>
          Export unlocks after your first approved practice session.
        </Text>
      ) : null}

      <Pressable
        style={[styles.manualEntryLink, !permitActive && styles.disabledBtn]}
        onPress={handleManualEntry}
        disabled={!permitActive}
      >
        <Text style={[styles.manualEntryLinkText, !permitActive && styles.disabledBtnText]}>
          Add manual entry
        </Text>
      </Pressable>

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
        renderItem={({ item, section }) => renderSessionRow(item, section.key)}
      />
      </View>

      <ExportOptionsModal
        visible={exportModalVisible}
        includeRoadCategory={exportIncludeRoadCategory}
        onIncludeRoadCategoryChange={setExportIncludeRoadCategory}
        onCancel={() => setExportModalVisible(false)}
        onExport={handleConfirmExport}
        accent={theme.accent}
        accentText={theme.accentText}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  eligibility: { fontSize: 14, color: '#5a6b7c', marginBottom: 16 },
  permitNotice: {
    fontSize: 14,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    lineHeight: 20,
  },
  exportHint: {
    fontSize: 13,
    color: '#6a7b8c',
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 12,
    lineHeight: 18,
  },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { fontWeight: '600', fontSize: 16 },
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
  disabledBtn: { opacity: 0.45 },
  disabledBtnText: { color: '#94a3b8' },
  manualEntryLink: { alignSelf: 'center', marginBottom: 16, paddingVertical: 4 },
  manualEntryLinkText: { color: '#5a6b7c', fontSize: 15, fontWeight: '500' },
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
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowInvalid: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  rowDate: { fontSize: 16, fontWeight: '600', color: '#1a2b3c' },
  rowMeta: { fontSize: 14, color: '#5a6b7c', marginTop: 2 },
  statusText: { fontSize: 13, marginTop: 8, color: '#5a6b7c' },
  statusApproved: { color: '#15803d' },
  statusPending: { color: '#b45309' },
  statusSavedLocal: { color: '#1d4ed8' },
  statusNeedsRevision: { color: '#dc2626' },
  statusSuperseded: { color: '#9333ea' },
  statusTimeInvalid: { color: '#dc2626' },
});
