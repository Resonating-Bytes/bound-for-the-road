export const MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    role TEXT NOT NULL DEFAULT 'teen',
    legal_name TEXT NOT NULL,
    email TEXT,
    date_of_birth TEXT,
    state_code TEXT NOT NULL DEFAULT 'IL',
    permit_issue_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY NOT NULL,
    teen_user_id TEXT NOT NULL,
    adult_user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    teen_user_id TEXT NOT NULL,
    state_code TEXT NOT NULL DEFAULT 'IL',
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_minutes INTEGER,
    day_night TEXT,
    notes TEXT,
    request_hash TEXT,
    payload_json TEXT,
    active_supervisor_id TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_teen_status ON sessions (teen_user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_teen_started ON sessions (teen_user_id, started_at DESC)`,
  `CREATE TABLE IF NOT EXISTS submissions (
    request_hash TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    submitted_by_user_id TEXT NOT NULL,
    superseded INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY NOT NULL,
    request_hash TEXT NOT NULL,
    session_id TEXT NOT NULL,
    approved_by_user_id TEXT NOT NULL,
    approved_at TEXT NOT NULL,
    joined_session INTEGER,
    supervisor_in_vehicle_name TEXT,
    approver_present TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY NOT NULL,
    operation TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    user_id TEXT,
    created_at TEXT NOT NULL,
    synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`,
];

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

/** Run DDL and lightweight column upgrades (full versioned migrations → versioning batch). */
export function applyMigrations(sqlite) {
  for (const sql of MIGRATION_STATEMENTS) {
    execSql(sqlite, sql);
  }
  const outboxColumns = queryAll(sqlite, 'PRAGMA table_info(outbox)');
  if (!outboxColumns.some((col) => col.name === 'user_id')) {
    execSql(sqlite, 'ALTER TABLE outbox ADD COLUMN user_id TEXT');
  }
}
