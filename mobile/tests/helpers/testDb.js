import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { applyMigrations } from '../../src/db/migrations';

let dbInstance = null;
let sqliteInstance = null;

export function initTestDb() {
  if (sqliteInstance) {
    sqliteInstance.close();
  }
  sqliteInstance = new Database(':memory:');
  applyMigrations(sqliteInstance);
  dbInstance = drizzle(sqliteInstance);
  return dbInstance;
}

export function getTestDb() {
  if (!dbInstance) {
    throw new Error('Test database not initialized. Call initTestDb() first.');
  }
  return dbInstance;
}

export function resetTestDb() {
  if (sqliteInstance) {
    sqliteInstance.close();
  }
  sqliteInstance = null;
  dbInstance = null;
}
