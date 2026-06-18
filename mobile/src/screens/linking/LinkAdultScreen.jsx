import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { BackButton } from '../../components/BackButton';
import { acceptLinkInvite, formatInviteCode, normalizeInviteCode } from '../../lib/links';
import { canShowBackButton, navigateBackOrHome } from '../../navigation/helpers';
import { shared } from '../onboarding/sharedStyles';

export function LinkAdultScreen({ navigation }) {
  const { user, linked, refreshLinks } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    const normalized = normalizeInviteCode(code);
    if (normalized.length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from the teen driver.');
      return;
    }

    setLoading(true);
    try {
      await acceptLinkInvite(normalized);
      await refreshLinks();
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
    <Screen>
      {canShowBackButton(navigation, linked) ? (
        <BackButton onPress={handleBack} />
      ) : null}
      <View style={[shared.content, styles.content]}>
        <Text style={shared.title}>Enter invite code</Text>
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
          style={[shared.button, (loading || !code.trim()) && shared.buttonDisabled]}
          onPress={handleAccept}
          disabled={loading || !code.trim()}
        >
          <Text style={shared.buttonText}>{loading ? 'Linking…' : 'Link accounts'}</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsLink}>Settings</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = {
  content: {
    paddingTop: 52,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 4,
    textAlign: 'center',
  },
  settingsLink: {
    marginTop: 24,
    textAlign: 'center',
    color: '#2563eb',
    fontSize: 16,
  },
};
