import { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { DatePickerField } from '../../components/DatePickerField';
import { isAtLeastAge, toISODateOnly, yearsAgo } from '../../utils/time';
import { DEFAULT_STATE_CODE } from '../../config/usStates';
import { shared } from './sharedStyles';

export function OnboardingDOBScreen({ navigation }) {
  const { user, saveProfile } = useAuth();
  const [dob, setDob] = useState(user?.dateOfBirth ?? toISODateOnly(yearsAgo(16)));

  function next() {
    if (!isAtLeastAge(dob, 13)) {
      Alert.alert('Age requirement', 'You must be at least 13 to use Bound for the Road.');
      return;
    }
    saveProfile({
      legalName: user.legalName,
      dateOfBirth: dob,
      stateCode: user?.stateCode ?? DEFAULT_STATE_CODE,
      permitIssueDate: user?.permitIssueDate,
      email: user?.email,
    });
    navigation.navigate('OnboardingState');
  }

  return (
    <Screen>
      <View style={shared.content}>
        <Text style={shared.title}>Date of birth</Text>
        <Text style={shared.hint}>Must be 13 or older.</Text>
        <DatePickerField
          value={dob}
          onChange={setDob}
          minimumDate={yearsAgo(100)}
          maximumDate={yearsAgo(13)}
        />
        <Pressable style={shared.button} onPress={next}>
          <Text style={shared.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
