import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { acceptLinkInvite, formatInviteCode, normalizeInviteCode } from '../../lib/links';
import { canShowBackButton, navigateBackOrHome, resetToHome } from '../../navigation/helpers';
import { writeSelectedTeenId } from '../../lib/adultSelectedTeen';
import { useTheme } from '../../context/ThemeContext';
import { shared, themeAccentStyles } from '../onboarding/sharedStyles';

export function LinkAdultScreen({ navigation }) {
  const { user, userId, linked, refreshLinks } = useAuth();
  const { theme } = useTheme();
  const accent = themeAccentStyles(theme);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const codeComplete = code.length === 6;

  async function handleAccept() {
    const normalized = normalizeInviteCode(code);
    if (normalized.length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from the teen driver.');
      return;
    }

    setLoading(true);
    try {
      const link = await acceptLinkInvite(normalized);
      await refreshLinks();
      if (userId && link?.teenUserId) {
        writeSelectedTeenId(userId, link.teenUserId);
      }
      resetToHome(navigation, user?.role ?? 'adult');
      Alert.alert('Linked', "You're now connected.");
    } catch (e) {
      Alert.alert('Could not link', e.message ?? 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    navigateBackOrHome(navigation, { linked, role: user?.role ?? 'adult' });
  }

  return (
    <Screen withHeader>
      <ScreenHeader
        title="Enter invite code"
        onBack={canShowBackButton(navigation, linked) ? handleBack : undefined}
      />
      <View style={[shared.content, styles.content]}>
        <Text style={shared.hint}>
          Ask the teen driver to share their 6-digit code from Bound for the Road.
        </Text>

        <TextInput
          style={[shared.input, styles.codeInput]}
          value={formatInviteCode(code)}
          onChangeText={(text) => setCode(normalizeInviteCode(text).slice(0, 6))}
          placeholder="482 916"
          keyboardType="number-pad"
          maxLength={7}
        />

        <Pressable
          style={[
            shared.button,
            accent.button,
            (loading || !codeComplete) && shared.buttonDisabled,
          ]}
          onPress={handleAccept}
          disabled={loading || !codeComplete}
        >
          <Text style={[shared.buttonText, accent.buttonText]}>
            {loading ? 'Linking…' : 'Link accounts'}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Settings')}>
          <Text style={[styles.settingsLink, { color: theme.accent }]}>Settings</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = {
  content: {
    paddingTop: 16,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 4,
    textAlign: 'center',
  },
  settingsLink: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 16,
  },
};
