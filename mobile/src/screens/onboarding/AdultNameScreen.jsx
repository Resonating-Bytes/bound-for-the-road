import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { shared } from './sharedStyles';

export function OnboardingAdultNameScreen() {
  const { user, saveProfile } = useAuth();
  const [name, setName] = useState(user?.legalName ?? '');

  function finish() {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveProfile({
      legalName: trimmed,
      role: 'adult',
      email: user?.email,
      dateOfBirth: null,
      stateCode: user?.stateCode ?? 'IL',
      permitIssueDate: null,
    });
  }

  return (
    <Screen>
      <View style={shared.content}>
        <Text style={shared.title}>Your legal name</Text>
        <Text style={shared.hint}>Used on driving log approvals.</Text>
        <TextInput
          style={shared.input}
          value={name}
          onChangeText={setName}
          placeholder="First and last name"
          autoCapitalize="words"
        />
        <Pressable style={[shared.button, !name.trim() && shared.buttonDisabled]} onPress={finish}>
          <Text style={shared.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
