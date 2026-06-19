jest.mock('../../src/db/client', () => ({
  getDb: () => require('../helpers/testDb').getTestDb(),
}));

import { initTestDb, resetTestDb } from '../helpers/testDb';
import { getSettingValue, setSettingValue, deleteAllUserData, upsertUser } from '../../src/db/queries';
import {
  headerThemeSettingKey,
  readHeaderThemePresetId,
  writeHeaderThemePresetId,
} from '../../src/theme/headerTheme';
import { resolveTheme } from '../../src/theme/resolveTheme';
import { DEFAULT_PRESET_ID, getPresetById } from '../../src/theme/presets';

describe('theme', () => {
  beforeEach(() => {
    resetTestDb();
    initTestDb();
  });

  test('resolveTheme applies preset header colors', () => {
    const ocean = resolveTheme('ocean');
    expect(ocean.headerBackground).toBe('#dbeafe');
    expect(ocean.headerBorder).toBe('#bfdbfe');
    expect(ocean.headerText).toBe('#1a2b3c');
    expect(ocean.statusBarStyle).toBe('dark');
  });

  test('resolveTheme auto-contrasts text on dark presets', () => {
    const slate = resolveTheme('slate');
    expect(slate.headerText).toBe('#f8fafc');
    expect(slate.statusBarStyle).toBe('light');

    const crimson = resolveTheme('crimson');
    expect(crimson.headerText).toBe('#f8fafc');
    expect(crimson.statusBarStyle).toBe('light');
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
    setSettingValue('header_theme_id', 'crimson');
    expect(readHeaderThemePresetId('user-a')).toBe('crimson');
    expect(getSettingValue('header_theme_id')).toBeNull();
    expect(getSettingValue(headerThemeSettingKey('user-a'))).toBe('crimson');
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
});
