import { Pressable, Text, Image, StyleSheet, ActivityIndicator, View } from 'react-native';

/**
 * Google Identity "Sign in with Google" button (light theme).
 * @see https://developers.google.com/identity/branding-guidelines
 */
export function GoogleSignInButton({ onPress, disabled, loading }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
    >
      {loading ? (
        <ActivityIndicator color="#1f1f1f" />
      ) : (
        <View style={styles.content}>
          <Image source={require('../../assets/google-g.png')} style={styles.logo} />
          <Text style={styles.label}>Sign in with Google</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#747775',
    borderRadius: 20,
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: '#f8f9fa',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 20,
    height: 20,
    marginRight: 12,
    resizeMode: 'contain',
  },
  label: {
    color: '#1f1f1f',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
