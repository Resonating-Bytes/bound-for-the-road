import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { DatePickerField } from '../../components/DatePickerField';
import { toISODateOnly } from '../../utils/time';
import {
  PERMIT_DATE_FIELD_LABEL,
  PERMIT_DATE_HINT,
  permitPickerMaximumDate,
} from '../../utils/permitDate';
import { useTheme } from '../../context/ThemeContext';
import { shared, themeAccentStyles } from './sharedStyles';

export function OnboardingPermitScreen() {
  const { user, saveProfile } = useAuth();
  const { theme } = useTheme();
  const accent = themeAccentStyles(theme);
  const [permitDate, setPermitDate] = useState(
    user?.permitIssueDate ?? toISODateOnly(new Date()),
  );

  function finish() {
    saveProfile({
      legalName: user.legalName,
      displayName: user.displayName,
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
        <Text style={shared.title}>{PERMIT_DATE_FIELD_LABEL}</Text>
        <Text style={shared.hint}>{PERMIT_DATE_HINT}</Text>
        <DatePickerField
          value={permitDate}
          onChange={setPermitDate}
          maximumDate={permitPickerMaximumDate()}
          accessibilityLabel="Expected permit date"
        />
        <Pressable style={[shared.button, accent.button]} onPress={finish}>
          <Text style={[shared.buttonText, accent.buttonText]}>Continue</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
