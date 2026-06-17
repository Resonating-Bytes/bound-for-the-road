import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { MIGRATION_STATEMENTS } from './migrations';

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}

export function getSqlite() {
  return getDb().$client;
}

export function initDb() {
  const sqlite = openDatabaseSync('teendriver.db');
  for (const sql of MIGRATION_STATEMENTS) {
    sqlite.execSync(sql);
  }
  dbInstance = drizzle(sqlite);
  return dbInstance;
}
