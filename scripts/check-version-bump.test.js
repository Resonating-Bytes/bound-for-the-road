const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function run(script, args = []) {
  return execFileSync('node', [path.join('scripts', script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

test('app-version check passes when base equals head', () => {
  const output = run('check-app-version.js', ['--base', 'HEAD', '--head', 'HEAD']);
  assert.match(output, /app-version check passed/);
});

test('backend-revision check passes when base equals head', () => {
  const output = run('check-backend-revision.js', ['--base', 'HEAD', '--head', 'HEAD']);
  assert.match(output, /backend-revision check passed/);
});

test('check-version-bump runs both checks', () => {
  const output = run('check-version-bump.js', ['--base', 'HEAD', '--head', 'HEAD']);
  assert.match(output, /All version checks passed/);
});
