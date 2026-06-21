import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SectionList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconCircleButton } from '../components/IconCircleButton';
import { DriverProgressSummary } from '../components/DriverProgressSummary';
import { ListRowChevron } from '../components/ListRowChevron';
import { TeenSwitcher } from '../components/TeenSwitcher';
import { useApprovalPushRefresh } from '../hooks/useApprovalPushRefresh';
import {
  fetchPendingSubmissionsForAdult,
  fetchApprovedSubmissionsForAdult,
} from '../lib/submissions';
import { fetchLinkedTeenSummaries } from '../lib/teenProgress';
import {
  readSavedSelectedTeenId,
  resolveSelectedTeenId,
  writeSelectedTeenId,
} from '../lib/adultSelectedTeen';
import {
  filterSubmissionsForTeen,
  groupAdultDashboardSections,
} from '../utils/dashboardSessions';
import { formatDate, formatDuration } from '../utils/time';
import { formatDayNightSummary } from '../utils/dayNight';
import { shortDisplayNameForTeen } from '../utils/displayName';
import { formatAdultApprovedLabel } from '../utils/approvalDisplay';
import { useTheme } from '../context/ThemeContext';

export function AdultHomeScreen({ navigation }) {
  const { userId } = useAuth();
  const { theme } = useTheme();
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [teenSummaries, setTeenSummaries] = useState([]);
  const [selectedTeenId, setSelectedTeenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const summaries = await fetchLinkedTeenSummaries(userId);
      setTeenSummaries(summaries);
      const linkedIds = summaries.map((teen) => teen.teenUserId);
      const savedId = readSavedSelectedTeenId(userId);
      const resolvedId = resolveSelectedTeenId(linkedIds, savedId);
      if (resolvedId && resolvedId !== savedId) {
        writeSelectedTeenId(userId, resolvedId);
      }
      setSelectedTeenId(resolvedId);

      const [pendingRows, approvedRows] = await Promise.all([
        fetchPendingSubmissionsForAdult(),
        fetchApprovedSubmissionsForAdult(),
      ]);
      setPending(pendingRows);
      setApproved(approvedRows);
    } catch {
      setTeenSummaries([]);
      setPending([]);
      setApproved([]);
      setSelectedTeenId(null);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        await refresh();
        if (!cancelled) setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [refresh]),
  );

  useApprovalPushRefresh(['pending_approval', 'submission_withdrawn'], refresh);

  function handleSelectTeen(teenUserId) {
    if (!userId || teenUserId === selectedTeenId) return;
    writeSelectedTeenId(userId, teenUserId);
    setSelectedTeenId(teenUserId);
  }

  async function handlePullRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const selectedTeen = useMemo(
    () => teenSummaries.find((teen) => teen.teenUserId === selectedTeenId) ?? null,
    [teenSummaries, selectedTeenId],
  );

  const filteredPending = useMemo(
    () => filterSubmissionsForTeen(pending, selectedTeenId),
    [pending, selectedTeenId],
  );
  const filteredApproved = useMemo(
    () => filterSubmissionsForTeen(approved, selectedTeenId),
    [approved, selectedTeenId],
  );

  const sessionSections = useMemo(
    () => groupAdultDashboardSections(filteredPending, filteredApproved),
    [filteredPending, filteredApproved],
  );

  function renderProgressHeader() {
    if (!teenSummaries.length) return null;

    return (
      <View style={styles.progressSection}>
        <TeenSwitcher
          teens={teenSummaries}
          selectedTeenId={selectedTeenId}
          onSelectTeen={handleSelectTeen}
          theme={theme}
        />
        {selectedTeen ? (
          <DriverProgressSummary
            progress={selectedTeen.progress}
            eligibility={selectedTeen.eligibility}
          />
        ) : null}
      </View>
    );
  }

  function renderSessionRow(item, sectionKey) {
    const isApproved = sectionKey === 'approved';
    return (
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate('ApproveSession', { requestHash: item.requestHash })}
        accessibilityRole="button"
        accessibilityLabel={`Session ${formatDate(item.session?.startedAt)}`}
      >
        <View style={styles.rowContent}>
          <Text style={styles.rowDate}>{formatDate(item.session?.startedAt)}</Text>
          <Text style={styles.rowMeta}>
            {formatDuration(item.session?.durationMinutes ?? 0)} ·{' '}
            {formatDayNightSummary(item.session?.durationMinutes, item.session?.nightMinutes)}
          </Text>
          {isApproved ? (
            <Text style={styles.approvedMeta}>
              {formatAdultApprovedLabel(item, userId)}
            </Text>
          ) : null}
        </View>
        <ListRowChevron />
      </Pressable>
    );
  }

  const emptySessionsMessage = selectedTeen
    ? `No practice sessions yet for ${shortDisplayNameForTeen(teenSummaries, selectedTeen.teenUserId)}.`
    : 'No practice sessions yet.';

  return (
    <Screen style={styles.container} withHeader>
      <ScreenHeader
        title="Adult dashboard"
        rightAction={
          <IconCircleButton
            icon="settings-outline"
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Settings"
          />
        }
      />

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color={theme.accent} />
        ) : teenSummaries.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>No linked drivers yet</Text>
            <Text style={styles.emptyBody}>
              Enter an invite code from your teen to review and approve their practice sessions.
            </Text>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
              onPress={() => navigation.navigate('LinkAdult')}
            >
              <Text style={[styles.primaryBtnText, { color: theme.accentText }]}>
                Enter invite code
              </Text>
            </Pressable>
          </View>
        ) : (
          <SectionList
            style={styles.list}
            contentContainerStyle={sessionSections.length === 0 ? styles.listEmpty : undefined}
            sections={sessionSections}
            keyExtractor={(item) => item.requestHash}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handlePullRefresh} />
            }
            stickySectionHeadersEnabled={false}
            ListHeaderComponent={renderProgressHeader()}
            ListEmptyComponent={<Text style={styles.emptyList}>{emptySessionsMessage}</Text>}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.listSectionTitle}>{title}</Text>
            )}
            renderItem={({ item, section }) => renderSessionRow(item, section.key)}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  progressSection: { marginBottom: 20 },
  loader: { marginTop: 40 },
  listSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2b3c',
    marginTop: 4,
    marginBottom: 8,
  },
  list: { flex: 1 },
  listEmpty: { flexGrow: 1 },
  emptyBlock: { marginTop: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a2b3c', marginBottom: 8 },
  emptyBody: { fontSize: 15, lineHeight: 22, color: '#5a6b7c', marginBottom: 20 },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { fontWeight: '600', fontSize: 16 },
  emptyList: { color: '#6a7b8c', fontSize: 15, marginTop: 8 },
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
  rowContent: { flex: 1, paddingRight: 8 },
  rowDate: { fontSize: 15, color: '#1a2b3c', marginTop: 2 },
  rowMeta: { fontSize: 14, color: '#5a6b7c', marginTop: 2 },
  approvedMeta: { fontSize: 13, color: '#15803d', marginTop: 6 },
});
