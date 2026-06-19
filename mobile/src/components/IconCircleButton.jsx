import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_COLORS } from '../theme/colors';

export function IconCircleButton({
  icon,
  onPress,
  accessibilityLabel,
  disabled = false,
  size = 36,
  iconSize = 20,
  iconColor = DEFAULT_COLORS.textPrimary,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DEFAULT_COLORS.circleBackground,
    borderWidth: 1,
    borderColor: DEFAULT_COLORS.circleBorder,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
