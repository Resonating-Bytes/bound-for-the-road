import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

/**
 * Wraps screen content with safe-area insets.
 * Pass withHeader when the screen uses ScreenHeader so header color fills the status bar area.
 */
export function Screen({ children, style, edges, withHeader = false }) {
  const resolvedEdges = edges ?? (withHeader ? ['left', 'right'] : ['top', 'left', 'right']);
  return (
    <SafeAreaView style={[styles.safe, style]} edges={resolvedEdges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
});
