import { Modal, View, Text, Pressable, StyleSheet, Switch } from 'react-native';

export function ExportOptionsModal({
  visible,
  includeRoadCategory,
  onIncludeRoadCategoryChange,
  onCancel,
  onExport,
  accent,
  accentText,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Export options</Text>
          <Text style={styles.subtitle}>Choose optional fields to include in your log export.</Text>

          <View style={styles.optionRow}>
            <View style={styles.optionCopy}>
              <Text style={styles.optionLabel}>Road category</Text>
              <Text style={styles.optionHint}>
                Local/highway breakdown when GPS coverage was sufficient during the drive.
              </Text>
            </View>
            <Switch
              value={includeRoadCategory}
              onValueChange={onIncludeRoadCategoryChange}
              trackColor={{ false: '#cbd5e1', true: accent }}
              accessibilityLabel="Include road category in export"
            />
          </View>

          <View style={styles.actions}>
            <Pressable
              style={styles.cancelBtn}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel export"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.exportBtn, { backgroundColor: accent }]}
              onPress={onExport}
              accessibilityRole="button"
              accessibilityLabel="Export with selected options"
            >
              <Text style={[styles.exportBtnText, { color: accentText }]}>Export</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a2b3c',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6a7b8c',
    lineHeight: 20,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  optionCopy: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a2b3c',
    marginBottom: 4,
  },
  optionHint: {
    fontSize: 13,
    color: '#6a7b8c',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelBtnText: {
    color: '#1a2b3c',
    fontWeight: '600',
    fontSize: 16,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  exportBtnText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
