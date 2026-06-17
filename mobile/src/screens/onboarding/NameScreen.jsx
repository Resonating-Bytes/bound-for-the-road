import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { shared } from './sharedStyles';

export function OnboardingNameScreen({ navigation }) {
  const { user, saveProfile } = useAuth();
  const [name, setName] = useState(user?.legalName ?? '');

  function next() {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveProfile({
      legalName: trimmed,
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
      <Text style={shared.hint}>Used on your driving log export.</Text>
      <TextInput
        style={shared.input}
        value={name}
        onChangeText={setName}
        placeholder="First and last name"
        autoCapitalize="words"
      />
      <Pressable style={[shared.button, !name.trim() && shared.buttonDisabled]} onPress={next}>
        <Text style={shared.buttonText}>Continue</Text>
      </Pressable>
      </View>
    </Screen>
  );
}
