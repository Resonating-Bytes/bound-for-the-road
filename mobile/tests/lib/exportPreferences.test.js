import {
  readExportIncludeRoadCategory,
  writeExportIncludeRoadCategory,
  exportIncludeRoadCategoryKey,
} from '../../src/lib/exportPreferences';
import { getSettingValue } from '../../src/db/queries';

jest.mock('../../src/db/client', () => ({
  getDb: () => require('../helpers/testDb').getTestDb(),
}));

import { initTestDb, resetTestDb } from '../helpers/testDb';

describe('exportPreferences', () => {
  beforeEach(() => {
    resetTestDb();
    initTestDb();
  });

  test('defaults to off', () => {
    expect(readExportIncludeRoadCategory('user-a')).toBe(false);
  });

  test('persists per user', () => {
    writeExportIncludeRoadCategory('user-a', true);
    writeExportIncludeRoadCategory('user-b', false);
    expect(readExportIncludeRoadCategory('user-a')).toBe(true);
    expect(readExportIncludeRoadCategory('user-b')).toBe(false);
    expect(getSettingValue(exportIncludeRoadCategoryKey('user-a'))).toBe('1');
  });
});
