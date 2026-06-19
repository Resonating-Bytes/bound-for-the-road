import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { runSchemaMigrations } from './schemaMigrations';

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
  const sqlite = openDatabaseSync('boundfortheroad.db');
  runSchemaMigrations(sqlite);
  dbInstance = drizzle(sqlite);
  return dbInstance;
}
