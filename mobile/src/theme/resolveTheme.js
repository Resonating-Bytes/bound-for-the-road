import { DEFAULT_COLORS } from './colors';
import { getHeaderContrast } from './contrast';
import { DEFAULT_PRESET_ID, getPresetById } from './presets';

export function resolveTheme(presetId = DEFAULT_PRESET_ID) {
  const preset = getPresetById(presetId) ?? getPresetById(DEFAULT_PRESET_ID);
  const contrast = getHeaderContrast(preset.headerBackground);
  return {
    ...DEFAULT_COLORS,
    headerBackground: preset.headerBackground,
    headerBorder: preset.headerBorder,
    headerText: contrast.headerText,
    statusBarStyle: contrast.statusBarStyle,
  };
}
