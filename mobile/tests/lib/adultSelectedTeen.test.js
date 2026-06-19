jest.mock('../../src/db/client', () => ({
  getDb: () => require('../helpers/testDb').getTestDb(),
}));

import { initTestDb, resetTestDb } from '../helpers/testDb';
import { getSettingValue } from '../../src/db/queries';
import {
  adultSelectedTeenSettingKey,
  readSavedSelectedTeenId,
  resolveSelectedTeenId,
  writeSelectedTeenId,
} from '../../src/lib/adultSelectedTeen';
import { filterSubmissionsForTeen } from '../../src/utils/dashboardSessions';

describe('adultSelectedTeen', () => {
  beforeEach(() => {
    resetTestDb();
    initTestDb();
  });

  test('resolveSelectedTeenId prefers saved teen when still linked', () => {
    const ids = ['teen-a', 'teen-b'];
    expect(resolveSelectedTeenId(ids, 'teen-b')).toBe('teen-b');
  });

  test('resolveSelectedTeenId falls back to first linked teen', () => {
    expect(resolveSelectedTeenId(['teen-a', 'teen-b'], 'removed-teen')).toBe('teen-a');
    expect(resolveSelectedTeenId(['teen-a'], null)).toBe('teen-a');
    expect(resolveSelectedTeenId([], 'teen-a')).toBeNull();
  });

  test('write and read selected teen per adult', () => {
    writeSelectedTeenId('adult-1', 'teen-b');
    expect(readSavedSelectedTeenId('adult-1')).toBe('teen-b');
    expect(getSettingValue(adultSelectedTeenSettingKey('adult-1'))).toBe('teen-b');
  });
});

describe('filterSubmissionsForTeen', () => {
  const rows = [
    { requestHash: 'a', session: { teenUserId: 'teen-a' } },
    { requestHash: 'b', session: { teenUserId: 'teen-b' } },
  ];

  test('filters rows to one teen', () => {
    expect(filterSubmissionsForTeen(rows, 'teen-b').map((row) => row.requestHash)).toEqual(['b']);
  });

  test('returns all rows when teenUserId omitted', () => {
    expect(filterSubmissionsForTeen(rows, null)).toHaveLength(2);
  });
});
