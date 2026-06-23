import { useState } from 'react';
import {
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AuthTextField } from '../../components/AuthTextField';
import { validatePasswordMatch } from '../../lib/emailAuth';
import { getEmailAuthRedirectUri } from '../../lib/authRedirect';
import { useTheme } from '../../context/ThemeContext';
import { authScreen, themeAuthBtn } from './authScreenStyles';

export function RegisterScreen({ navigation }) {
  const { signUpWithEmailPassword } = useAuth();
  const { theme } = useTheme();
  const accent = themeAuthBtn(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState(null);

  async function handleRegister() {
    const matchError = validatePasswordMatch(password, confirmPassword);
    if (matchError) {
      Alert.alert('Passwords do not match', matchError);
      return;
    }

    setLoading(true);
    try {
      const result = await signUpWithEmailPassword(email, password);
      if (result.needsConfirmation) {
        setConfirmationMessage(result.message);
        return;
      }
      // Email confirm disabled (e.g. dev) — session established via onAuthStateChange.
    } catch (e) {
      Alert.alert('Registration failed', e.message ?? 'Could not create account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen withHeader>
      <ScreenHeader title="Create account" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={authScreen.container} keyboardShouldPersistTaps="handled">
          {confirmationMessage ? (
            <View style={authScreen.successCard}>
              <Text style={authScreen.successText}>{confirmationMessage}</Text>
              {__DEV__ ? (
                <>
                  <Text style={[authScreen.hint, styles.confirmHint]}>
                    Open the link on this phone with Expo already running (same Wi‑Fi). Do not open on
                    a laptop.
                  </Text>
                  <Text style={authScreen.hint}>Email redirect: {getEmailAuthRedirectUri()}</Text>
                  <Text style={authScreen.hint}>
                    If the link shows /{ '--' }/auth/callback, restart Expo and register again — or
                    update Supabase Site URL to match the line above.
                  </Text>
                </>
              ) : null}
            </View>
          ) : (
            <>
              <Text style={authScreen.body}>
                Use your email and a password. We&apos;ll send a confirmation link before your first
                sign-in.
              </Text>

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
                placeholder="At least 8 characters"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
              />
              <AuthTextField
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
              />
            </>
          )}

          {confirmationMessage ? (
            <Pressable
              style={[authScreen.primaryBtn, accent.button]}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={[authScreen.primaryBtnText, accent.buttonText]}>Back to sign in</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[authScreen.primaryBtn, accent.button, loading && styles.disabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.accentText} />
              ) : (
                <Text style={[authScreen.primaryBtnText, accent.buttonText]}>Create account</Text>
              )}
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  disabled: { opacity: 0.6 },
  confirmHint: { marginTop: 12 },
});
