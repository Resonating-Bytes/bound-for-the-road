import { useState } from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { AuthTextField } from '../../components/AuthTextField';
import { getAuthRedirectUri, getEmailAuthRedirectUri } from '../../lib/authRedirect';
import { useTheme } from '../../context/ThemeContext';
import { authScreen, themeAuthBtn } from './authScreenStyles';

export function SignInScreen({ navigation, route }) {
  const notice = route.params?.notice;
  const { supabaseAuth, signInWithGoogle, signInWithEmailPassword, resendSignupConfirmation, mockSignIn } =
    useAuth();
  const { theme } = useTheme();
  const accent = themeAuthBtn(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailSignIn() {
    setLoading(true);
    try {
      await signInWithEmailPassword(email, password);
    } catch (e) {
      const message = e.message ?? 'Could not sign in.';
      if (message.includes('Confirm your email')) {
        Alert.alert('Email not confirmed', message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Resend confirmation',
            onPress: async () => {
              try {
                const hint = await resendSignupConfirmation(email);
                Alert.alert('Email sent', hint);
              } catch (err) {
                Alert.alert('Could not resend', err.message ?? 'Try again later.');
              }
            },
          },
        ]);
      } else {
        Alert.alert('Sign-in failed', message);
      }
    } finally {
      setLoading(false);
    }
  }

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
    <Screen style={authScreen.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={authScreen.title}>Bound for the Road</Text>
          <Text style={authScreen.subtitle}>Supervised driving log</Text>

          {notice ? (
            <View style={authScreen.successCard}>
              <Text style={authScreen.successText}>{notice}</Text>
            </View>
          ) : null}

          {supabaseAuth ? (
            <>
              <Text style={authScreen.body}>
                Sign in to save your progress and sync when you&apos;re online.
              </Text>

              <GoogleSignInButton onPress={handleGoogleSignIn} loading={loading} disabled={loading} />

              <View style={authScreen.dividerRow}>
                <View style={authScreen.dividerLine} />
                <Text style={authScreen.dividerText}>or</Text>
                <View style={authScreen.dividerLine} />
              </View>

              <AuthTextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
              <AuthTextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                textContentType="password"
                autoComplete="password"
              />

              <Pressable
                style={[authScreen.primaryBtn, accent.button, loading && styles.disabled]}
                onPress={handleEmailSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.accentText} />
                ) : (
                  <Text style={[authScreen.primaryBtnText, accent.buttonText]}>Sign in</Text>
                )}
              </Pressable>

              <Pressable
                style={authScreen.linkRow}
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={loading}
              >
                <Text style={[authScreen.linkText, accent.link]}>Forgot password?</Text>
              </Pressable>

              <Pressable
                style={authScreen.linkRow}
                onPress={() => navigation.navigate('Register')}
                disabled={loading}
              >
                <Text style={[authScreen.linkText, accent.link]}>Create an account</Text>
              </Pressable>

              {__DEV__ ? (
                <>
                  <Text style={authScreen.hint}>OAuth redirect: {getAuthRedirectUri()}</Text>
                  <Text style={authScreen.hint}>Email redirect: {getEmailAuthRedirectUri()}</Text>
                </>
              ) : null}
            </>
          ) : (
            <>
              <Text style={authScreen.body}>
                Supabase is not configured. Using local mock sign-in for offline development.
              </Text>
              <Pressable
                style={[authScreen.primaryBtn, accent.button]}
                onPress={handleMockSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.accentText} />
                ) : (
                  <Text style={[authScreen.primaryBtnText, accent.buttonText]}>
                    Continue (mock sign-in)
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: 24 },
  disabled: { opacity: 0.6 },
});
