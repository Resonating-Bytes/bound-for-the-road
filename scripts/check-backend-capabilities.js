#!/usr/bin/env node
/**
 * CI: keep required backend capabilities in sync across JSON contract and SQL migrations.
 * Usage: node scripts/check-backend-capabilities.js
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CAPABILITIES_JSON = path.join(
  ROOT,
  'mobile',
  'src',
  'config',
  'requiredBackendCapabilities.json',
);
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

function fail(message) {
  console.error(`\nbackend-capabilities check failed:\n${message}\n`);
  process.exit(1);
}

function pass(message) {
  console.log(`backend-capabilities check passed: ${message}`);
  process.exit(0);
}

function readRequiredCapabilitiesFromJson() {
  const payload = JSON.parse(fs.readFileSync(CAPABILITIES_JSON, 'utf8'));
  const values = Object.values(payload.capabilities ?? {}).sort();
  if (!values.length) {
    fail('requiredBackendCapabilities.json has no capabilities.');
  }
  return values;
}

function readCapabilitiesFromLatestMigration() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fail('supabase/migrations directory not found.');
  }

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  let latestCaps = null;

  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    if (!content.includes('get_app_compatibility')) continue;

    const arrayMatch = content.match(/'capabilities',\s*json_build_array\(([\s\S]*?)\)/);
    if (!arrayMatch) continue;

    const caps = [...arrayMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
    if (caps.length) latestCaps = caps;
  }

  if (!latestCaps) {
    fail('No get_app_compatibility capabilities array found in migrations.');
  }

  return latestCaps;
}

function main() {
  const jsonCaps = readRequiredCapabilitiesFromJson();
  const sqlCaps = readCapabilitiesFromLatestMigration();

  if (jsonCaps.length !== sqlCaps.length || jsonCaps.some((cap, index) => cap !== sqlCaps[index])) {
    fail(
      'Capability mismatch between requiredBackendCapabilities.json and latest get_app_compatibility migration.\n' +
        `JSON: ${jsonCaps.join(', ')}\n` +
        `SQL:  ${sqlCaps.join(', ')}\n` +
        'Update both together (see docs/RPC_CONTRACT.md).',
    );
  }

  pass(`${jsonCaps.length} capabilities aligned across JSON and SQL`);
}

main();
