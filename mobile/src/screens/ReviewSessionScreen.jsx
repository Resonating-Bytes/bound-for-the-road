import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useCompatibility } from '../context/CompatibilityContext';
import {
  getSessionById,
  discardDraft,
  resumeSession,
  softDeleteSession,
  restoreSavedSession,
  hasActiveLink,
} from '../db/queries';
import { submitSessionForApproval } from '../lib/submissions';
import { formatDateTime, formatDuration, durationMinutes } from '../utils/time';
import { classifyDayNight, dayNightLabel } from '../utils/dayNight';
import { getCurfewWarning } from '../utils/curfew';
import { IL_RULES } from '../config/states/IL';
import { cancelSessionNotifications, scheduleSessionNudge } from '../utils/notifications';
import { isSupabaseConfigured } from '../lib/supabase';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';

export function ReviewSessionScreen({ route, navigation }) {
  const { sessionId, editing, editBackup, staleExpired } = route.params ?? {};
  const { userId } = useAuth();
  const { canRemoteWrite } = useCompatibility();
  const session = getSessionById(sessionId);
  const [notes, setNotes] = useState(session?.notes ?? '');
  const [saving, setSaving] = useState(false);

  if (!session) {
    return (
      <Screen>
        <Text style={styles.missing}>Session not found.</Text>
      </Screen>
    );
  }

  const mins = durationMinutes(session.startedAt, session.endedAt);
  const dayNight = classifyDayNight(session.startedAt);
  const curfewWarning = getCurfewWarning(session.startedAt, session.endedAt);
  const isDraft = session.status === 'draft';
  const submitBlocked = isSupabaseConfigured() && !canRemoteWrite;

  const originalNotes = editing ? (editBackup?.notes ?? '') : (session.notes ?? '');
  const notesChanged = notes !== originalNotes;

  function goDashboard() {
    navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
  }

  async function handleSave() {
    if (!submitBlocked && !hasActiveLink(userId)) {
      Alert.alert(
        'Link a supervisor first',
        'Submit for approval requires a linked supervising adult. Invite one from Settings, or choose Invite later and come back when linked.',
      );
      return;
    }
    if (mins < IL_RULES.minSessionWarnMinutes) {
      Alert.alert(
        'Short session',
        'This session is under 5 minutes. Short sessions may not be useful for your log. Save anyway?',
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Save anyway', onPress: () => doSave() },
        ],
      );
      return;
    }
    await doSave();
  }

  async function doSave() {
    setSaving(true);
    try {
      const result = await submitSessionForApproval(sessionId, { notes, submittedByUserId: userId });
      await cancelSessionNotifications(sessionId);
      if (result.pendingRemote) {
        Alert.alert(
          'Saved on this device',
          'Your practice time is recorded. Update the app to send this session to your supervisor for approval.',
          [{ text: 'OK', onPress: goDashboard }],
        );
        return;
      }
      goDashboard();
    } catch (e) {
      Alert.alert('Error', e.message ?? 'Could not save session.');
    } finally {
      setSaving(false);
    }
  }

  function revertEdit() {
    if (editBackup) {
      restoreSavedSession(sessionId, editBackup);
    }
    goDashboard();
  }

  function handleBackFromEdit() {
    if (!notesChanged) {
      revertEdit();
      return;
    }
    Alert.alert('Discard changes?', 'Your edits will be thrown away. The original log entry is kept.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard changes', style: 'destructive', onPress: revertEdit },
    ]);
  }

  function handleDiscardDraft() {
    Alert.alert('Discard session?', 'This draft will be permanently deleted.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await cancelSessionNotifications(sessionId);
          discardDraft(sessionId);
          goDashboard();
        },
      },
    ]);
  }

  async function handleResume() {
    resumeSession(sessionId);
    await scheduleSessionNudge(sessionId, session.startedAt);
    navigation.replace('ActiveSession', { sessionId });
  }

  function handleDeleteFromLog() {
    Alert.alert(
      'Delete session?',
      'This removes the session from your log and progress totals.',
      [
        { text: 'Keep session', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await cancelSessionNotifications(sessionId);
            softDeleteSession(sessionId);
            goDashboard();
          },
        },
      ],
    );
  }

  return (
    <Screen withHeader>
      <ScreenHeader
        title={editing ? 'Edit session' : 'Review session'}
        onBack={editing ? handleBackFromEdit : undefined}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Row label="Start" value={formatDateTime(session.startedAt)} />
          <Row label="End" value={formatDateTime(session.endedAt)} />
          <Row label="Duration" value={formatDuration(mins)} />
          <Row label="Day / night" value={dayNightLabel(session.dayNight ?? dayNight)} />
        </View>

        {staleExpired && (
          <Text style={styles.warning}>
            This session was running over {IL_RULES.staleActiveHours} hours and was automatically
            stopped. Review the times, then submit or discard.
          </Text>
        )}

        {curfewWarning && <Text style={styles.warning}>{curfewWarning}</Text>}

        {isDraft && submitBlocked && (
          <Text style={styles.warning}>
            Submit for approval is unavailable until you update the app (see the banner above). You can
            still save this session to your log on this device.
          </Text>
        )}

        {isDraft && (
          <>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Route, weather, supervisor name…"
              multiline
            />
          </>
        )}

        {isDraft && (
          <View style={styles.actions}>
            <Pressable
              style={[styles.saveBtn, saving && styles.disabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving
                  ? 'Saving…'
                  : submitBlocked
                    ? 'Save to log'
                    : 'Submit for approval'}
              </Text>
            </Pressable>
            {!editing && (
              <Pressable style={styles.secondaryBtn} onPress={handleResume}>
                <Text style={styles.secondaryBtnText}>Resume</Text>
              </Pressable>
            )}
            {editing ? (
              <Pressable style={styles.discardBtn} onPress={handleBackFromEdit}>
                <Text style={styles.discardBtnText}>Discard edits</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.discardBtn} onPress={handleDiscardDraft}>
                <Text style={styles.discardBtnText}>Discard</Text>
              </Pressable>
            )}
          </View>
        )}

        {!isDraft && !editing && (
          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={goDashboard}>
              <Text style={styles.secondaryBtnText}>Back to dashboard</Text>
            </Pressable>
          </View>
        )}

        {editing && (
          <Pressable style={styles.deleteBtn} onPress={handleDeleteFromLog}>
            <Text style={styles.deleteBtnText}>Delete from log</Text>
          </Pressable>
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
  missing: { padding: 20, fontSize: 16, color: '#5a6b7c' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowLabel: { color: '#5a6b7c', fontSize: 15 },
  rowValue: { color: '#1a2b3c', fontSize: 15, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  warning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  label: { fontSize: 15, fontWeight: '600', color: '#1a2b3c', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 16,
  },
  actions: { gap: 10 },
  saveBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryBtnText: { color: '#1a2b3c', fontWeight: '600', fontSize: 16 },
  discardBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  discardBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 16 },
  deleteBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  deleteBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.6 },
});
