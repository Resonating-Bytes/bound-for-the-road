import { useState } from 'react';
import { Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { DatePickerField } from '../components/DatePickerField';
import { toISODateOnly } from '../utils/time';

export function SettingsScreen({ navigation }) {
  const { user, saveProfile, signOut, deleteAllData } = useAuth();
  const [name, setName] = useState(user?.legalName ?? '');
  const [permitDate, setPermitDate] = useState(
    user?.permitIssueDate ?? toISODateOnly(new Date()),
  );

  function handleSaveProfile() {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    saveProfile({
      legalName: name.trim(),
      dateOfBirth: user.dateOfBirth,
      stateCode: user.stateCode,
      permitIssueDate: permitDate,
      email: user.email,
    });
    Alert.alert('Saved', 'Profile updated.');
  }

  function handleSignOut() {
    Alert.alert('Sign out?', 'Your local driving log stays on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: async () => {
          await signOut();
          navigation.reset({ index: 0, routes: [{ name: 'MockSignIn' }] });
        },
      },
    ]);
  }

  function handleDeleteAll() {
    Alert.alert(
      'Delete all data?',
      'This permanently removes your profile and all sessions on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAllData();
            navigation.reset({ index: 0, routes: [{ name: 'MockSignIn' }] });
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Legal name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Permit issue date</Text>
      <DatePickerField value={permitDate} onChange={setPermitDate} maximumDate={new Date()} />

      <Pressable style={styles.primaryBtn} onPress={handleSaveProfile}>
        <Text style={styles.primaryBtnText}>Save profile</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={handleSignOut}>
        <Text style={styles.secondaryBtnText}>Sign out</Text>
      </Pressable>

      <Pressable style={styles.dangerBtn} onPress={handleDeleteAll}>
        <Text style={styles.dangerBtnText}>Delete all my data on this device</Text>
      </Pressable>

      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.backLink}>Back to dashboard</Text>
      </Pressable>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a2b3c', marginBottom: 20 },
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
    marginBottom: 12,
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
  backLink: { color: '#2563eb', textAlign: 'center', fontSize: 16 },
});
