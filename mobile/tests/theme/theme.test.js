jest.mock('../../src/db/client', () => ({
  getDb: () => require('../helpers/testDb').getTestDb(),
}));

import { initTestDb, resetTestDb } from '../helpers/testDb';
import { getSettingValue, setSettingValue } from '../../src/db/queries';
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

  test('setSettingValue persists header theme choice', () => {
    setSettingValue('header_theme_id', 'lilac');
    expect(getSettingValue('header_theme_id')).toBe('lilac');
  });
});
