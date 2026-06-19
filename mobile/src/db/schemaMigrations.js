import { MIGRATION_STATEMENTS } from './migrations';

export const LOCAL_DB_VERSION = 2;

function execSql(sqlite, sql) {
  if (typeof sqlite.execSync === 'function') {
    sqlite.execSync(sql);
  } else {
    sqlite.exec(sql);
  }
}

function queryAll(sqlite, sql) {
  if (typeof sqlite.getAllSync === 'function') {
    return sqlite.getAllSync(sql);
  }
  return sqlite.prepare(sql).all();
}

function queryGet(sqlite, sql) {
  if (typeof sqlite.getFirstSync === 'function') {
    return sqlite.getFirstSync(sql);
  }
  return sqlite.prepare(sql).get();
}

function getMeta(sqlite, key) {
  const row = queryGet(sqlite, `SELECT value FROM schema_meta WHERE key = '${key}'`);
  return row?.value ?? null;
}

function setMeta(sqlite, key, value) {
  const existing = getMeta(sqlite, key);
  if (existing === null) {
    execSql(sqlite, `INSERT INTO schema_meta (key, value) VALUES ('${key}', '${value}')`);
  } else {
    execSql(sqlite, `UPDATE schema_meta SET value = '${value}' WHERE key = '${key}'`);
  }
}

function ensureOutboxUserIdColumn(sqlite) {
  const outboxColumns = queryAll(sqlite, 'PRAGMA table_info(outbox)');
  if (!outboxColumns.some((col) => col.name === 'user_id')) {
    execSql(sqlite, 'ALTER TABLE outbox ADD COLUMN user_id TEXT');
  }
}

const MIGRATIONS = [
  {
    version: 1,
    up(sqlite) {
      for (const sql of MIGRATION_STATEMENTS) {
        execSql(sqlite, sql);
      }
    },
  },
  {
    version: 2,
    up(sqlite) {
      ensureOutboxUserIdColumn(sqlite);
    },
  },
];

export function getLocalDbVersion(sqlite) {
  const raw = getMeta(sqlite, 'local_db_version');
  const parsed = Number.parseInt(raw ?? '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Run incremental SQLite migrations up to LOCAL_DB_VERSION. */
export function runSchemaMigrations(sqlite) {
  execSql(
    sqlite,
    `CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    )`,
  );

  let version = getLocalDbVersion(sqlite);
  for (const migration of MIGRATIONS) {
    if (migration.version <= version) continue;
    migration.up(sqlite);
    setMeta(sqlite, 'local_db_version', String(migration.version));
    version = migration.version;
  }

  return version;
}
