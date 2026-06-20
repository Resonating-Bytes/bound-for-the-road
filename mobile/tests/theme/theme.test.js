jest.mock('../../src/db/client', () => ({
  getDb: () => require('../helpers/testDb').getTestDb(),
}));

import { initTestDb, resetTestDb } from '../helpers/testDb';
import { getSettingValue, setSettingValue, deleteAllUserData, upsertUser } from '../../src/db/queries';
import {
  headerThemeSettingKey,
  headerThemeCustomSettingKey,
  readCustomThemeColors,
  readHeaderThemePresetId,
  writeCustomThemeColors,
  writeHeaderThemePresetId,
} from '../../src/theme/headerTheme';
import { CUSTOM_PRESET_ID } from '../../src/theme/customTheme';
import { resolveTheme } from '../../src/theme/resolveTheme';
import { DEFAULT_PRESET_ID, getPresetById, getPresetsByCategory } from '../../src/theme/presets';
import {
  getScreenHeaderTitleStyle,
  getTitleEffectColor,
  HEADER_TITLE_HALO,
  SCREEN_HEADER_TITLE_FONT_SIZE,
} from '../../src/theme/headerTitleEffects';

describe('theme', () => {
  beforeEach(() => {
    resetTestDb();
    initTestDb();
  });

  test('resolveTheme applies preset header colors', () => {
    const oceanPreset = getPresetById('ocean');
    const ocean = resolveTheme('ocean');
    expect(ocean.headerBackground).toBe(oceanPreset.headerBackground);
    expect(ocean.headerBorder).toBe(oceanPreset.headerBorder);
    expect(ocean.headerText).toBe('#1a2b3c');
    expect(ocean.statusBarStyle).toBe('dark');
    expect(ocean.accent).toBe(oceanPreset.accent);
    expect(ocean.accentText).toBe('#f8fafc');
    expect(ocean.headerTitleHalo).toEqual({
      textShadowColor: 'rgba(255, 255, 255, 1)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: HEADER_TITLE_HALO.radius,
    });
  });

  test('getTitleEffectColor flips for light vs dark header text', () => {
    expect(getTitleEffectColor('#1e293b')).toContain('15, 23, 42');
    expect(getTitleEffectColor('#dbeafe')).toContain('255, 255, 255');
  });

  test('curated accent per preset', () => {
    expect(resolveTheme('lilac').accent).toBe(getPresetById('lilac').accent);
    expect(resolveTheme('sand').accent).toBe(getPresetById('sand').accent);
    expect(resolveTheme('midnight').accent).toBe(getPresetById('midnight').accent);
    expect(resolveTheme('royalBlue').accent).toBe(getPresetById('royalBlue').accent);
  });

  test('vibrant category has four presets with halo', () => {
    const vibrant = getPresetsByCategory().find((c) => c.key === 'vibrant');
    expect(vibrant?.presets).toHaveLength(4);
    for (const preset of vibrant.presets) {
      const theme = resolveTheme(preset.id);
      expect(theme.accent).toBeTruthy();
      expect(theme.headerTitleHalo.textShadowRadius).toBe(HEADER_TITLE_HALO.radius);
    }
  });

  test('getScreenHeaderTitleStyle applies production typography and halo', () => {
    const [typography, halo] = getScreenHeaderTitleStyle('#a0a0a0', '#f8fafc');
    expect(typography).toEqual({
      fontSize: SCREEN_HEADER_TITLE_FONT_SIZE,
      fontWeight: '700',
      color: '#f8fafc',
    });
    expect(halo.textShadowRadius).toBe(HEADER_TITLE_HALO.radius);
    expect(halo.textShadowColor).toBe('rgba(15, 23, 42, 1)');
  });

  test('resolveTheme headerTitleHalo matches getScreenHeaderTitleStyle', () => {
    const slate = resolveTheme('slate');
    const [, halo] = getScreenHeaderTitleStyle(slate.headerBackground, slate.headerText);
    expect(slate.headerTitleHalo).toEqual(halo);
  });

  test('resolveTheme auto-contrasts text on dark presets', () => {
    const slate = resolveTheme('slate');
    expect(slate.headerText).toBe('#f8fafc');
    expect(slate.statusBarStyle).toBe('light');

    const scarlet = resolveTheme('scarlet');
    expect(scarlet.headerText).toBe('#f8fafc');
    expect(scarlet.statusBarStyle).toBe('light');
  });

  test('default preset is charcoal with original blue accent', () => {
    const charcoalPreset = getPresetById('charcoal');
    const theme = resolveTheme(DEFAULT_PRESET_ID);
    expect(DEFAULT_PRESET_ID).toBe('charcoal');
    expect(theme.headerBackground).toBe(charcoalPreset.headerBackground);
    expect(theme.accent).toBe(charcoalPreset.accent);
    expect(theme.accentText).toBe('#f8fafc');
  });

  test('resolveTheme falls back to default for unknown id', () => {
    const theme = resolveTheme('not-a-preset');
    expect(theme.headerBackground).toBe(getPresetById(DEFAULT_PRESET_ID).headerBackground);
  });

  test('header theme is stored per user', () => {
    writeHeaderThemePresetId('user-a', 'lilac');
    writeHeaderThemePresetId('user-b', 'ocean');
    expect(readHeaderThemePresetId('user-a')).toBe('lilac');
    expect(readHeaderThemePresetId('user-b')).toBe('ocean');
    expect(getSettingValue(headerThemeSettingKey('user-a'))).toBe('lilac');
  });

  test('migrates legacy device-global header theme key to active user', () => {
    setSettingValue('header_theme_id', 'scarlet');
    expect(readHeaderThemePresetId('user-a')).toBe('scarlet');
    expect(getSettingValue('header_theme_id')).toBeNull();
    expect(getSettingValue(headerThemeSettingKey('user-a'))).toBe('scarlet');
  });

  test('deleteAllUserData clears only that user header theme', () => {
    upsertUser({ id: 'user-a', legalName: 'A', role: 'teen' });
    upsertUser({ id: 'user-b', legalName: 'B', role: 'adult' });
    writeHeaderThemePresetId('user-a', 'lilac');
    writeHeaderThemePresetId('user-b', 'ocean');
    deleteAllUserData('user-a');
    expect(getSettingValue(headerThemeSettingKey('user-a'))).toBeNull();
    expect(getSettingValue(headerThemeSettingKey('user-b'))).toBe('ocean');
  });

  test('custom theme preset and colors persist per user', () => {
    writeCustomThemeColors('user-a', { primary: 'FFEDD5', accent: 'EA580C' });
    writeHeaderThemePresetId('user-a', CUSTOM_PRESET_ID);
    expect(readHeaderThemePresetId('user-a')).toBe(CUSTOM_PRESET_ID);
    expect(readCustomThemeColors('user-a')).toEqual({
      primary: 'FFEDD5',
      accent: 'EA580C',
    });
    expect(getSettingValue(headerThemeCustomSettingKey('user-a'))).toContain('FFEDD5');
    writeHeaderThemePresetId('user-a', 'ocean');
    expect(readCustomThemeColors('user-a')).toEqual({
      primary: 'FFEDD5',
      accent: 'EA580C',
    });
  });
});
