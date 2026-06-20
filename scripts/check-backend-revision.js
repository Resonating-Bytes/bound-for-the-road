#!/usr/bin/env node
/**
 * CI: when Supabase backend changes, require docs and validate MIN_BACKEND_REVISION.
 * Usage: node scripts/check-backend-revision.js [--base origin/main] [--head HEAD]
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  ROOT,
  parseBaseHeadArgs,
  listChangedFiles,
  listAddedFiles,
  readFileAtRef,
  compareLex,
} = require('./lib/ci-git');

const COMPAT_JS = path.join(ROOT, 'mobile', 'src', 'config', 'compatibility.js');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');
const COMPATIBILITY_DOC = path.join(ROOT, 'docs', 'COMPATIBILITY.md');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

const BACKEND_PATHS = [/^supabase\/migrations\//, /^supabase\/functions\//];

const MIGRATION_ID_RE = /^supabase\/migrations\/(\d{14})_/;

function needsBackendCheck(files) {
  return files.some((file) => BACKEND_PATHS.some((pattern) => pattern.test(file)));
}

function readMinBackendRevisionFromContent(content) {
  const match = content.match(/export const MIN_BACKEND_REVISION = '(\d{14})'/);
  return match?.[1] ?? null;
}

function readMinBackendRevisionFromRef(ref) {
  const content = readFileAtRef(ref, 'mobile/src/config/compatibility.js');
  return content ? readMinBackendRevisionFromContent(content) : null;
}

function readMinBackendRevisionFromDisk() {
  if (!fs.existsSync(COMPAT_JS)) return null;
  return readMinBackendRevisionFromContent(fs.readFileSync(COMPAT_JS, 'utf8'));
}

function migrationIdsFromFiles(files) {
  const ids = [];
  for (const file of files) {
    const match = file.match(MIGRATION_ID_RE);
    if (match) ids.push(match[1]);
  }
  return ids;
}

function migrationExistsForId(id) {
  if (!fs.existsSync(MIGRATIONS_DIR)) return false;
  return fs.readdirSync(MIGRATIONS_DIR).some((name) => name.startsWith(`${id}_`));
}

function fail(message) {
  console.error(`\nbackend-revision check failed:\n${message}\n`);
  process.exit(1);
}

function pass(message) {
  console.log(`backend-revision check passed: ${message}`);
  process.exit(0);
}

function main() {
  const { base, head } = parseBaseHeadArgs(process.argv);
  const changed = listChangedFiles(base, head);
  const added = listAddedFiles(base, head);

  if (!needsBackendCheck(changed)) {
    pass('no supabase paths changed — backend revision check not required');
  }

  const docsUpdated =
    changed.includes('CHANGELOG.md') ||
    changed.includes('docs/COMPATIBILITY.md') ||
    changed.includes('docs/RPC_CONTRACT.md');

  if (!docsUpdated) {
    fail(
      'Supabase backend changed — update CHANGELOG.md, docs/COMPATIBILITY.md, and/or docs/RPC_CONTRACT.md to document the change.',
    );
  }

  const newMigrationIds = migrationIdsFromFiles(added);
  const baseMin = readMinBackendRevisionFromRef(base) ?? readMinBackendRevisionFromDisk();
  const headMin = readMinBackendRevisionFromDisk();
  const compatChanged = changed.includes('mobile/src/config/compatibility.js');

  if (compatChanged && baseMin && headMin && compareLex(headMin, baseMin) > 0) {
    if (!migrationExistsForId(headMin)) {
      fail(
        `MIN_BACKEND_REVISION was raised to ${headMin} but no supabase/migrations/${headMin}_*.sql exists.\n` +
          'Add the migration in this PR (or an earlier merged PR) before bumping MIN_BACKEND_REVISION.',
      );
    }
    if (!docsUpdated) {
      fail('Raising MIN_BACKEND_REVISION requires a CHANGELOG or COMPATIBILITY.md update.');
    }
  }

  if (newMigrationIds.length) {
    const maxNew = newMigrationIds.sort(compareLex).at(-1);
    if (compatChanged && headMin && compareLex(headMin, maxNew) < 0) {
      fail(
        `This PR adds migration ${maxNew}_* but MIN_BACKEND_REVISION is ${headMin}.\n` +
          'If the app requires this migration, bump MIN_BACKEND_REVISION to at least that id.',
      );
    }
    pass(
      `supabase changes documented; new migration(s): ${newMigrationIds.join(', ')}` +
        (headMin ? `; MIN_BACKEND_REVISION=${headMin}` : ''),
    );
  }

  pass('supabase changes documented');
}

main();
