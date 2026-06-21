import { MIGRATION_STATEMENTS } from './migrations';
import { firstTokenFromLegalName } from '../utils/names';

export const LOCAL_DB_VERSION = 7;

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
  {
    version: 3,
    up(sqlite) {
      const userColumns = queryAll(sqlite, 'PRAGMA table_info(users)');
      if (!userColumns.some((col) => col.name === 'display_name')) {
        execSql(sqlite, "ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT ''");
      }
      execSql(
        sqlite,
        `CREATE TABLE IF NOT EXISTS user_aliases (
          owner_user_id TEXT NOT NULL,
          target_user_id TEXT NOT NULL,
          nickname TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'synced',
          PRIMARY KEY (owner_user_id, target_user_id)
        )`,
      );
      const rows = queryAll(sqlite, 'SELECT id, legal_name, display_name FROM users');
      for (const row of rows) {
        if (row.display_name?.trim()) continue;
        const displayName = firstTokenFromLegalName(row.legal_name ?? '');
        const escaped = displayName.replace(/'/g, "''");
        execSql(sqlite, `UPDATE users SET display_name = '${escaped}' WHERE id = '${row.id}'`);
      }
    },
  },
  {
    version: 4,
    up(sqlite) {
      execSql(
        sqlite,
        `CREATE TABLE IF NOT EXISTS session_location_samples (
          id TEXT PRIMARY KEY NOT NULL,
          session_id TEXT NOT NULL,
          recorded_at TEXT NOT NULL,
          latitude TEXT NOT NULL,
          longitude TEXT NOT NULL,
          speed_mps TEXT,
          accuracy_m TEXT,
          road_type TEXT
        )`,
      );
      execSql(
        sqlite,
        `CREATE INDEX IF NOT EXISTS idx_session_location_samples_session
          ON session_location_samples (session_id, recorded_at)`,
      );
    },
  },
  {
    version: 5,
    up(sqlite) {
      const sessionColumns = queryAll(sqlite, 'PRAGMA table_info(sessions)');
      if (!sessionColumns.some((col) => col.name === 'night_minutes')) {
        execSql(sqlite, 'ALTER TABLE sessions ADD COLUMN night_minutes INTEGER');
      }
      execSql(
        sqlite,
        `UPDATE sessions
         SET night_minutes = duration_minutes
         WHERE day_night = 'night' AND night_minutes IS NULL`,
      );
      execSql(
        sqlite,
        `UPDATE sessions
         SET night_minutes = 0
         WHERE (day_night = 'day' OR day_night IS NULL) AND night_minutes IS NULL`,
      );
      execSql(
        sqlite,
        `UPDATE sessions
         SET night_minutes = 0
         WHERE night_minutes IS NULL AND duration_minutes IS NOT NULL`,
      );
    },
  },
  {
    version: 6,
    up(sqlite) {
      const sessionColumns = queryAll(sqlite, 'PRAGMA table_info(sessions)');
      if (!sessionColumns.some((col) => col.name === 'local_road_minutes')) {
        execSql(sqlite, 'ALTER TABLE sessions ADD COLUMN local_road_minutes INTEGER');
      }
      if (!sessionColumns.some((col) => col.name === 'highway_road_minutes')) {
        execSql(sqlite, 'ALTER TABLE sessions ADD COLUMN highway_road_minutes INTEGER');
      }
    },
  },
  {
    version: 7,
    up(sqlite) {
      const sessionColumns = queryAll(sqlite, 'PRAGMA table_info(sessions)');
      if (sessionColumns.some((col) => col.name === 'local_road_minutes')) {
        execSql(sqlite, 'ALTER TABLE sessions DROP COLUMN local_road_minutes');
      }
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
