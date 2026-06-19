import { useEffect, useState } from 'react';
import { Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { initDb } from './src/db/client';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { Screen } from './src/components/Screen';
import { ThemeProvider, ThemeStatusBar } from './src/context/ThemeContext';
import { isSupabaseConfigured } from './src/lib/supabase';
import { createSessionFromUrl } from './src/lib/googleAuth';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    try {
      initDb();
      setDbReady(true);
    } catch (e) {
      setDbError(e.message ?? 'Database failed to initialize');
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    async function handleUrl(url) {
      if (!url || (!url.includes('code=') && !url.includes('access_token='))) return;
      try {
        await createSessionFromUrl(url);
      } catch (e) {
        console.warn('Auth callback failed:', e.message);
      }
    }

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    return () => subscription.remove();
  }, []);

  if (dbError) {
    return (
      <SafeAreaProvider>
        <Screen style={styles.center}>
          <Text style={styles.errorTitle}>Database error</Text>
          <Text style={styles.errorBody}>{dbError}</Text>
        </Screen>
      </SafeAreaProvider>
    );
  }

  if (!dbReady) {
    return (
      <SafeAreaProvider>
        <Screen style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </Screen>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <RootNavigator />
            <ThemeStatusBar />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#dc2626', marginBottom: 8 },
  errorBody: { fontSize: 15, color: '#5a6b7c', textAlign: 'center' },
});
