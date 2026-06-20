import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ListRowChevron } from './ListRowChevron';

export function SettingsNavRow({ label, subtitle, onPress, isLast = false }) {
  return (
    <Pressable
      style={[styles.row, isLast && styles.rowLast]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <ListRowChevron />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2b3c',
  },
  rowSubtitle: {
    fontSize: 14,
    color: '#6a7b8c',
    marginTop: 2,
  },
});
