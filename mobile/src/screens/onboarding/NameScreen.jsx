import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { ProfileNameFields } from '../../components/ProfileNameFields';
import { useTheme } from '../../context/ThemeContext';
import { firstTokenFromLegalName } from '../../utils/names';
import { shared, themeAccentStyles } from './sharedStyles';

export function OnboardingNameScreen({ navigation }) {
  const { user, saveProfile } = useAuth();
  const { theme } = useTheme();
  const accent = themeAccentStyles(theme);
  const [legalName, setLegalName] = useState(user?.legalName ?? '');
  const [displayName, setDisplayName] = useState(
    user?.displayName || firstTokenFromLegalName(user?.legalName ?? ''),
  );
  const [displayTouched, setDisplayTouched] = useState(Boolean(user?.displayName?.trim()));

  function handleLegalChange(text) {
    setLegalName(text);
    if (!displayTouched) {
      setDisplayName(firstTokenFromLegalName(text));
    }
  }

  function handleDisplayChange(text) {
    setDisplayTouched(true);
    setDisplayName(text);
  }

  function next() {
    const trimmedLegal = legalName.trim();
    const trimmedDisplay = displayName.trim();
    if (!trimmedLegal || !trimmedDisplay) return;
    saveProfile({
      legalName: trimmedLegal,
      displayName: trimmedDisplay,
      role: 'teen',
      dateOfBirth: user?.dateOfBirth,
      stateCode: user?.stateCode ?? 'IL',
      permitIssueDate: user?.permitIssueDate,
      email: user?.email,
    });
    navigation.navigate('OnboardingDOB');
  }

  const canContinue = legalName.trim() && displayName.trim();

  return (
    <Screen>
      <View style={shared.content}>
        <Text style={shared.title}>Your name</Text>
        <ProfileNameFields
          legalName={legalName}
          displayName={displayName}
          onLegalNameChange={handleLegalChange}
          onDisplayNameChange={handleDisplayChange}
          inputStyle={shared.input}
          labelStyle={shared.fieldLabel}
          hintStyle={shared.hint}
        />
        <Pressable
          style={[shared.button, accent.button, !canContinue && shared.buttonDisabled]}
          onPress={next}
        >
          <Text style={[shared.buttonText, accent.buttonText]}>Continue</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
