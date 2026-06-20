import { View, Text, TextInput, StyleSheet } from 'react-native';
import { LEGAL_NAME_HINT, DISPLAY_NAME_HINT } from '../config/profileCopy';
import {
  limitNameLength,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_LEGAL_NAME_LENGTH,
} from '../utils/names';

export function ProfileNameFields({
  legalName,
  displayName,
  onLegalNameChange,
  onDisplayNameChange,
  legalHint = LEGAL_NAME_HINT,
  displayHint = DISPLAY_NAME_HINT,
  inputStyle,
  labelStyle,
  hintStyle,
}) {
  return (
    <>
      <Text style={[styles.label, labelStyle]}>Legal name</Text>
      <Text style={[styles.hint, hintStyle]}>{legalHint}</Text>
      <TextInput
        style={[styles.input, inputStyle]}
        value={legalName}
        onChangeText={(text) => onLegalNameChange(limitNameLength(text, MAX_LEGAL_NAME_LENGTH))}
        placeholder="First and last name"
        autoCapitalize="words"
      />

      <Text style={[styles.label, labelStyle]}>Display name</Text>
      <Text style={[styles.hint, hintStyle]}>{displayHint}</Text>
      <TextInput
        style={[styles.input, inputStyle]}
        value={displayName}
        onChangeText={(text) => onDisplayNameChange(limitNameLength(text, MAX_DISPLAY_NAME_LENGTH))}
        placeholder="How linked users see you"
        autoCapitalize="words"
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: '600', color: '#1a2b3c', marginBottom: 4 },
  hint: { fontSize: 14, color: '#6a7b8c', marginBottom: 8, lineHeight: 20 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
});
