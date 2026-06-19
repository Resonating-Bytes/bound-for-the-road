import { useState } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { useTheme } from '../context/ThemeContext';

export function SignInScreen() {
  const { supabaseAuth, signInWithGoogle, mockSignIn } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      const session = await signInWithGoogle();
      if (!session?.user) return;
    } catch (e) {
      Alert.alert('Sign-in failed', e.message ?? 'Could not sign in with Google.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMockSignIn() {
    setLoading(true);
    try {
      await mockSignIn();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.container}>
      <Text style={styles.title}>Bound for the Road</Text>
      <Text style={styles.subtitle}>Supervised driving log</Text>

      {supabaseAuth ? (
        <>
          <Text style={styles.body}>Sign in to save your progress and sync when you&apos;re online.</Text>
          <GoogleSignInButton onPress={handleGoogleSignIn} loading={loading} disabled={loading} />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            Supabase is not configured. Using local mock sign-in for offline development.
          </Text>
          <Pressable
            style={[styles.mockButton, { backgroundColor: theme.accent }]}
            onPress={handleMockSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <Text style={[styles.mockButtonText, { color: theme.accentText }]}>
                Continue (mock sign-in)
              </Text>
            )}
          </Pressable>
        </>
      )}
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
  mockButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  mockButtonText: { fontSize: 16, fontWeight: '600' },
});
