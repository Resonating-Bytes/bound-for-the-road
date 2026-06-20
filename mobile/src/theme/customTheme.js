import { deriveHeaderBorderFromBackground } from './colorMath';
import { getAccentTextColor } from './accent';
import { getHeaderContrast } from './contrast';
import { getHaloTextStyle } from './headerTitleEffects';
import { DEFAULT_COLORS } from './colors';

export const CUSTOM_PRESET_ID = 'custom';

/** Default custom palette — light ocean-style header + blue accent. */
export const DEFAULT_CUSTOM_THEME_COLORS = {
  primary: 'DBEAFE',
  accent: '2563EB',
};

export function sanitizeHexInput(value, maxLength = 6) {
  return String(value)
    .replace(/[^0-9a-fA-F]/g, '')
    .slice(0, maxLength)
    .toUpperCase();
}

export function isCompleteHex(value) {
  return /^[0-9a-fA-F]{6}$/.test(value ?? '');
}

export function isValidCustomThemeColors(colors) {
  return isCompleteHex(colors?.primary) && isCompleteHex(colors?.accent);
}

export function parseCustomThemeColors(raw) {
  if (!raw) return { ...DEFAULT_CUSTOM_THEME_COLORS };
  try {
    const parsed = JSON.parse(raw);
    return {
      primary: sanitizeHexInput(parsed?.primary ?? DEFAULT_CUSTOM_THEME_COLORS.primary),
      accent: sanitizeHexInput(parsed?.accent ?? DEFAULT_CUSTOM_THEME_COLORS.accent),
    };
  } catch {
    return { ...DEFAULT_CUSTOM_THEME_COLORS };
  }
}

export function serializeCustomThemeColors(colors) {
  return JSON.stringify({
    primary: sanitizeHexInput(colors?.primary ?? DEFAULT_CUSTOM_THEME_COLORS.primary),
    accent: sanitizeHexInput(colors?.accent ?? DEFAULT_CUSTOM_THEME_COLORS.accent),
  });
}

export function resolveCustomTheme(customColors) {
  if (!isValidCustomThemeColors(customColors)) {
    return null;
  }

  const headerBackground = `#${customColors.primary}`;
  const accent = `#${customColors.accent}`;
  const headerBorder = deriveHeaderBorderFromBackground(headerBackground);
  const contrast = getHeaderContrast(headerBackground);

  return {
    ...DEFAULT_COLORS,
    headerBackground,
    headerBorder,
    headerText: contrast.headerText,
    statusBarStyle: contrast.statusBarStyle,
    accent,
    accentText: getAccentTextColor(accent),
    headerTitleHalo: getHaloTextStyle(headerBackground),
  };
}

export function isCustomPresetId(presetId) {
  return presetId === CUSTOM_PRESET_ID;
}
