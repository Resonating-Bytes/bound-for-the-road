import { useState } from 'react';
import { Text, Pressable, StyleSheet, Alert, ScrollView, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { DatePickerField } from '../../components/DatePickerField';
import { DeleteAccountButton } from '../../components/DeleteAccountButton';
import { ProfileNameFields } from '../../components/ProfileNameFields';
import { toISODateOnly } from '../../utils/time';
import { firstTokenFromLegalName } from '../../utils/names';
import { useTheme } from '../../context/ThemeContext';

export function SettingsProfileScreen({ navigation }) {
  const { user, saveProfile, deleteAllData } = useAuth();
  const { theme } = useTheme();
  const [legalName, setLegalName] = useState(user?.legalName ?? '');
  const [displayName, setDisplayName] = useState(
    user?.displayName || firstTokenFromLegalName(user?.legalName ?? ''),
  );
  const [displayTouched, setDisplayTouched] = useState(true);
  const [permitDate, setPermitDate] = useState(
    user?.permitIssueDate ?? toISODateOnly(new Date()),
  );
  const isTeen = user?.role === 'teen';

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
      <ScreenHeader title="Profile" onBack={() => navigation.goBack()} />
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
            <Text style={styles.label}>Permit issue date</Text>
            <DatePickerField
              value={permitDate}
              onChange={setPermitDate}
              maximumDate={new Date()}
              compact
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
