import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, Pressable, StyleSheet, Alert, ScrollView, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { DatePickerField } from '../../components/DatePickerField';
import { DeleteAccountButton } from '../../components/DeleteAccountButton';
import { ProfileNameFields } from '../../components/ProfileNameFields';
import { toISODateOnly } from '../../utils/time';
import {
  PERMIT_DATE_FIELD_LABEL,
  PERMIT_DATE_SETTINGS_HINT,
  permitPickerMaximumDate,
} from '../../utils/permitDate';
import { firstTokenFromLegalName } from '../../utils/names';
import { useTheme } from '../../context/ThemeContext';

function profileFormBaseline(user) {
  const legalName = user?.legalName ?? '';
  return {
    legalName,
    displayName: user?.displayName || firstTokenFromLegalName(legalName),
    permitIssueDate: user?.permitIssueDate ?? toISODateOnly(new Date()),
  };
}

export function SettingsProfileScreen({ navigation }) {
  const { user, saveProfile, deleteAllData } = useAuth();
  const { theme } = useTheme();
  const skipDirtyCheckRef = useRef(false);
  const baseline = useMemo(() => profileFormBaseline(user), [user]);
  const [legalName, setLegalName] = useState(baseline.legalName);
  const [displayName, setDisplayName] = useState(baseline.displayName);
  const [displayTouched, setDisplayTouched] = useState(true);
  const [permitDate, setPermitDate] = useState(baseline.permitIssueDate);
  const isTeen = user?.role === 'teen';

  const hasDirtyChanges =
    legalName.trim() !== baseline.legalName.trim() ||
    displayName.trim() !== baseline.displayName.trim() ||
    (isTeen && permitDate !== baseline.permitIssueDate);

  function leaveScreen() {
    skipDirtyCheckRef.current = true;
    navigation.goBack();
  }

  function promptDiscardChanges(onDiscard) {
    Alert.alert('Discard changes?', 'Your unsaved profile changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onDiscard },
    ]);
  }

  function handleBack() {
    if (!hasDirtyChanges) {
      leaveScreen();
      return;
    }
    promptDiscardChanges(leaveScreen);
  }

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (skipDirtyCheckRef.current || !hasDirtyChanges) return;
      e.preventDefault();
      promptDiscardChanges(() => {
        skipDirtyCheckRef.current = true;
        navigation.dispatch(e.data.action);
      });
    });
    return unsubscribe;
  }, [navigation, hasDirtyChanges]);

  function handleLegalChange(text) {
    setLegalName(text);
    if (!displayTouched) {
      setDisplayName(firstTokenFromLegalName(text));
    }
  }

  function handleDisplayChange(text) {
    setDisplayTouched(true);
    setDisplayName(text);
  }

  function handleSaveProfile() {
    const trimmedLegal = legalName.trim();
    const trimmedDisplay = displayName.trim();
    if (!trimmedLegal || !trimmedDisplay) {
      Alert.alert('Name required', 'Legal name and display name are both required.');
      return;
    }
    saveProfile({
      legalName: trimmedLegal,
      displayName: trimmedDisplay,
      role: user.role,
      dateOfBirth: user.dateOfBirth,
      stateCode: user.stateCode,
      permitIssueDate: isTeen ? permitDate : user.permitIssueDate,
      email: user.email,
    });
    Alert.alert('Saved', 'Profile updated.');
  }

  function handleDeleteAll() {
    Alert.alert(
      'Delete all data?',
      'This permanently removes your profile and all sessions on this device. Your cloud account is not deleted — sign out to switch accounts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData();
          },
        },
      ],
    );
  }

  return (
    <Screen withHeader>
      <ScreenHeader title="Profile" onBack={handleBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.meta}>Role: {isTeen ? 'Teen driver' : 'Supervising adult'}</Text>

        <ProfileNameFields
          legalName={legalName}
          displayName={displayName}
          onLegalNameChange={handleLegalChange}
          onDisplayNameChange={handleDisplayChange}
        />

        {isTeen ? (
          <>
            <Text style={styles.label}>{PERMIT_DATE_FIELD_LABEL}</Text>
            <Text style={styles.fieldHint}>{PERMIT_DATE_SETTINGS_HINT}</Text>
            <DatePickerField
              value={permitDate}
              onChange={setPermitDate}
              maximumDate={permitPickerMaximumDate()}
              accessibilityLabel="Expected permit date"
            />
          </>
        ) : null}

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
          onPress={handleSaveProfile}
        >
          <Text style={[styles.primaryBtnText, { color: theme.accentText }]}>Save profile</Text>
        </Pressable>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerHint}>
            Removes your profile and all driving sessions stored on this device. Your cloud account
            is not deleted.
          </Text>
          <Pressable style={styles.dangerBtn} onPress={handleDeleteAll}>
            <Text style={styles.dangerBtnText}>Delete all my data on this device</Text>
          </Pressable>
        </View>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerHint}>
            Permanently deletes your cloud account, links with other users, and synced data. Use
            this to start over if you picked the wrong role.
          </Text>
          <DeleteAccountButton />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  meta: { fontSize: 14, color: '#6a7b8c', marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#1a2b3c', marginBottom: 6 },
  fieldHint: { fontSize: 14, color: '#6a7b8c', marginBottom: 10, lineHeight: 20 },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  primaryBtnText: { fontWeight: '600', fontSize: 16 },
  dangerSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 24,
  },
  dangerHint: {
    fontSize: 14,
    color: '#6a7b8c',
    marginBottom: 12,
  },
  dangerBtn: { paddingVertical: 14, alignItems: 'center' },
  dangerBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 16 },
});
