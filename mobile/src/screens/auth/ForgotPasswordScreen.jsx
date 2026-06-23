import { useState } from 'react';
import {
  Text,
  View,
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
import { ScreenHeader } from '../../components/ScreenHeader';
import { AuthTextField } from '../../components/AuthTextField';
import { useTheme } from '../../context/ThemeContext';
import { authScreen, themeAuthBtn } from './authScreenStyles';

export function ForgotPasswordScreen({ navigation }) {
  const { requestPasswordResetEmail } = useAuth();
  const { theme } = useTheme();
  const accent = themeAuthBtn(theme);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState(null);

  async function handleSubmit() {
    setLoading(true);
    try {
      const message = await requestPasswordResetEmail(email);
      setSentMessage(message);
    } catch (e) {
      Alert.alert('Could not send reset email', e.message ?? 'Try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen withHeader>
      <ScreenHeader title="Forgot password" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={authScreen.container} keyboardShouldPersistTaps="handled">
          {sentMessage ? (
            <View style={authScreen.successCard}>
              <Text style={authScreen.successText}>{sentMessage}</Text>
            </View>
          ) : (
            <>
              <Text style={authScreen.body}>
                Enter the email for your account. If we find a match, we&apos;ll send a reset link.
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
            </>
          )}

          {sentMessage ? (
            <Pressable
              style={[authScreen.primaryBtn, accent.button]}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={[authScreen.primaryBtnText, accent.buttonText]}>Back to sign in</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[authScreen.primaryBtn, accent.button, loading && styles.disabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.accentText} />
              ) : (
                <Text style={[authScreen.primaryBtnText, accent.buttonText]}>Send reset link</Text>
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
});
