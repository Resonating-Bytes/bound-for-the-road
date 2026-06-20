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
    id: 'espresso',
    label: 'Espresso',
    category: 'neutrals',
    headerBackground: '#D7CCC8',
    headerBorder: '#BCAAA4',
    accent: '#3E2723',
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
    id: 'slate',
    label: 'Slate',
    category: 'neutrals',
    headerBackground: '#2C3E50',
    headerBorder: '#1A252F',
    accent: '#18BC9C',
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
    accent: '#4191E1',
  },
  {
    id: 'scarlet',
    label: 'Scarlet',
    category: 'saturated',
    headerBackground: '#B91C1C',
    headerBorder: '#991B1B',
    accent: '#D4AF37',
  },
  {
    id: 'forest',
    label: 'Forest',
    category: 'saturated',
    headerBackground: '#14532D',
    headerBorder: '#0F3F22',
    accent: '#22C55E',
  },
  {
    id: 'plum',
    label: 'Royal Plum',
    category: 'saturated',
    headerBackground: '#4A148C',
    headerBorder: '#38006B',
    accent: '#E040FB',
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
    label: 'Blush Peach',
    category: 'light',
    headerBackground: '#FFEDD5',
    headerBorder: '#FED7AA',
    accent: '#E65100',
  },
  // Vibrant (bold headers → deeper accents for buttons/links on light screens)
  {
    id: 'brightOrange',
    label: 'Bright orange',
    category: 'vibrant',
    headerBackground: '#FF5F05',
    headerBorder: '#EA580C',
    accent: '#C2410C',
  },
  {
    id: 'hotPink',
    label: 'Hot pink',
    category: 'vibrant',
    headerBackground: '#F22BEE',
    headerBorder: '#DB2777',
    accent: '#BE185D',
  },
  {
    id: 'lime',
    label: 'Cyber Lime',
    category: 'vibrant',
    headerBackground: '#CCFF00',
    headerBorder: '#B3DE00',
    accent: '#1E293B',
  },
  {
    id: 'violet',
    label: 'Ultraviolet',
    category: 'vibrant',
    headerBackground: '#7C3AED',
    headerBorder: '#6D28D9',
    accent: '#CCFF00',
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
