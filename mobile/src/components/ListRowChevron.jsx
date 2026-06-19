import { Ionicons } from '@expo/vector-icons';

/** Bare chevron for white list tiles — no circle background (iOS-style disclosure). */
export function ListRowChevron({ color = '#94a3b8', size = 22 }) {
  return (
    <Ionicons
      name="chevron-forward"
      size={size}
      color={color}
      accessibilityElementsHidden
    />
  );
}
