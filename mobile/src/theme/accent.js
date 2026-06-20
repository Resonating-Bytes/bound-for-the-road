import { deriveAccentFromHeader } from './colorMath';
import { relativeLuminance } from './contrast';

const LIGHT_ON_ACCENT = '#f8fafc';
const DARK_ON_ACCENT = '#1a2b3c';

export function getAccentTextColor(accent) {
  return relativeLuminance(accent) < 0.45 ? LIGHT_ON_ACCENT : DARK_ON_ACCENT;
}

/** Hybrid: preset.accent when set, else derived from header. Custom theme uses stored accent hex. */
export function resolveAccentForPreset(preset) {
  const accent = preset?.accent ?? deriveAccentFromHeader(preset.headerBackground);
  return {
    accent,
    accentText: getAccentTextColor(accent),
  };
}
