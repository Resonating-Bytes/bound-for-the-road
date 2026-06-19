#!/usr/bin/env node
/**
 * Run both app and backend version checks (local convenience).
 * Usage: node scripts/check-version-bump.js [--base origin/main] [--head HEAD]
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function run(script) {
  const result = spawnSync('node', [path.join(__dirname, script), ...args], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('check-app-version.js');
run('check-backend-revision.js');
console.log('All version checks passed.');
