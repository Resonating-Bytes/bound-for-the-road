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
import { ListRowChevron } from '../components/ListRowChevron';
import { useApprovalPushRefresh } from '../hooks/useApprovalPushRefresh';
import { useProximitySubmitResponder } from '../hooks/useProximitySubmitResponder';
import { fetchPendingSubmissionsForAdult } from '../lib/submissions';
import { fetchLinkedPartners } from '../lib/links';
import { getInstructorSchool } from '../lib/instructorSchool';
import { groupInstructorDashboard } from '../utils/dashboardSessions';
import { formatDate, formatDuration } from '../utils/time';
import { formatDayNightSummary } from '../utils/dayNight';
import { useTheme } from '../context/ThemeContext';

const SORT_MODES = [
  { key: 'newest_pending', label: 'Newest pending' },
  { key: 'alphabetical', label: 'A–Z' },
];

export function InstructorHomeScreen({ navigation }) {
  const { userId } = useAuth();
  const { theme } = useTheme();
  const [pending, setPending] = useState([]);
  const [students, setStudents] = useState([]);
  const [schoolName, setSchoolName] = useState(null);
  const [sortMode, setSortMode] = useState('newest_pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [partners, pendingRows, school] = await Promise.all([
        fetchLinkedPartners(userId),
        fetchPendingSubmissionsForAdult(),
        getInstructorSchool(userId),
      ]);
      setSchoolName(school?.schoolName ?? null);
      setStudents(
        partners.map((partner) => ({
          teenUserId: partner.partnerId,
          name: partner.name,
        })),
      );
      setPending(pendingRows);
    } catch {
      setStudents([]);
      setPending([]);
      setSchoolName(null);
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

  const linkedTeenIds = useMemo(() => students.map((student) => student.teenUserId), [students]);
  useProximitySubmitResponder(linkedTeenIds);

  const pendingByTeenId = useMemo(() => {
    const map = {};
    for (const row of pending) {
      const teenId = row.session?.teenUserId;
      if (!teenId) continue;
      if (!map[teenId]) map[teenId] = [];
      map[teenId].push(row);
    }
    return map;
  }, [pending]);

  const studentGroups = useMemo(
    () => groupInstructorDashboard(students, pendingByTeenId, sortMode),
    [students, pendingByTeenId, sortMode],
  );

  const sections = useMemo(
    () =>
      studentGroups.map((group) => ({
        key: group.teenUserId,
        title: group.name,
        data: group.pending,
      })),
    [studentGroups],
  );

  async function handlePullRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function renderSessionRow(item) {
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
        </View>
        <ListRowChevron />
      </Pressable>
    );
  }

  const headerTitle = schoolName ?? 'Instructor dashboard';

  return (
    <Screen style={styles.container} withHeader>
      <ScreenHeader
        title={headerTitle}
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
        ) : students.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>No linked students yet</Text>
            <Text style={styles.emptyBody}>
              Enter an invite code from a teen driver in Settings to review their practice sessions.
            </Text>
            {!schoolName ? (
              <Text style={styles.emptyHint}>
                Link your driving school during onboarding or ask your school for their 6-digit code.
              </Text>
            ) : null}
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
              onPress={() => navigation.navigate('SettingsLinkedAccounts')}
            >
              <Text style={[styles.primaryBtnText, { color: theme.accentText }]}>Linked accounts</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.sortRow}>
              {SORT_MODES.map((mode) => {
                const active = sortMode === mode.key;
                return (
                  <Pressable
                    key={mode.key}
                    style={[styles.sortChip, active && { backgroundColor: theme.accent }]}
                    onPress={() => setSortMode(mode.key)}
                  >
                    <Text style={[styles.sortChipText, active && { color: theme.accentText }]}>
                      {mode.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <SectionList
              style={styles.list}
              contentContainerStyle={sections.length === 0 ? styles.listEmpty : undefined}
              sections={sections}
              keyExtractor={(item) => item.requestHash}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handlePullRefresh} />
              }
              stickySectionHeadersEnabled={false}
              ListEmptyComponent={
                <Text style={styles.emptyList}>
                  {sortMode === 'newest_pending'
                    ? 'No pending sessions right now.'
                    : 'No linked students yet.'}
                </Text>
              }
              renderSectionHeader={({ section: { title } }) => (
                <Text style={styles.listSectionTitle}>{title}</Text>
              )}
              renderItem={({ item }) => renderSessionRow(item)}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  loader: { marginTop: 40 },
  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  sortChipText: { fontSize: 14, fontWeight: '600', color: '#1a2b3c' },
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
  emptyBody: { fontSize: 15, lineHeight: 22, color: '#5a6b7c', marginBottom: 12 },
  emptyHint: { fontSize: 14, lineHeight: 20, color: '#6a7b8c', marginBottom: 20 },
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
});
