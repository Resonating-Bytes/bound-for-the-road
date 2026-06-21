import { useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { CUSTOM_PRESET_ID, isValidCustomThemeColors, resolveCustomTheme } from '../theme/customTheme';

const SWATCH_SIZE = 48;
const PLACEHOLDER_HEADER = '#e2e8f0';
const PLACEHOLDER_ACCENT = '#cbd5e1';

function HexField({ label, value, onChangeText, onFocus, placeholder, fieldRef }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View ref={fieldRef} style={styles.hexRow} collapsable={false}>
        <Text style={styles.hash}>#</Text>
        <TextInput
          style={styles.hexInput}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          keyboardType="default"
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          accessibilityLabel={`${label} color hex`}
        />
      </View>
    </View>
  );
}

export function CustomThemeSection({ onInputFocus }) {
  const {
    presetId,
    selectedPreset,
    customColors,
    setCustomPrimary,
    setCustomAccent,
    selectCustomTheme,
    copyPresetToCustom,
    canCopyPresetToCustom,
  } = useTheme();

  const selected = presetId === CUSTOM_PRESET_ID;
  const canApply = isValidCustomThemeColors(customColors);
  const preview = resolveCustomTheme(customColors);
  const headerBackground = preview?.headerBackground ?? PLACEHOLDER_HEADER;
  const headerBorder = preview?.headerBorder ?? '#cbd5e1';
  const headerText = preview?.headerText ?? '#5a6b7c';
  const accent = preview?.accent ?? PLACEHOLDER_ACCENT;
  const accentHighlight = preview?.accent ?? '#94a3b8';

  const primaryRef = useRef(null);
  const accentRef = useRef(null);

  function handleFocus(inputRef) {
    onInputFocus?.(inputRef);
  }

  return (
    <View style={styles.categoryBlock}>
      <Text style={styles.categoryLabel}>Custom</Text>

      <View style={styles.editorRow}>
        <Pressable
          onPress={selectCustomTheme}
          disabled={!canApply}
          accessibilityRole="button"
          accessibilityLabel="Apply custom colors"
          accessibilityState={{ selected, disabled: !canApply }}
          style={({ pressed }) => [
            styles.swatchColumn,
            !canApply && styles.swatchDisabled,
            pressed && canApply && styles.swatchPressed,
          ]}
        >
          <View
            style={[
              styles.swatch,
              {
                backgroundColor: headerBackground,
                borderColor: headerBorder,
              },
              selected && [
                styles.swatchSelected,
                { borderColor: accentHighlight, shadowColor: accentHighlight },
              ],
            ]}
          >
            {selected ? <Ionicons name="checkmark" size={20} color={headerText} /> : null}
          </View>
          <View style={[styles.accentChip, { backgroundColor: accent }]} accessibilityLabel="Custom accent" />
        </Pressable>

        <View style={styles.fieldsColumn}>
          <HexField
            label="Primary"
            value={customColors.primary}
            onChangeText={setCustomPrimary}
            onFocus={() => handleFocus(primaryRef)}
            placeholder="DBEAFE"
            fieldRef={primaryRef}
          />
          <HexField
            label="Accent"
            value={customColors.accent}
            onChangeText={setCustomAccent}
            onFocus={() => handleFocus(accentRef)}
            placeholder="2563EB"
            fieldRef={accentRef}
          />
        </View>
      </View>

      <Pressable
        onPress={copyPresetToCustom}
        disabled={!canCopyPresetToCustom}
        accessibilityRole="button"
        accessibilityLabel={
          canCopyPresetToCustom
            ? `Copy ${selectedPreset.label} colors to custom theme`
            : 'Copy from preset'
        }
        accessibilityState={{ disabled: !canCopyPresetToCustom }}
        style={({ pressed }) => [
          styles.copyBtn,
          !canCopyPresetToCustom && styles.copyBtnDisabled,
          pressed && canCopyPresetToCustom && styles.copyBtnPressed,
        ]}
      >
        <Text style={styles.copyBtnText}>
          {canCopyPresetToCustom ? `Copy from ${selectedPreset.label}` : 'Copy from preset'}
        </Text>
      </Pressable>

      <Text style={styles.hint}>
        Your hex values are saved even when you pick a preset. Tap the swatch to apply them.
      </Text>

      {!canApply ? (
        <Text style={styles.validationHint}>Enter six hex digits for primary and accent to apply.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  editorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 8,
  },
  swatchColumn: {
    width: 72,
    alignItems: 'center',
  },
  swatchDisabled: {
    opacity: 0.55,
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
    marginBottom: 4,
  },
  swatchSelected: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  accentChip: {
    width: 28,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  fieldsColumn: {
    flex: 1,
    gap: 10,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldLabel: {
    width: 58,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a2b3c',
  },
  hexRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  hash: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5a6b7c',
    marginRight: 2,
  },
  hexInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a2b3c',
    letterSpacing: 1,
  },
  hint: {
    fontSize: 14,
    color: '#6a7b8c',
    lineHeight: 20,
  },
  validationHint: {
    fontSize: 13,
    color: '#6a7b8c',
    marginTop: 8,
    lineHeight: 18,
  },
  copyBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  copyBtnDisabled: {
    opacity: 0.45,
  },
  copyBtnPressed: {
    opacity: 0.85,
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a2b3c',
  },
});
