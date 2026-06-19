import { useState } from 'react';
import { Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { LinkedAccountsSection } from '../components/LinkedAccountsSection';
import { DatePickerField } from '../components/DatePickerField';
import { toISODateOnly } from '../utils/time';
import { canShowBackButton, navigateBackOrHome } from '../navigation/helpers';

export function SettingsScreen({ navigation }) {
  const { user, linked, saveProfile, signOut, deleteAllData, requiresLink, refreshLinks } = useAuth();
  const [name, setName] = useState(user?.legalName ?? '');
  const [permitDate, setPermitDate] = useState(
    user?.permitIssueDate ?? toISODateOnly(new Date()),
  );
  const isTeen = user?.role === 'teen';

  function handleBack() {
    navigateBackOrHome(navigation, { linked, role: user?.role });
  }

  function handleSaveProfile() {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    saveProfile({
      legalName: name.trim(),
      role: user.role,
      dateOfBirth: user.dateOfBirth,
      stateCode: user.stateCode,
      permitIssueDate: isTeen ? permitDate : user.permitIssueDate,
      email: user.email,
    });
    Alert.alert('Saved', 'Profile updated.');
  }

  function handleSignOut() {
    Alert.alert('Sign out?', 'Your local driving log stays on this device. Use this to switch Google accounts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
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

  function handleInvite() {
    navigation.navigate(isTeen ? 'LinkTeen' : 'LinkAdult');
  }

  const showBack = canShowBackButton(navigation, linked);

  return (
    <Screen withHeader>
      <ScreenHeader title="Settings" onBack={showBack ? handleBack : undefined} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.meta}>Role: {isTeen ? 'Teen driver' : 'Supervising adult'}</Text>

        <Text style={styles.label}>Legal name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

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

        <Pressable style={styles.primaryBtn} onPress={handleSaveProfile}>
          <Text style={styles.primaryBtnText}>Save profile</Text>
        </Pressable>

        {requiresLink ? (
          <LinkedAccountsSection
            userId={user?.id}
            role={user?.role}
            refreshLinks={refreshLinks}
            onInvite={handleInvite}
          />
        ) : null}

        <Pressable style={styles.secondaryBtn} onPress={handleSignOut}>
          <Text style={styles.secondaryBtnText}>Sign out</Text>
        </Pressable>

        <Pressable style={styles.dangerBtn} onPress={handleDeleteAll}>
          <Text style={styles.dangerBtnText}>Delete all my data on this device</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  meta: { fontSize: 14, color: '#6a7b8c', marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#1a2b3c', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 12,
  },
  secondaryBtnText: { color: '#1a2b3c', fontWeight: '600', fontSize: 16 },
  dangerBtn: { paddingVertical: 14, alignItems: 'center', marginBottom: 24 },
  dangerBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 16 },
});
