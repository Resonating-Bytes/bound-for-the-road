/** Header color presets — device-local preference (see ThemeContext). */

export const DEFAULT_PRESET_ID = 'charcoal';

export const PRESET_CATEGORIES = [
  { key: 'neutrals', label: 'Neutrals' },
  { key: 'saturated', label: 'Saturated' },
  { key: 'light', label: 'Light' },
  { key: 'vibrant', label: 'Vibrant' },
];

/**
 * Curated accent per preset (hybrid model — preset default, user custom hex later).
 * Chosen for contrast on light screen backgrounds and harmony with header hue.
 */
export const HEADER_THEME_PRESETS = [
  // Neutrals (light → dark)
  {
    id: 'sand',
    label: 'Sand',
    category: 'neutrals',
    headerBackground: '#C4B5A5',
    headerBorder: '#A89888',
    accent: '#83643F',
  },
  {
    id: 'slate',
    label: 'Slate',
    category: 'neutrals',
    headerBackground: '#A0A0A0',
    headerBorder: '#878787',
    accent: '#475569',
  },
  {
    id: 'charcoal',
    label: 'Charcoal',
    category: 'neutrals',
    headerBackground: '#4A4A4A',
    headerBorder: '#383838',
    accent: '#2563EB',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    category: 'neutrals',
    headerBackground: '#1E293B',
    headerBorder: '#334155',
    accent: '#38BDF8',
  },
  // Saturated
  {
    id: 'navy',
    label: 'Navy',
    category: 'saturated',
    headerBackground: '#1E3A5F',
    headerBorder: '#152A45',
    accent: '#C1C5C7',
  },
  {
    id: 'scarlet',
    label: 'Scarlet',
    category: 'saturated',
    headerBackground: '#B91C1C',
    headerBorder: '#991B1B',
    accent: '#586491',
  },
  {
    id: 'forest',
    label: 'Forest',
    category: 'saturated',
    headerBackground: '#14532D',
    headerBorder: '#166534',
    accent: '#22C55E',
  },
  {
    id: 'amber',
    label: 'Amber',
    category: 'saturated',
    headerBackground: '#D97706',
    headerBorder: '#B45309',
    accent: '#C2410C',
  },
  // Light (pastel headers → deeper saturated accents)
  {
    id: 'ocean',
    label: 'Ocean',
    category: 'light',
    headerBackground: '#DBEAFE',
    headerBorder: '#BFDBFE',
    accent: '#2563EB',
  },
  {
    id: 'sage',
    label: 'Sage',
    category: 'light',
    headerBackground: '#DCFCE7',
    headerBorder: '#BBF7D0',
    accent: '#15803D',
  },
  {
    id: 'lilac',
    label: 'Lilac',
    category: 'light',
    headerBackground: '#EDE9FE',
    headerBorder: '#DDD6FE',
    accent: '#7C3AED',
  },
  {
    id: 'peach',
    label: 'Peach',
    category: 'light',
    headerBackground: '#FFEDD5',
    headerBorder: '#FED7AA',
    accent: '#BBFFB9',
  },
  // Vibrant (bold headers → deeper accents for buttons/links on light screens)
  {
    id: 'brightOrange',
    label: 'Bright orange',
    category: 'vibrant',
    headerBackground: '#F97316',
    headerBorder: '#EA580C',
    accent: '#C2410C',
  },
  {
    id: 'hotPink',
    label: 'Hot pink',
    category: 'vibrant',
    headerBackground: '#EC4899',
    headerBorder: '#DB2777',
    accent: '#BE185D',
  },
  {
    id: 'limeGreen',
    label: 'Lime green',
    category: 'vibrant',
    headerBackground: '#3CF73C',
    headerBorder: '#32CD32',
    accent: '#C1C5C7',
  },
  {
    id: 'royalBlue',
    label: 'Royal blue',
    category: 'vibrant',
    headerBackground: '#2563EB',
    headerBorder: '#1D4ED8',
    accent: '#1E40AF',
  },
];

export function getPresetById(id) {
  return HEADER_THEME_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function getPresetsByCategory() {
  return PRESET_CATEGORIES.map((category) => ({
    ...category,
    presets: HEADER_THEME_PRESETS.filter((preset) => preset.category === category.key),
  }));
}
