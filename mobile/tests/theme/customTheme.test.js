import {
  CUSTOM_PRESET_ID,
  DEFAULT_CUSTOM_THEME_COLORS,
  isValidCustomThemeColors,
  parseCustomThemeColors,
  resolveCustomTheme,
  sanitizeHexInput,
  serializeCustomThemeColors,
} from '../../src/theme/customTheme';
import { resolveTheme } from '../../src/theme/resolveTheme';

describe('customTheme', () => {
  test('sanitizeHexInput strips invalid chars and caps length', () => {
    expect(sanitizeHexInput('ab#cd!12xy')).toBe('ABCD12');
    expect(sanitizeHexInput('abcdef1')).toBe('ABCDEF');
    expect(sanitizeHexInput('gg')).toBe('');
  });

  test('parseCustomThemeColors falls back to light defaults', () => {
    expect(parseCustomThemeColors(null)).toEqual(DEFAULT_CUSTOM_THEME_COLORS);
    expect(parseCustomThemeColors('not-json')).toEqual(DEFAULT_CUSTOM_THEME_COLORS);
  });

  test('serialize and parse round-trip custom colors', () => {
    const raw = serializeCustomThemeColors({ primary: 'dbeafe', accent: '2563eb' });
    expect(parseCustomThemeColors(raw)).toEqual({
      primary: 'DBEAFE',
      accent: '2563EB',
    });
  });

  test('resolveCustomTheme builds header and accent tokens', () => {
    const theme = resolveCustomTheme(DEFAULT_CUSTOM_THEME_COLORS);
    expect(theme.headerBackground).toBe('#DBEAFE');
    expect(theme.accent).toBe('#2563EB');
    expect(theme.headerText).toBe('#1a2b3c');
    expect(theme.statusBarStyle).toBe('dark');
  });

  test('resolveTheme uses custom colors when preset is custom', () => {
    const theme = resolveTheme(CUSTOM_PRESET_ID, DEFAULT_CUSTOM_THEME_COLORS);
    expect(theme.headerBackground).toBe('#DBEAFE');
    expect(theme.accent).toBe('#2563EB');
  });

  test('resolveTheme falls back when custom colors are incomplete', () => {
    const theme = resolveTheme(CUSTOM_PRESET_ID, { primary: 'ABC', accent: '2563EB' });
    expect(theme.headerBackground).toBe('#4A4A4A');
  });

  test('isValidCustomThemeColors requires six hex digits', () => {
    expect(isValidCustomThemeColors(DEFAULT_CUSTOM_THEME_COLORS)).toBe(true);
    expect(isValidCustomThemeColors({ primary: 'ABC', accent: '2563EB' })).toBe(false);
  });
});
