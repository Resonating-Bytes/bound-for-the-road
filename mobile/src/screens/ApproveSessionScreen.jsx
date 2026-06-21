import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { fetchSubmissionDetail, approveSubmissionRemote, declineSubmissionRemote } from '../lib/submissions';
import { formatDate, formatDateTime, formatDuration } from '../utils/time';
import { formatDayNightSummary } from '../utils/dayNight';
import { SUPERVISOR_NAME_HINT } from '../config/profileCopy';
import { limitNameLength, clampName, MAX_LEGAL_NAME_LENGTH } from '../utils/names';
import { useTheme } from '../context/ThemeContext';
import { rgbaFromHex } from '../theme/colorMath';

const PRESENCE_OPTIONS = [
  { value: 'co_present', label: 'I was in the car' },
  { value: 'other_adult', label: 'Another adult was in the car' },
];

export function ApproveSessionScreen({ route, navigation }) {
  const { requestHash } = route.params ?? {};
  const { userId, user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [approverPresent, setApproverPresent] = useState('co_present');
  const [supervisorName, setSupervisorName] = useState('');
  const [busyAction, setBusyAction] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchSubmissionDetail(requestHash);
        if (!cancelled) {
          if (
            result &&
            !result.approval &&
            (result.submission?.superseded ||
              result.session?.status === 'deleted' ||
              result.session?.deletedAt)
          ) {
            Alert.alert('No longer pending', 'This session was discarded or is no longer available.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
            setLoading(false);
            return;
          }
          setDetail(result);
        }
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

  async function handleSendBack() {
    if (!detail?.session) return;

    Alert.alert(
      'Send back for revision?',
      'The teen will need to review and submit this session again. The driving record is not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send back',
          style: 'destructive',
          onPress: async () => {
            setBusyAction('sendBack');
            try {
              await declineSubmissionRemote({
                sessionId: detail.session.id,
                requestHash,
              });
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e.message ?? 'Could not send session back.');
            } finally {
              setBusyAction(null);
            }
          },
        },
      ],
    );
  }

  const needsSupervisorName = approverPresent === 'other_adult';
  const supervisorNameReady = !needsSupervisorName || Boolean(supervisorName.trim());
  const canApprove = confirmed && supervisorNameReady;

  async function handleApprove() {
    if (!canApprove) {
      if (!confirmed) {
        Alert.alert('Attestation required', 'Confirm the session record is accurate before approving.');
      }
      return;
    }
    if (!detail?.session) return;

    setBusyAction('approve');
    try {
      const joinedSession = approverPresent === 'co_present';
      const supervisorInVehicleName = joinedSession
        ? user?.legalName?.trim() ?? null
        : clampName(supervisorName, MAX_LEGAL_NAME_LENGTH);
      await approveSubmissionRemote({
        sessionId: detail.session.id,
        requestHash,
        approvedByUserId: userId,
        joinedSession,
        supervisorInVehicleName,
        approverPresent,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message ?? 'Could not approve session.');
    } finally {
      setBusyAction(null);
    }
  }

  const busy = busyAction !== null;

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
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

  const { session, approval, approverName } = detail;
  const isApprovedView = Boolean(approval);

  return (
    <Screen withHeader>
      <ScreenHeader
        title={isApprovedView ? 'Session details' : 'Approve session'}
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Row label="Start" value={formatDateTime(session.startedAt)} />
          <Row label="End" value={formatDateTime(session.endedAt)} />
          <Row label="Duration" value={formatDuration(session.durationMinutes ?? 0)} />
          <Row label="Day / night" value={formatDayNightSummary(session.durationMinutes, session.nightMinutes)} />
          {session.notes ? <Row label="Notes" value={session.notes} /> : null}
        </View>

        {isApprovedView ? (
          <View style={styles.approvedBanner}>
            <Text style={styles.approvedBannerText}>
              Approved by {approverName ?? 'Supervisor'}, {formatDate(approval.approvedAt)}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Who supervised this session?</Text>
            {PRESENCE_OPTIONS.map((option) => (
              <View key={option.value}>
                <Pressable
                  style={[
                    styles.radioRow,
                    approverPresent === option.value && {
                      borderColor: theme.accent,
                      backgroundColor: rgbaFromHex(theme.accent, 0.08),
                    },
                  ]}
                  onPress={() => setApproverPresent(option.value)}
                >
                  <View
                    style={[
                      styles.radio,
                      approverPresent === option.value && {
                        borderColor: theme.accent,
                        backgroundColor: theme.accent,
                      },
                    ]}
                  />
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </Pressable>
                {option.value === 'other_adult' && approverPresent === 'other_adult' ? (
                  <View style={styles.supervisorField}>
                    <Text style={styles.supervisorHint}>{SUPERVISOR_NAME_HINT}</Text>
                    <TextInput
                      style={styles.supervisorInput}
                      value={supervisorName}
                      onChangeText={(text) =>
                        setSupervisorName(limitNameLength(text, MAX_LEGAL_NAME_LENGTH))
                      }
                      placeholder="Full legal name"
                      autoCapitalize="words"
                    />
                  </View>
                ) : null}
              </View>
            ))}

            <Text style={styles.sectionTitle}>Your attestation</Text>
            <Pressable style={styles.checkRow} onPress={() => setConfirmed((v) => !v)}>
              <View
                style={[
                  styles.checkbox,
                  confirmed && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
              >
                {confirmed ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.checkLabel}>
                I confirm this session record is accurate to the best of my knowledge.
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.approveBtn,
                { backgroundColor: theme.accent },
                (busy || !canApprove) && styles.disabled,
              ]}
              onPress={handleApprove}
              disabled={busy || !canApprove}
            >
              <Text style={[styles.approveBtnText, { color: theme.accentText }]}>
                {busyAction === 'approve' ? 'Approving…' : 'Approve'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.sendBackBtn, busy && styles.disabled]}
              onPress={handleSendBack}
              disabled={busy}
            >
              <Text style={styles.sendBackBtnText}>
                {busyAction === 'sendBack' ? 'Sending back…' : 'Send back for revision'}
              </Text>
            </Pressable>
          </>
        )}
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
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a2b3c', marginBottom: 10, marginTop: 4 },
  approvedBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 14,
  },
  approvedBannerText: { fontSize: 15, color: '#15803d', fontWeight: '600' },
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
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 10,
  },
  radioLabel: { flex: 1, fontSize: 15, color: '#1a2b3c' },
  supervisorField: { marginBottom: 12, paddingHorizontal: 4 },
  supervisorHint: { fontSize: 14, color: '#6a7b8c', marginBottom: 8, lineHeight: 20 },
  supervisorInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  approveBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  approveBtnText: { fontWeight: '700', fontSize: 16 },
  sendBackBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  sendBackBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.6 },
});
