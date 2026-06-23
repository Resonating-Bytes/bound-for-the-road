import { useEffect, useState } from 'react';
import { Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDb } from './src/db/client';
import { AuthProvider } from './src/context/AuthContext';
import { CompatibilityProvider } from './src/context/CompatibilityContext';
import { SyncProvider } from './src/context/SyncContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { Screen } from './src/components/Screen';
import { ThemeProvider, ThemeStatusBar } from './src/context/ThemeContext';
import { DEFAULT_COLORS } from './src/theme/colors';
import { isSupabaseConfigured } from './src/lib/supabase';
import { resolveAuthCallback, AUTH_ALREADY_CONFIRMED_NOTICE } from './src/lib/authCallback';
import { subscribeAuthLinkUrls } from './src/lib/authLinkBootstrap';
import { navigateToSignInNotice } from './src/navigation/navigationRef';
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
      const result = await resolveAuthCallback(url);
      if (result.type === 'ignored') return;

      if (result.type === 'already_used') {
        navigateToSignInNotice(AUTH_ALREADY_CONFIRMED_NOTICE);
        return;
      }

      if (result.type === 'session') {
        // Session is applied via Supabase client; AuthContext picks it up via onAuthStateChange.
        return;
      }

      if (result.type === 'error') {
        Alert.alert('Email link', result.message);
      }
    }

    const unsubscribe = subscribeAuthLinkUrls(handleUrl);
    return unsubscribe;
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
          <ActivityIndicator size="large" color={DEFAULT_COLORS.accent} />
        </Screen>
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <CompatibilityProvider>
          <AuthProvider>
            <SyncProvider>
              <ThemeProvider>
                <RootNavigator />
                <ThemeStatusBar />
              </ThemeProvider>
            </SyncProvider>
          </AuthProvider>
        </CompatibilityProvider>
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
