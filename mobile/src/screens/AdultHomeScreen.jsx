import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconCircleButton } from '../components/IconCircleButton';
import { useFocusPoll } from '../hooks/useFocusPoll';
import { fetchPendingSubmissionsForAdult } from '../lib/submissions';
import { fetchLinkedPartners } from '../lib/links';
import { formatDate, formatDuration } from '../utils/time';
import { dayNightLabel } from '../utils/dayNight';

export function AdultHomeScreen({ navigation }) {
  const { userId } = useAuth();
  const [pending, setPending] = useState([]);
  const [linkedTeens, setLinkedTeens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const partners = await fetchLinkedPartners(userId);
    setLinkedTeens(partners.filter((p) => p.linkId));
    try {
      const rows = await fetchPendingSubmissionsForAdult();
      setPending(rows);
    } catch {
      setPending([]);
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

  useFocusPoll(refresh, 15000);

  async function handlePullRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const teenLabel =
    linkedTeens.length === 1
      ? linkedTeens[0].name
      : linkedTeens.length > 1
        ? `${linkedTeens.length} linked drivers`
        : null;

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
      {teenLabel ? <Text style={styles.contextLabel}>Viewing: {teenLabel}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#2563eb" />
      ) : linkedTeens.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyTitle}>No linked drivers yet</Text>
          <Text style={styles.emptyBody}>
            Enter an invite code from your teen to review and approve their practice sessions.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('LinkAdult')}>
            <Text style={styles.primaryBtnText}>Enter invite code</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Pending approvals</Text>
          <FlatList
            style={styles.list}
            contentContainerStyle={pending.length === 0 ? styles.listEmpty : undefined}
            data={pending}
            keyExtractor={(item) => item.requestHash}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handlePullRefresh} />
            }
            ListEmptyComponent={
              <Text style={styles.emptyList}>No sessions waiting for approval.</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() =>
                  navigation.navigate('ApproveSession', { requestHash: item.requestHash })
                }
              >
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{item.teenName}</Text>
                  <Text style={styles.rowDate}>{formatDate(item.session?.startedAt)}</Text>
                  <Text style={styles.rowMeta}>
                    {formatDuration(item.session?.durationMinutes ?? 0)} ·{' '}
                    {dayNightLabel(item.session?.dayNight)}
                  </Text>
                </View>
                <Text style={styles.reviewLink}>Review</Text>
              </Pressable>
            )}
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
  contextLabel: { fontSize: 14, color: '#5a6b7c', marginBottom: 16 },
  loader: { marginTop: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1a2b3c', marginBottom: 8 },
  list: { flex: 1 },
  listEmpty: { flexGrow: 1 },
  emptyBlock: { marginTop: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a2b3c', marginBottom: 8 },
  emptyBody: { fontSize: 15, lineHeight: 22, color: '#5a6b7c', marginBottom: 20 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
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
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#1a2b3c' },
  rowDate: { fontSize: 15, color: '#1a2b3c', marginTop: 2 },
  rowMeta: { fontSize: 14, color: '#5a6b7c', marginTop: 2 },
  reviewLink: { color: '#2563eb', fontWeight: '600' },
});
