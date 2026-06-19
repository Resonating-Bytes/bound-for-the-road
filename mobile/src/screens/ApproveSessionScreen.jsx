import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { fetchSubmissionDetail, approveSubmissionRemote } from '../lib/submissions';
import { formatDateTime, formatDuration } from '../utils/time';
import { dayNightLabel } from '../utils/dayNight';

const PRESENCE_OPTIONS = [
  { value: 'co_present', label: 'I was in the car' },
  { value: 'remote', label: 'Not in the vehicle (reviewing later)' },
  { value: 'unknown', label: 'Not sure / prefer not to say' },
];

export function ApproveSessionScreen({ route, navigation }) {
  const { requestHash } = route.params ?? {};
  const { userId, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [approverPresent, setApproverPresent] = useState('co_present');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchSubmissionDetail(requestHash);
        if (!cancelled) setDetail(result);
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Error', e.message ?? 'Could not load session.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestHash, navigation]);

  async function handleApprove() {
    if (!confirmed) {
      Alert.alert('Attestation required', 'Confirm the session record is accurate before approving.');
      return;
    }
    if (!detail?.session) return;

    setSubmitting(true);
    try {
      const joinedSession = approverPresent === 'co_present';
      await approveSubmissionRemote({
        sessionId: detail.session.id,
        requestHash,
        approvedByUserId: userId,
        joinedSession,
        supervisorInVehicleName: joinedSession ? user?.legalName ?? null : null,
        approverPresent,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message ?? 'Could not approve session.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </Screen>
    );
  }

  if (!detail?.session) {
    return (
      <Screen style={styles.centered}>
        <Text style={styles.missing}>Session not found.</Text>
      </Screen>
    );
  }

  const { session } = detail;

  return (
    <Screen withHeader>
      <ScreenHeader
        title="Approve session"
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Row label="Start" value={formatDateTime(session.startedAt)} />
          <Row label="End" value={formatDateTime(session.endedAt)} />
          <Row label="Duration" value={formatDuration(session.durationMinutes ?? 0)} />
          <Row label="Day / night" value={dayNightLabel(session.dayNight)} />
          {session.notes ? <Row label="Notes" value={session.notes} /> : null}
        </View>

        <Text style={styles.sectionTitle}>How were you present?</Text>
        {PRESENCE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.radioRow, approverPresent === option.value && styles.radioRowSelected]}
            onPress={() => setApproverPresent(option.value)}
          >
            <View
              style={[styles.radio, approverPresent === option.value && styles.radioSelected]}
            />
            <Text style={styles.radioLabel}>{option.label}</Text>
          </Pressable>
        ))}

        <Text style={styles.sectionTitle}>Your attestation</Text>
        <Pressable style={styles.checkRow} onPress={() => setConfirmed((v) => !v)}>
          <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
            {confirmed ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.checkLabel}>
            I confirm this session record is accurate to the best of my knowledge.
          </Text>
        </Pressable>

        <Pressable
          style={[styles.approveBtn, (submitting || !confirmed) && styles.disabled]}
          onPress={handleApprove}
          disabled={submitting || !confirmed}
        >
          <Text style={styles.approveBtnText}>{submitting ? 'Approving…' : 'Approve'}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  missing: { fontSize: 16, color: '#5a6b7c' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowLabel: { color: '#5a6b7c', fontSize: 15 },
  rowValue: {
    color: '#1a2b3c',
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a2b3c', marginBottom: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkmark: { color: '#fff', fontWeight: '700', fontSize: 14 },
  checkLabel: { flex: 1, fontSize: 15, lineHeight: 22, color: '#1a2b3c' },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  radioRowSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 10,
  },
  radioSelected: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  radioLabel: { flex: 1, fontSize: 15, color: '#1a2b3c' },
  approveBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.6 },
});
