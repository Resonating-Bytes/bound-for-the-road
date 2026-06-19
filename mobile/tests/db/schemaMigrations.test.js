import { LOCAL_DB_VERSION, getLocalDbVersion } from '../../src/db/schemaMigrations';
import { initTestDb, resetTestDb, getTestDb } from '../helpers/testDb';

describe('schemaMigrations', () => {
  beforeEach(() => {
    resetTestDb();
    initTestDb();
  });

  test('runSchemaMigrations records LOCAL_DB_VERSION', () => {
    const sqlite = getTestDb().$client;
    expect(getLocalDbVersion(sqlite)).toBe(LOCAL_DB_VERSION);
  });
});
