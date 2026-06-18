import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export function BackButton({ onPress }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { top: insets.top + 6 }]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          Platform.OS === 'ios' ? styles.buttonIos : styles.buttonAndroid,
          pressed && styles.pressed,
        ]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons
          name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
          size={Platform.OS === 'ios' ? 22 : 24}
          color="#1a2b3c"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIos: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonAndroid: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
