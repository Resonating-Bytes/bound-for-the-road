import { useState } from 'react';
import {
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { AuthTextField } from '../../components/AuthTextField';
import { validatePasswordMatch } from '../../lib/emailAuth';
import { useTheme } from '../../context/ThemeContext';
import { authScreen, themeAuthBtn } from './authScreenStyles';

export function ResetPasswordScreen() {
  const { completePasswordRecovery } = useAuth();
  const { theme } = useTheme();
  const accent = themeAuthBtn(theme);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const matchError = validatePasswordMatch(password, confirmPassword);
    if (matchError) {
      Alert.alert('Passwords do not match', matchError);
      return;
    }

    setLoading(true);
    try {
      await completePasswordRecovery(password);
    } catch (e) {
      Alert.alert('Could not update password', e.message ?? 'Try again.');
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
          <Text style={authScreen.title}>New password</Text>
          <Text style={authScreen.body}>Choose a new password for your account.</Text>

          <AuthTextField
            label="New password"
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

          <Pressable
            style={[authScreen.primaryBtn, accent.button, loading && styles.disabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <Text style={[authScreen.primaryBtnText, accent.buttonText]}>Update password</Text>
            )}
          </Pressable>
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
