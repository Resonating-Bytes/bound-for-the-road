/** Hex ↔ HSL helpers for accent derivation (theme spike). */

function expandHex(hex) {
  const normalized = String(hex).replace('#', '');
  if (normalized.length === 3) {
    return normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }
  return normalized;
}

export function hexToRgb(hex) {
  const full = expandHex(hex);
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbaFromHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbToHex(r, g, b) {
  const toByte = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / delta + 2) * 60;
        break;
      default:
        h = ((rn - gn) / delta + 4) * 60;
        break;
    }
  }

  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex(h, s, l) {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h < 60) [rn, gn, bn] = [c, x, 0];
  else if (h < 120) [rn, gn, bn] = [x, c, 0];
  else if (h < 180) [rn, gn, bn] = [0, c, x];
  else if (h < 240) [rn, gn, bn] = [0, x, c];
  else if (h < 300) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];

  return rgbToHex((rn + m) * 255, (gn + m) * 255, (bn + m) * 255);
}

/**
 * Approach A — derive accent from header hue; tuned for buttons on #f5f7fa.
 */
export function deriveAccentFromHeader(headerBackground) {
  const { h, s, l } = hexToHsl(headerBackground);
  const accentS = Math.min(88, Math.max(52, s < 12 ? 68 : s + 18));
  const accentL =
    l > 72 ? 44 : l > 55 ? 42 : l < 28 ? 48 : Math.min(52, Math.max(40, l + 10));
  return hslToHex((h + 360) % 360, accentS, accentL);
}

/** Slightly darken header color for border (custom theme). */
export function deriveHeaderBorderFromBackground(headerBackground) {
  const { h, s, l } = hexToHsl(headerBackground);
  return hslToHex(h, Math.min(100, s + 4), Math.max(0, l - 12));
}
