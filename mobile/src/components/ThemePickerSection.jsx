import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { resolveTheme } from '../theme/resolveTheme';
import { getPresetsByCategory } from '../theme/presets';

export function ThemePickerSection() {
  const { presetId, setPresetId, selectedPreset } = useTheme();
  const categories = getPresetsByCategory();

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Header color</Text>
      <Text style={styles.hint}>Applies to the top bar on every screen.</Text>
      <Text style={styles.selectedLabel}>{selectedPreset?.label ?? 'Slate'}</Text>

      {categories.map((category) => (
        <View key={category.key} style={styles.categoryBlock}>
          <Text style={styles.categoryLabel}>{category.label}</Text>
          <View style={styles.swatches}>
            {category.presets.map((preset) => {
              const selected = preset.id === presetId;
              const contrast = resolveTheme(preset.id);
              return (
                <Pressable
                  key={preset.id}
                  onPress={() => setPresetId(preset.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${preset.label} header color`}
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [styles.swatchWrap, pressed && styles.swatchPressed]}
                >
                  <View
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: preset.headerBackground,
                        borderColor: preset.headerBorder,
                      },
                      selected && styles.swatchSelected,
                    ]}
                  >
                    {selected ? (
                      <Ionicons name="checkmark" size={20} color={contrast.headerText} />
                    ) : null}
                  </View>
                  <Text style={styles.swatchLabel}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const SWATCH_SIZE = 48;

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a2b3c',
    marginBottom: 4,
  },
  hint: {
    fontSize: 14,
    color: '#6a7b8c',
    marginBottom: 8,
    lineHeight: 20,
  },
  selectedLabel: {
    fontSize: 13,
    color: '#5a6b7c',
    marginBottom: 16,
  },
  categoryBlock: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6a7b8c',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchWrap: {
    width: 72,
    alignItems: 'center',
  },
  swatchPressed: {
    opacity: 0.85,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  swatchLabel: {
    fontSize: 11,
    color: '#5a6b7c',
    textAlign: 'center',
  },
});
