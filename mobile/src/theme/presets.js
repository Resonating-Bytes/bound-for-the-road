/** Header color presets — device-local preference (see ThemeContext). */

export const DEFAULT_PRESET_ID = 'slate';

export const PRESET_CATEGORIES = [
  { key: 'neutrals', label: 'Neutrals' },
  { key: 'saturated', label: 'Saturated' },
  { key: 'light', label: 'Light' },
];

export const HEADER_THEME_PRESETS = [
  // Neutrals (light → dark)
  {
    id: 'sand',
    label: 'Sand',
    category: 'neutrals',
    headerBackground: '#c4b5a5',
    headerBorder: '#a89888',
  },
  {
    id: 'slate',
    label: 'Slate',
    category: 'neutrals',
    headerBackground: '#a0a0a0',
    headerBorder: '#878787',
  },
  {
    id: 'charcoal',
    label: 'Charcoal',
    category: 'neutrals',
    headerBackground: '#4a4a4a',
    headerBorder: '#383838',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    category: 'neutrals',
    headerBackground: '#1e293b',
    headerBorder: '#334155',
  },
  // Saturated
  {
    id: 'navy',
    label: 'Navy',
    category: 'saturated',
    headerBackground: '#1e3a5f',
    headerBorder: '#152a45',
  },
  {
    id: 'crimson',
    label: 'Crimson',
    category: 'saturated',
    headerBackground: '#b91c1c',
    headerBorder: '#991b1b',
  },
  {
    id: 'forest',
    label: 'Forest',
    category: 'saturated',
    headerBackground: '#14532d',
    headerBorder: '#166534',
  },
  {
    id: 'amber',
    label: 'Amber',
    category: 'saturated',
    headerBackground: '#d97706',
    headerBorder: '#b45309',
  },
  // Light
  {
    id: 'ocean',
    label: 'Ocean',
    category: 'light',
    headerBackground: '#dbeafe',
    headerBorder: '#bfdbfe',
  },
  {
    id: 'sage',
    label: 'Sage',
    category: 'light',
    headerBackground: '#dcfce7',
    headerBorder: '#bbf7d0',
  },
  {
    id: 'lilac',
    label: 'Lilac',
    category: 'light',
    headerBackground: '#ede9fe',
    headerBorder: '#ddd6fe',
  },
  {
    id: 'peach',
    label: 'Peach',
    category: 'light',
    headerBackground: '#ffedd5',
    headerBorder: '#fed7aa',
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
