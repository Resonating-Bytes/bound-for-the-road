const LIGHT_TEXT = '#f8fafc';
const DARK_TEXT = '#1a2b3c';

/** Relative luminance threshold — below uses light text + light status bar. */
export const LUMINANCE_THRESHOLD = 0.45;

function expandHex(hex) {
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    return normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  return normalized;
}

function hexToRgb(hex) {
  const full = expandHex(hex);
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function srgbToLinear(channel) {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
  );
}

export function getHeaderContrast(headerBackground) {
  const useLightText = relativeLuminance(headerBackground) < LUMINANCE_THRESHOLD;
  return {
    headerText: useLightText ? LIGHT_TEXT : DARK_TEXT,
    statusBarStyle: useLightText ? 'light' : 'dark',
  };
}
