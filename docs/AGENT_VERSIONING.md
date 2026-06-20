# Versioning guide for agents

Canonical instructions for agents opening or finishing PRs in this repo. Human-oriented summaries live in [RELEASE.md](./RELEASE.md) and [COMPATIBILITY.md](./COMPATIBILITY.md); this doc adds **decision rules**, **CI behavior**, and **checklists** so PRs merge without rework.

---

## Version layers (four independent numbers)

| Layer | Source of truth | Bumped when | Document in |
|-------|-----------------|-------------|-------------|
| **App semver** | `mobile/app.json` → `expo.version` | User-facing mobile change ships in a release | `CHANGELOG.md` |
| **npm mirror** | `mobile/package.json` → `version` | Same release — **must equal** `expo.version` | (CI only) |
| **Local SQLite** | `mobile/src/db/schemaMigrations.js` → `LOCAL_DB_VERSION` | SQLite tables/columns change on device | `CHANGELOG.md` + [COMPATIBILITY.md](./COMPATIBILITY.md) `local_db_version` row |
| **Payload hash** | `mobile/src/config/compatibility.js` → `CURRENT_PAYLOAD_SCHEMA_VERSION` | Canonical session JSON fields used in `requestHash` change | [APPROVAL_AND_HASH.md](./APPROVAL_AND_HASH.md), [COMPATIBILITY.md](./COMPATIBILITY.md) |
| **Backend revision** | `supabase/migrations/<YYYYMMDDHHMMSS>_*.sql` filename prefix | Supabase schema/RPC/trigger changes | Migration SQL sets `app_config.backend_revision`; [COMPATIBILITY.md](./COMPATIBILITY.md) |

Runtime app version is **never** hardcoded in source: `APP_VERSION` in `compatibility.js` is imported from `app.json`.

Backend revision ids are **14-digit timestamps** compared lexicographically (migration filenames).

---

## Decision tree: what must this PR bump?

```
Changed files?
│
├─ mobile/src/** or mobile/app.json (not mobile/tests/** alone)
│   └─ YES → bump expo.version + package.json version (semver > main)
│            → CHANGELOG.md section ## [x.y.z] - YYYY-MM-DD
│            → update tests if they assert MIN_BACKEND_REVISION or versions
│
├─ mobile/src/db/schemaMigrations.js or schema shape
│   └─ YES → increment LOCAL_DB_VERSION + migration step
│            → mention in CHANGELOG + COMPATIBILITY local_db_version table
│
├─ hash-relevant session fields (see hash.js / APPROVAL_AND_HASH.md)
│   └─ YES → bump CURRENT_PAYLOAD_SCHEMA_VERSION + SUPPORTED_* if needed
│            → document in COMPATIBILITY + APPROVAL_AND_HASH
│
├─ supabase/migrations/** and/or supabase/functions/**
│   └─ YES → CHANGELOG.md and/or docs/COMPATIBILITY.md MUST change
│            → new migration file if schema/RPC changed
│            → if THIS APP BUILD requires the migration:
│                 bump MIN_BACKEND_REVISION in compatibility.js
│                 to match (or exceed) the new migration id
│
└─ Backend-only PR (migration/edge, no mobile/src changes)
    └─ App semver bump NOT required by CI
       Still document in CHANGELOG and/or COMPATIBILITY
```

**Combined feature PRs** (typical): mobile + migration + `MIN_BACKEND_REVISION` + app semver + CHANGELOG + COMPATIBILITY — all in one PR.

---

## App version PR checklist

When `mobile/src/**` or `mobile/app.json` changes (tests-only paths are exempt):

1. Read current version on base branch (`origin/main`): `mobile/app.json` → `expo.version`.
2. Bump **patch / minor / major** in `mobile/app.json`.
3. Set **identical** semver in `mobile/package.json`.
4. Add or extend `CHANGELOG.md`:
   - Keep `[Unreleased]` placeholders for the next cycle.
   - Add `## [x.y.z] - YYYY-MM-DD` with Added / Changed / Fixed bullets.
   - Include substring `## [x.y.z]` exactly — CI greps for it.
5. If backend also changed, complete the backend checklist below.
6. Run locally before push:

```bash
cd mobile && npm test
node scripts/check-version-bump.js --base origin/main --head HEAD
```

---

## Backend PR checklist

When `supabase/migrations/**` or `supabase/functions/**` changes:

1. Add migration SQL under `supabase/migrations/YYYYMMDDHHMMSS_description.sql` if schema/RPC/triggers changed.
2. End migration with `UPDATE app_config SET value = '<id>' WHERE key = 'backend_revision'` when appropriate.
3. Update **at least one** of:
   - `CHANGELOG.md`
   - `docs/COMPATIBILITY.md` (backend_revision example, migration list, `MIN_BACKEND_REVISION` narrative)
4. If the mobile app **requires** the new migration to function:
   - Bump `MIN_BACKEND_REVISION` in `mobile/src/config/compatibility.js` to the migration id.
   - CI requires a file `supabase/migrations/<MIN_BACKEND_REVISION>_*.sql` to exist.
   - CI requires `MIN_BACKEND_REVISION >=` any **new** migration id added in the same PR when `compatibility.js` changed.
5. Update `mobile/tests/lib/compatibility.test.js` mock `backend_revision` if tests assert against `MIN_BACKEND_REVISION`.
6. **Apply migration manually** in Supabase SQL Editor after merge — CI does not run migrations.

Edge-function-only changes still trigger the backend doc check; semver bump is not required unless mobile also changed.

---

## GitHub Actions on pull requests

Workflow files live under `.github/workflows/`.

### Required for merge (configure on `main` branch ruleset)

| Status check name | Workflow | Runs when | Script / command |
|-------------------|----------|-----------|------------------|
| **App version** | `version-checks.yml` | PR touches `mobile/src/**`, `mobile/app.json`, or `mobile/package.json` | `scripts/check-app-version.js` |
| **Backend revision** | `version-checks.yml` | PR touches `supabase/migrations/**` or `supabase/functions/**` | `scripts/check-backend-revision.js` |
| **Mobile tests** | `mobile-tests.yml` | Every PR to `main`; skips quickly when no `mobile/**` changes | `cd mobile && npm ci && npm test` |

Each version job **passes immediately** if its paths did not change. `Mobile tests` always reports a status on PRs to `main`, but short-circuits with a skip message when no mobile files changed. A mobile-only PR enforces app version + tests; a Supabase-only PR enforces backend docs.

### Not a PR gate (runs after merge to `main`)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `deploy-edge-functions.yml` | Push to `main` changing `supabase/functions/**` | Deploys `send-approval-push` via Supabase CLI |

Requires GitHub repository secrets (Settings → Secrets and variables → Actions):

- `SUPABASE_ACCESS_TOKEN` — personal access token from Supabase dashboard (Account → Access Tokens)
- `SUPABASE_PROJECT_REF` — Project ID from Project Settings → General (subdomain in `https://<ref>.supabase.co`)

**Common deploy failures**

| Symptom / log | Cause | Fix |
|---------------|-------|-----|
| Secret empty / unauthorized | Secrets added **after** the merge run, or wrong secret **type** | Re-run workflow; token must be a **personal access token** (`sbp_…`), not anon/service_role keys from API settings |
| Project not found | Wrong `SUPABASE_PROJECT_REF` | Use the 20-char **Project ID** from the dashboard URL (`/project/<id>`), not org id or database password |
| Bundling / entrypoint error | Function path or import issue | Expand **Deploy send-approval-push** step log (`--debug`); confirm `supabase/functions/send-approval-push/index.ts` exists on `main` |

Re-run: Actions → **Deploy Supabase Edge Functions** → **Re-run all jobs**, or use **Run workflow** (manual dispatch after the workflow update lands).

Only runs when `github.repository == 'Resonating-Bytes/bound-for-the-road'`.

**Migrations are never auto-applied.** Edge deploy updates function code only.

---

## What CI validates (exact rules)

### `scripts/check-app-version.js`

Fails if mobile app paths changed and any of:

- `expo.version` on HEAD is not **strictly greater** than base branch semver
- `mobile/package.json` `version` ≠ `mobile/app.json` `expo.version`
- `CHANGELOG.md` does not contain `## [<headVersion>]`
- `CHANGELOG.md` is not in the PR diff

Exempt: changes confined to `mobile/tests/**` do not require an app bump.

### `scripts/check-backend-revision.js`

Fails if Supabase paths changed and any of:

- Neither `CHANGELOG.md` nor `docs/COMPATIBILITY.md` is in the PR diff
- `MIN_BACKEND_REVISION` was raised but no `supabase/migrations/<id>_*.sql` exists for that id
- New migration added + `compatibility.js` changed but `MIN_BACKEND_REVISION` < new migration id

### Local convenience

```bash
node scripts/check-version-bump.js --base origin/main --head HEAD
```

Runs both scripts. Uses `git diff base...head` — **only committed changes** count; stage and commit before expecting CI parity.

---

## After merge (human or agent reminders)

1. **Supabase SQL Editor** — run any new migrations in order; confirm `app_config.backend_revision` matches.
2. **Edge functions** — confirm Actions workflow **Deploy Supabase Edge Functions** succeeded (or deploy manually).
3. **EAS / store** — build from `main` when ready; `expo.version` in merged `app.json` is the release number.
4. **Optional** — bump `latest_app_version` in `app_config` for soft update nudges (see COMPATIBILITY.md).

---

## Common CI failures and fixes

| Failure message | Fix |
|-----------------|-----|
| app version was not bumped | Increase `mobile/app.json` + `package.json` semver above `main` |
| package.json version must match | Copy `expo.version` to `package.json` `version` |
| CHANGELOG must include `## [x.y.z]` | Add release section with exact heading |
| CHANGELOG must be updated | Include `CHANGELOG.md` in the commit |
| Supabase backend changed — update CHANGELOG and/or COMPATIBILITY | Edit at least one of those files |
| MIN_BACKEND_REVISION raised but no migration | Add `supabase/migrations/<id>_*.sql` or revert the bump |
| migration added but MIN_BACKEND_REVISION too low | Set `MIN_BACKEND_REVISION` to the new migration id |
| compatibility.test.js fails | Update mock `backend_revision` in test to match `MIN_BACKEND_REVISION` |

---

## Files to touch by change type (quick reference)

| Change | Files |
|--------|-------|
| Feature / fix in app UI or logic | `mobile/src/**`, `mobile/app.json`, `mobile/package.json`, `CHANGELOG.md` |
| SQLite schema | `schema.js`, `schemaMigrations.js`, `LOCAL_DB_VERSION`, `CHANGELOG.md`, `COMPATIBILITY.md` |
| New Supabase table/RPC | `supabase/migrations/<new>.sql`, `COMPATIBILITY.md`, `CHANGELOG.md`; optionally `MIN_BACKEND_REVISION` + mobile code |
| Edge function behavior | `supabase/functions/**`, `CHANGELOG.md` and/or `COMPATIBILITY.md`; secrets for auto-deploy |
| Compatibility gate for new RPC | `REQUIRED_BACKEND_CAPABILITIES` in `compatibility.js`, server capability list, docs |

---

## Related docs

- [RELEASE.md](./RELEASE.md) — semver policy, branch protection setup
- [COMPATIBILITY.md](./COMPATIBILITY.md) — runtime mismatch UX, payload schema, `get_app_compatibility()`
- [APPROVAL_AND_HASH.md](./APPROVAL_AND_HASH.md) — when payload `schemaVersion` bumps
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) — project setup and manual migration workflow

---

## Appendix A: Runtime compatibility implementation (mobile)

How the app checks version at startup, shows banners, and gates remote sync. Source of truth for constants: `mobile/src/config/compatibility.js`. Logic: `mobile/src/lib/compatibility.js`.

### Module map

| File | Role |
|------|------|
| `mobile/src/config/compatibility.js` | `APP_VERSION`, `MIN_BACKEND_REVISION`, `REQUIRED_BACKEND_CAPABILITIES`, payload schema constants, update URLs, `FORCE_COMPATIBILITY_PREVIEW` |
| `mobile/src/lib/compatibility.js` | RPC fetch, evaluation, cached result, banner builder, `canUseRemoteWrite`, `assertRemoteWriteAllowed` |
| `mobile/src/context/CompatibilityContext.jsx` | React provider + `useCompatibility()` hook |
| `mobile/src/components/ScreenHeaderBanners.jsx` | Reads context → `getHeaderBanners()` → `HeaderBannerStack` |
| `mobile/src/components/HeaderBanner.jsx` | Renders warning / preview / info banner UI |
| `mobile/src/components/ScreenHeader.jsx` | Mounts `<ScreenHeaderBanners />` below title row on every header screen |
| `mobile/src/components/AppVersionSection.jsx` | Settings status, optional/required update button, manual refresh |
| `mobile/App.jsx` | Wraps app in `<CompatibilityProvider>` (runs check on mount) |
| `mobile/src/lib/submissions.js` | Gates submit / approve / decline / discard remote paths |
| `mobile/src/utils/hash.js` | Calls `assertPayloadSchemaSupported` before hashing |

### Startup check flow

```
App.jsx
  └─ CompatibilityProvider (mount)
       └─ refresh() on useEffect
            └─ fetchBackendCompatibility()
                 ├─ !isSupabaseConfigured() → { ok: true, skipped: true }
                 ├─ rpc('get_app_compatibility') error → { ok: true, skipped: true, warning }
                 └─ evaluateBackendCompatibility(data)
                      ├─ app < min_app_version → ok: false, appOutdated
                      ├─ backend_revision < MIN_BACKEND_REVISION → ok: false, backendStale
                      ├─ missing REQUIRED_BACKEND_CAPABILITIES → ok: false
                      ├─ payload_schema_version too new → ok: false
                      └─ else → ok: true (+ optional updateOptional nudge)
            └─ setCachedCompatibility(result)  // module cache for submissions.js
            └─ setCompatibility(result)        // React state for UI
```

`canRemoteWrite` in context = `canUseRemoteWrite(compatibility)`:

- `skipped: true` (offline / RPC error / no Supabase) → **allow** remote writes
- `ok: true` → **allow**
- `ok: false` (stale backend, outdated app, missing caps) → **block**
- `FORCE_COMPATIBILITY_PREVIEW=true` in `mobile/.env` → **block** (dev banner preview)

### Banner display

Only screens using `<ScreenHeader withHeader>` show the compatibility banner (stacked under the title bar):

```
ScreenHeader
  └─ ScreenHeaderBanners
       └─ getHeaderBanners(compatibility, { loading, canRemoteWrite, onRetry: refresh })
            ├─ loading → no banners
            ├─ FORCE_COMPATIBILITY_PREVIEW → purple preview banner
            ├─ skipped OR canRemoteWrite OR no message → no banners
            └─ else → yellow warning banner + optional "Retry" → refresh()
       └─ HeaderBannerStack → HeaderBanner
```

Settings uses `AppVersionSection` (About / App updates screen) for plain-language status and store update links — not the header banner.

### Remote sync gating

**UI layer** — screens read `useCompatibility().canRemoteWrite`:

- `ReviewSessionScreen`: disables submit / send-for-approval when blocked; `sessionStatus` label says "update app to send"
- `DashboardScreen`: passes `canRemoteWrite` into `getSessionDisplayStatus` for saved-local labels

**Service layer** — `mobile/src/lib/submissions.js`:

| Function | When blocked (`!canUseRemoteWrite`) |
|----------|-------------------------------------|
| `submitSessionForApproval` | Saves locally; returns `{ pendingRemote: true }` — no Supabase push |
| `sendSavedSessionForApproval` | Throws "Update the app before sending…" |
| `discardSessionSubmission` | Local discard only; skips remote supersede + push |
| `approveSubmissionRemote` | `assertRemoteWriteAllowed()` throws before insert |
| `declineSubmissionRemote` | `assertRemoteWriteAllowed()` throws before RPC |

`assertRemoteWriteAllowed()` reads `getCachedCompatibility()` (set by provider on startup / retry). Local save, progress, and read paths are **not** gated.

**Payload schema** — `assertPayloadSchemaSupported()` in `hash.js` blocks submit when session `schemaVersion` > `SUPPORTED_PAYLOAD_SCHEMA_VERSION` (separate from backend revision check).

---

## Appendix B: CI script source

Copied from repo root. Shared git helpers: `scripts/lib/ci-git.js`.

### `scripts/check-version-bump.js`

Runs both checks locally:

```javascript
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
```

### `scripts/lib/ci-git.js`

```javascript
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

function parseBaseHeadArgs(argv) {
  const args = argv.slice(2);
  let base = 'origin/main';
  let head = 'HEAD';
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--base' && args[i + 1]) {
      base = args[++i];
    } else if (args[i] === '--head' && args[i + 1]) {
      head = args[++i];
    }
  }
  return { base, head };
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function normalizePaths(output) {
  return output
    .split('\n')
    .map((line) => line.replace(/\\/g, '/'))
    .filter(Boolean);
}

function listChangedFiles(base, head) {
  try {
    return normalizePaths(git(['diff', '--name-only', `${base}...${head}`]));
  } catch {
    return normalizePaths(git(['diff', '--name-only', 'HEAD~1..HEAD']));
  }
}

function listAddedFiles(base, head) {
  try {
    return normalizePaths(git(['diff', '--name-only', '--diff-filter=A', `${base}...${head}`]));
  } catch {
    return [];
  }
}

function readFileAtRef(ref, relativePath) {
  try {
    return git(['show', `${ref}:${relativePath.replace(/\\/g, '/')}`]);
  } catch {
    return null;
  }
}

function compareLex(a, b) {
  return String(a).localeCompare(String(b));
}

module.exports = {
  ROOT,
  parseBaseHeadArgs,
  listChangedFiles,
  listAddedFiles,
  readFileAtRef,
  compareLex,
};
```

### `scripts/check-app-version.js`

```javascript
#!/usr/bin/env node
/**
 * CI: when mobile app code changes, require semver bump + CHANGELOG entry.
 * Usage: node scripts/check-app-version.js [--base origin/main] [--head HEAD]
 */

const fs = require('node:fs');
const path = require('node:path');
const { ROOT, parseBaseHeadArgs, listChangedFiles, readFileAtRef } = require('./lib/ci-git');

const APP_JSON = path.join(ROOT, 'mobile', 'app.json');
const PACKAGE_JSON = path.join(ROOT, 'mobile', 'package.json');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

const APP_PATHS = [/^mobile\/src\//, /^mobile\/app\.json$/, /^mobile\/package\.json$/];
const APP_EXEMPT = [/^mobile\/tests\//];

function needsAppVersionBump(files) {
  return files.some((file) => {
    if (APP_EXEMPT.some((pattern) => pattern.test(file))) return false;
    return APP_PATHS.some((pattern) => pattern.test(file));
  });
}

function readAppVersionFromRef(ref) {
  const content = readFileAtRef(ref, 'mobile/app.json');
  if (!content) return null;
  return JSON.parse(content).expo.version;
}

function readAppVersionFromDisk() {
  if (!fs.existsSync(APP_JSON)) return null;
  return JSON.parse(fs.readFileSync(APP_JSON, 'utf8')).expo.version;
}

function readPackageVersionFromDisk() {
  if (!fs.existsSync(PACKAGE_JSON)) return null;
  return JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')).version;
}

function assertPackageJsonMatchesAppVersion(appVersion) {
  const packageVersion = readPackageVersionFromDisk();
  if (!packageVersion) {
    fail(`could not read version from ${path.relative(ROOT, PACKAGE_JSON)}`);
  }
  if (packageVersion !== appVersion) {
    fail(
      `mobile/package.json version (${packageVersion}) must match mobile/app.json expo.version (${appVersion}).\n` +
        'Bump expo.version in app.json, then set the same version in package.json.',
    );
  }
}

function parseSemver(version) {
  const parts = String(version ?? '0.0.0').split('.').map((n) => Number.parseInt(n, 10));
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
}

function compareSemver(a, b) {
  const left = parseSemver(a);
  const right = parseSemver(b);
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function fail(message) {
  console.error(`\napp-version check failed:\n${message}\n`);
  process.exit(1);
}

function pass(message) {
  console.log(`app-version check passed: ${message}`);
  process.exit(0);
}

function main() {
  const { base, head } = parseBaseHeadArgs(process.argv);
  const changed = listChangedFiles(base, head);

  const headVersion = readAppVersionFromDisk();
  if (!headVersion) {
    fail(`could not read expo.version from ${path.relative(ROOT, APP_JSON)}`);
  }
  assertPackageJsonMatchesAppVersion(headVersion);

  if (!needsAppVersionBump(changed)) {
    pass('no mobile app paths changed — app version bump not required');
  }

  const baseVersion = readAppVersionFromRef(base) ?? readAppVersionFromDisk();

  if (baseVersion && compareSemver(headVersion, baseVersion) <= 0) {
    fail(
      `mobile code changed but app version was not bumped (${baseVersion} → ${headVersion}).\n` +
        'Bump expo.version in mobile/app.json and the same version in mobile/package.json.',
    );
  }

  const changelog = fs.readFileSync(CHANGELOG, 'utf8');
  if (!changelog.includes(`## [${headVersion}]`)) {
    fail(`CHANGELOG.md must include "## [${headVersion}]" for this release.`);
  }

  if (!changed.includes('CHANGELOG.md')) {
    fail('CHANGELOG.md must be updated when bumping the app version.');
  }

  pass(`app version ${baseVersion} → ${headVersion} with CHANGELOG entry`);
}

main();
```

### `scripts/check-backend-revision.js`

```javascript
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
    changed.includes('CHANGELOG.md') || changed.includes('docs/COMPATIBILITY.md');

  if (!docsUpdated) {
    fail(
      'Supabase backend changed — update CHANGELOG.md and/or docs/COMPATIBILITY.md to document the change.',
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
```

---

## Appendix C: Version checks workflow YAML

File: `.github/workflows/version-checks.yml`

**Triggers:** all pull requests targeting `main` (both jobs always run; each script no-ops if its paths did not change).

**Note:** `mobile-tests.yml` is separate — it now runs on every PR to `main`, but uses a changed-files filter to skip quickly when no mobile files changed. It is not part of this workflow.

```yaml
name: Version checks

on:
  pull_request:
    branches:
      - main

jobs:
  app-version:
    name: App version
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Verify app version bump when mobile changes
        run: node scripts/check-app-version.js --base "origin/${{ github.base_ref }}" --head HEAD

  backend-revision:
    name: Backend revision
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Verify backend revision docs when Supabase changes
        run: node scripts/check-backend-revision.js --base "origin/${{ github.base_ref }}" --head HEAD
```

### Path triggers (inside scripts, not workflow `paths:`)

| Script | Watches these changed paths | Exempt / notes |
|--------|----------------------------|----------------|
| `check-app-version.js` | `mobile/src/**`, `mobile/app.json`, `mobile/package.json` | `mobile/tests/**` alone does not require bump |
| `check-backend-revision.js` | `supabase/migrations/**`, `supabase/functions/**` | Requires `CHANGELOG.md` and/or `docs/COMPATIBILITY.md` in diff |

Both scripts use `git diff --name-only origin/<base>...HEAD`. Uncommitted local changes are invisible to CI until committed.

---

## Appendix D: Follow-up recommendations

Based on a cross-project review, these are reasonable future improvements to the current versioning / compatibility setup:

1. **Make compatibility states more explicit**
   - Treat these as distinct first-class outcomes in docs, tests, and UI:
     - update available
     - update required
     - backend stale
     - capability missing
     - payload schema unsupported
   - This should make runtime behavior and future maintenance easier to reason about than a single broad "not compatible" bucket.

2. **Centralize the runtime compatibility contract**
   - Keep one canonical section or machine-readable contract for the compatibility RPC shape, field meanings, and example payloads.
   - Right now the rules are documented across multiple files (`AGENT_VERSIONING.md`, `COMPATIBILITY.md`, implementation notes), which is workable but easier to drift over time.

3. **Add an end-to-end compatibility test**
   - CI currently validates version bumps and backend revision rules well.
   - Consider one additional runtime-oriented test that asserts:
     - RPC response shape
     - app below `min_app_version`
     - backend below `MIN_BACKEND_REVISION`
     - missing required capability
   - That would help catch mismatches between docs, config constants, and live gating behavior.

4. **Revisit fail-open behavior for unknown/error states**
   - Current dev-friendly behavior allows remote writes when compatibility is skipped because the RPC is unavailable or errors.
   - That is pragmatic for development, but production may eventually want an explicit policy choice:
     - fail open
     - fail closed
     - environment-specific behavior
   - This is the highest-risk area long term because "unknown" can be treated more permissively than intended.

5. **Reduce stringly-typed drift**
   - Consider formalizing capability/version metadata further with:
     - an explicit contract version
     - strongly named capability constants
     - optionally generated shared constants between client and backend
   - This should reduce accidental drift in capability strings or response field expectations.

6. **Harden changelog validation incrementally**
   - Current CI presence checks are useful and lightweight.
   - If needed later, consider validating:
     - exact heading uniqueness for the bumped version
     - valid release date format
     - no accidental duplicate release sections in a PR

7. **Add a human release/operator checklist**
   - Manual migration and release steps are already documented, but are still easy to miss.
   - A short PR template or release checklist could help verify:
     - migration applied
     - `backend_revision` updated
     - `min_app_version` / `latest_app_version` reviewed
     - edge deploy status checked

### Highest-priority recommendation

If only one follow-up improvement is prioritized, it should be:

**Make the runtime policy for compatibility errors / skipped checks explicit, especially whether production should fail open or fail closed.**

That is the place where the current setup appears most likely to benefit from a deliberate policy decision as the app matures.
