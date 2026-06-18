import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { DatePickerField } from '../../components/DatePickerField';
import { toISODateOnly } from '../../utils/time';
import { shared } from './sharedStyles';

export function OnboardingPermitScreen() {
  const { user, saveProfile } = useAuth();
  const [permitDate, setPermitDate] = useState(
    user?.permitIssueDate ?? toISODateOnly(new Date()),
  );

  function finish() {
    saveProfile({
      legalName: user.legalName,
      role: 'teen',
      dateOfBirth: user.dateOfBirth,
      stateCode: user.stateCode,
      permitIssueDate: permitDate,
      email: user?.email,
    });
  }

  return (
    <Screen>
      <View style={shared.content}>
        <Text style={shared.title}>Permit issue date</Text>
        <Text style={shared.hint}>Required for your eligibility date on the dashboard.</Text>
        <DatePickerField
          value={permitDate}
          onChange={setPermitDate}
          maximumDate={new Date()}
        />
        <Pressable style={shared.button} onPress={finish}>
          <Text style={shared.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
