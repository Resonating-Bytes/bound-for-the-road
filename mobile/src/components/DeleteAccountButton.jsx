import { Pressable, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { confirmDeleteAccount } from '../utils/confirmDeleteAccount';

export function DeleteAccountButton({ label = 'Delete account', style, textStyle }) {
  const { deleteMyAccount, supabaseAuth } = useAuth();

  if (!supabaseAuth) return null;

  function handlePress() {
    confirmDeleteAccount(async () => {
      try {
        await deleteMyAccount();
      } catch (e) {
        Alert.alert('Could not delete account', e.message ?? 'Try again.');
      }
    });
  }

  return (
    <Pressable style={[styles.button, style]} onPress={handlePress} accessibilityRole="button">
      <Text style={[styles.text, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  text: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 16,
  },
});
