import { useState, useEffect } from 'react';
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
  reopenSavedSession,
  getSessionApprovalContext,
  getApprovalForHash,
  hasUnsyncedSubmissionOutbox,
} from '../db/queries';
import {
  submitSessionForApproval,
  sendSavedSessionForApproval,
  discardSessionSubmission,
  resolveApproverName,
  syncSessionReopenedForEdit,
} from '../lib/submissions';
import { formatDateTime, formatDuration, durationMinutes } from '../utils/time';
import { classifyDayNight, dayNightLabel } from '../utils/dayNight';
import { getCurfewWarning } from '../utils/curfew';
import { IL_RULES } from '../config/states/IL';
import { cancelSessionNotifications, scheduleSessionNudge } from '../utils/notifications';
import { isSupabaseConfigured } from '../lib/supabase';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { getSessionDisplayStatus } from '../utils/sessionStatus';

export function ReviewSessionScreen({ route, navigation }) {
  const { sessionId, editing, editBackup, staleExpired } = route.params ?? {};
  const { userId } = useAuth();
  const { theme } = useTheme();
  const { canRemoteWrite } = useCompatibility();
  const session = getSessionById(sessionId);
  const [notes, setNotes] = useState(session?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [displayStatus, setDisplayStatus] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!session || session.status !== 'saved') {
      setDisplayStatus(null);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const ctx = getSessionApprovalContext(sessionId);
      let approverName;
      if (ctx?.approval) {
        approverName = await resolveApproverName(ctx.approval);
      }
      if (!cancelled) {
        setDisplayStatus(
          getSessionDisplayStatus(session, {
            submission: ctx?.submission,
            approval: ctx?.approval,
            latestApproval: ctx?.latestApproval,
            approverName,
            pendingRemoteSync: hasUnsyncedSubmissionOutbox(sessionId),
            canRemoteWrite,
          }),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, canRemoteWrite]);

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
    Alert.alert('Discard edits?', 'Your edits will be thrown away. The original log entry is kept.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard edits', style: 'destructive', onPress: revertEdit },
    ]);
  }

  function handleDiscardDraft() {
    Alert.alert('Discard session?', 'This draft will be permanently deleted.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard session',
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

  function confirmDiscardSession({ title, message, onDiscard }) {
    Alert.alert(title, message, [
      { text: 'Keep session', style: 'cancel' },
      {
        text: 'Discard session',
        style: 'destructive',
        onPress: onDiscard,
      },
    ]);
  }

  function handleDiscardSessionWhileEditing() {
    const wasApproved = Boolean(
      editBackup?.requestHash && getApprovalForHash(editBackup.requestHash),
    );
    confirmDiscardSession({
      title: wasApproved ? 'Discard approved session?' : 'Discard session?',
      message: wasApproved
        ? 'This permanently removes an approved session from your log and progress totals. Your supervisor\'s approval will no longer apply to this drive.'
        : 'This removes the session from your log and progress totals.',
      onDiscard: async () => {
        await cancelSessionNotifications(sessionId);
        softDeleteSession(sessionId);
        goDashboard();
      },
    });
  }

  function handleDiscardSubmittedSession() {
    confirmDiscardSession({
      title: 'Discard session?',
      message:
        'This removes the session from your log and clears it from your supervisor\'s pending list.',
      onDiscard: async () => {
        setActionBusy(true);
        try {
          await discardSessionSubmission(sessionId);
          goDashboard();
        } catch (e) {
          Alert.alert('Error', e.message ?? 'Could not discard session.');
        } finally {
          setActionBusy(false);
        }
      },
    });
  }

  function handleEditSaved() {
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
            onPress: () => openSavedEdit(before),
          },
        ],
      );
      return;
    }
    openSavedEdit(before);
  }

  function openSavedEdit(before) {
    reopenSavedSession(sessionId);
    syncSessionReopenedForEdit(sessionId).catch((e) => {
      console.warn('Remote edit sync failed:', e.message);
    });
    navigation.replace('ReviewSession', {
      sessionId,
      editing: true,
      editBackup: {
        requestHash: before.requestHash,
        payloadJson: before.payloadJson,
        notes: before.notes,
      },
    });
  }

  function handleSendForApproval() {
    Alert.alert(
      'Send for approval?',
      'Your supervisor will be notified to review this session.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setActionBusy(true);
            try {
              await sendSavedSessionForApproval(sessionId);
              goDashboard();
            } catch (e) {
              Alert.alert('Error', e.message ?? 'Could not send for approval.');
            } finally {
              setActionBusy(false);
            }
          },
        },
      ],
    );
  }

  const showDiscardSubmitted =
    displayStatus?.key === 'pending' || displayStatus?.key === 'saved_local';
  const showSend = displayStatus?.key === 'saved_local' && canRemoteWrite;

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

        {!isDraft && !editing && displayStatus?.label ? (
          <Text
            style={[
              styles.statusText,
              displayStatus.key === 'approved' && styles.statusApproved,
              displayStatus.key === 'pending' && styles.statusPending,
              displayStatus.key === 'saved_local' && styles.statusSavedLocal,
              displayStatus.key === 'needs_revision' && styles.statusNeedsRevision,
              displayStatus.key === 'superseded' && styles.statusSuperseded,
            ]}
          >
            {displayStatus.label}
          </Text>
        ) : null}

        {!isDraft && !editing && session.notes ? (
          <>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.notesReadOnly}>{session.notes}</Text>
          </>
        ) : null}

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
              style={[
                styles.saveBtn,
                { backgroundColor: theme.accent },
                saving && styles.disabled,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={[styles.saveBtnText, { color: theme.accentText }]}>
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
                <Text style={styles.discardBtnText}>Discard session</Text>
              </Pressable>
            )}
          </View>
        )}

        {!isDraft && !editing && (
          <View style={styles.actions}>
            {showSend ? (
              <Pressable
                style={[
                  styles.saveBtn,
                  { backgroundColor: theme.accent },
                  actionBusy && styles.disabled,
                ]}
                onPress={handleSendForApproval}
                disabled={actionBusy}
              >
                <Text style={[styles.saveBtnText, { color: theme.accentText }]}>
                  Send for approval
                </Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.secondaryBtn} onPress={handleEditSaved}>
              <Text style={styles.secondaryBtnText}>Edit session</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={goDashboard}>
              <Text style={styles.secondaryBtnText}>Back to dashboard</Text>
            </Pressable>
            {showDiscardSubmitted ? (
              <Pressable
                style={styles.discardBtn}
                onPress={handleDiscardSubmittedSession}
                disabled={actionBusy}
              >
                <Text style={styles.discardBtnText}>Discard session</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {editing && (
          <Pressable
            style={[styles.discardBtn, styles.discardBtnSpaced]}
            onPress={handleDiscardSessionWhileEditing}
          >
            <Text style={styles.discardBtnText}>Discard session</Text>
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
  notesReadOnly: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    lineHeight: 22,
    color: '#1a2b3c',
  },
  statusText: { fontSize: 14, marginBottom: 16, color: '#5a6b7c' },
  statusApproved: { color: '#15803d' },
  statusPending: { color: '#b45309' },
  statusSavedLocal: { color: '#1d4ed8' },
  statusNeedsRevision: { color: '#dc2626' },
  statusSuperseded: { color: '#9333ea' },
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
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { fontWeight: '700', fontSize: 16 },
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
  discardBtnSpaced: { marginTop: 16 },
  disabled: { opacity: 0.6 },
});
