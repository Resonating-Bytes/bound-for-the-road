import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { useTheme } from '../../context/ThemeContext';
import { shared, themeAccentStyles } from './sharedStyles';

export function OnboardingNameScreen({ navigation }) {
  const { user, saveProfile } = useAuth();
  const { theme } = useTheme();
  const accent = themeAccentStyles(theme);
  const [name, setName] = useState(user?.legalName ?? '');

  function next() {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveProfile({
      legalName: trimmed,
      role: 'teen',
      dateOfBirth: user?.dateOfBirth,
      stateCode: user?.stateCode ?? 'IL',
      permitIssueDate: user?.permitIssueDate,
      email: user?.email,
    });
    navigation.navigate('OnboardingDOB');
  }

  return (
    <Screen>
      <View style={shared.content}>
      <Text style={shared.title}>Your legal name</Text>
      <Text style={shared.hint}>Use your full legal name — it appears on your driving log.</Text>
      <TextInput
        style={shared.input}
        value={name}
        onChangeText={setName}
        placeholder="First and last name"
        autoCapitalize="words"
      />
      <Pressable
        style={[shared.button, accent.button, !name.trim() && shared.buttonDisabled]}
        onPress={next}
      >
        <Text style={[shared.buttonText, accent.buttonText]}>Continue</Text>
      </Pressable>
      </View>
    </Screen>
  );
}
