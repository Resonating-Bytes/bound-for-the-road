import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { StatePickerField } from '../../components/StatePickerField';
import { DEFAULT_STATE_CODE } from '../../config/usStates';
import { shared } from './sharedStyles';

export function OnboardingStateScreen({ navigation }) {
  const { user, saveProfile } = useAuth();
  const [stateCode, setStateCode] = useState(user?.stateCode ?? DEFAULT_STATE_CODE);

  function next() {
    saveProfile({
      legalName: user.legalName,
      dateOfBirth: user.dateOfBirth,
      stateCode,
      permitIssueDate: user?.permitIssueDate,
      email: user?.email,
    });
    navigation.navigate('OnboardingPermit');
  }

  return (
    <Screen>
      <View style={shared.content}>
        <Text style={shared.title}>Your state</Text>
        <Text style={shared.hint}>Where you hold your learner's permit.</Text>
        <StatePickerField value={stateCode} onChange={setStateCode} />
        <Pressable style={shared.button} onPress={next}>
          <Text style={shared.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
