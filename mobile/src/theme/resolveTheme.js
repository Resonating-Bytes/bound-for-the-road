import { DEFAULT_COLORS } from './colors';
import { resolveAccentForPreset } from './accent';
import { resolveCustomTheme, isCustomPresetId } from './customTheme';
import { getHeaderContrast } from './contrast';
import { getHaloTextStyle } from './headerTitleEffects';
import { DEFAULT_PRESET_ID, getPresetById } from './presets';

export function resolveTheme(presetId = DEFAULT_PRESET_ID, customColors = null) {
  if (isCustomPresetId(presetId)) {
    const custom = resolveCustomTheme(customColors);
    if (custom) return custom;
  }

  const preset = getPresetById(presetId) ?? getPresetById(DEFAULT_PRESET_ID);
  const contrast = getHeaderContrast(preset.headerBackground);
  const accentTokens = resolveAccentForPreset(preset);

  return {
    ...DEFAULT_COLORS,
    headerBackground: preset.headerBackground,
    headerBorder: preset.headerBorder,
    headerText: contrast.headerText,
    statusBarStyle: contrast.statusBarStyle,
    accent: accentTokens.accent,
    accentText: accentTokens.accentText,
    headerTitleHalo: getHaloTextStyle(preset.headerBackground),
  };
}
