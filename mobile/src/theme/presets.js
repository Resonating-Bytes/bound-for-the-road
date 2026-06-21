/** Header color presets — device-local preference (see ThemeContext). */



import { deriveHeaderBorderFromBackground } from './colorMath';



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

 * headerBorder: derived via deriveHeaderBorderFromBackground — tune HEADER_BORDER_TUNING in colorMath.js.

 */

const PRESET_DEFINITIONS = [

  // Neutrals (light → dark)

  {

    id: 'espresso',

    label: 'Espresso',

    category: 'neutrals',

    headerBackground: '#D7CCC8',

    accent: '#3E2723',

  },

  {

    id: 'charcoal',

    label: 'Charcoal',

    category: 'neutrals',

    headerBackground: '#4A4A4A',

    accent: '#2563EB',

  },

  {

    id: 'slate',

    label: 'Slate',

    category: 'neutrals',

    headerBackground: '#2C3E50',

    accent: '#18BC9C',

  },

  {

    id: 'midnight',

    label: 'Midnight',

    category: 'neutrals',

    headerBackground: '#1E293B',

    accent: '#38BDF8',

  },

  // Saturated

  {

    id: 'navy',

    label: 'Navy',

    category: 'saturated',

    headerBackground: '#1E3A5F',

    accent: '#4191E1',

  },

  {

    id: 'scarlet',

    label: 'Scarlet',

    category: 'saturated',

    headerBackground: '#B91C1C',

    accent: '#D4AF37',

  },

  {

    id: 'forest',

    label: 'Forest',

    category: 'saturated',

    headerBackground: '#14532D',

    accent: '#22C55E',

  },

  {

    id: 'plum',

    label: 'Royal Plum',

    category: 'saturated',

    headerBackground: '#4A148C',

    accent: '#E040FB',

  },

  // Light (pastel headers → deeper saturated accents)

  {

    id: 'ocean',

    label: 'Ocean',

    category: 'light',

    headerBackground: '#DBEAFE',

    accent: '#2563EB',

  },

  {

    id: 'sage',

    label: 'Sage',

    category: 'light',

    headerBackground: '#DCFCE7',

    accent: '#15803D',

  },

  {

    id: 'lilac',

    label: 'Lilac',

    category: 'light',

    headerBackground: '#EDE9FE',

    accent: '#7C3AED',

  },

  {

    id: 'peach',

    label: 'Blush Peach',

    category: 'light',

    headerBackground: '#FFEDD5',

    accent: '#E65100',

  },

  // Vibrant (bold headers → deeper accents for buttons/links on light screens)

  {

    id: 'brightOrange',

    label: 'Bright orange',

    category: 'vibrant',

    headerBackground: '#FF5F05',

    accent: '#C2410C',

  },

  {

    id: 'hotPink',

    label: 'Hot pink',

    category: 'vibrant',

    headerBackground: '#F22BEE',

    accent: '#BE185D',

  },

  {

    id: 'lime',

    label: 'Cyber Lime',

    category: 'vibrant',

    headerBackground: '#CCFF00',

    accent: '#1E293B',

  },

  {

    id: 'violet',

    label: 'Ultraviolet',

    category: 'vibrant',

    headerBackground: '#7C3AED',

    accent: '#CCFF00',

  },

];



export const HEADER_THEME_PRESETS = PRESET_DEFINITIONS.map((preset) => ({

  ...preset,

  headerBorder: deriveHeaderBorderFromBackground(preset.headerBackground),

}));



export function getPresetById(id) {

  return HEADER_THEME_PRESETS.find((preset) => preset.id === id) ?? null;

}



export function getPresetsByCategory() {

  return PRESET_CATEGORIES.map((category) => ({

    ...category,

    presets: HEADER_THEME_PRESETS.filter((preset) => preset.category === category.key),

  }));

}


