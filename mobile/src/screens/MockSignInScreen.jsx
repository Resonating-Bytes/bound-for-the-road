import { useState } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getUserById, isProfileComplete } from '../db/queries';
import { Screen } from '../components/Screen';

export function MockSignInScreen({ navigation }) {
  const { mockSignIn } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      const id = await mockSignIn();
      const profile = getUserById(id);
      navigation.replace(isProfileComplete(profile) ? 'Dashboard' : 'OnboardingName');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.container}>
      <Text style={styles.title}>TeenDriver</Text>
      <Text style={styles.subtitle}>Illinois supervised driving log</Text>
      <Text style={styles.body}>
        Phase 1 uses mock sign-in for Expo Go testing. Tap below to create or restore your local
        profile.
      </Text>
      <Pressable style={styles.button} onPress={handleSignIn} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue (mock sign-in)</Text>
        )}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: { fontSize: 32, fontWeight: '700', color: '#1a2b3c', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#5a6b7c', marginBottom: 24 },
  body: { fontSize: 16, lineHeight: 24, color: '#2a3b4c', marginBottom: 24 },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
