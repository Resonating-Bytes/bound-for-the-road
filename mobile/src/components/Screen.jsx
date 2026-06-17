import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

/**
 * Wraps screen content below the status bar / Dynamic Island.
 * Uses react-native-safe-area-context (already required by React Navigation).
 */
export function Screen({ children, style, edges = ['top', 'left', 'right'] }) {
  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
});
