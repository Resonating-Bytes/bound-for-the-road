# Release and version bumps

How we version releases and what GitHub enforces on pull requests.

Related: [COMPATIBILITY.md](./COMPATIBILITY.md)

---

## App version (semver)

| File | Field |
|------|--------|
| `mobile/app.json` | `expo.version` — **single source of truth** for store builds and runtime |
| `mobile/package.json` | `version` — npm workspace metadata; **must match** `app.json` (enforced in CI) |
| `mobile/src/config/compatibility.js` | `APP_VERSION` — imported from `app.json` |

Bump **`expo.version` in `app.json`** and the same semver in **`mobile/package.json`** on every user-facing release:

- **Patch** (`1.0.0` → `1.0.1`) — bug fixes, small UX tweaks
- **Minor** (`1.0.0` → `1.1.0`) — new features, backward compatible
- **Major** (`1.0.0` → `2.0.0`) — breaking changes; usually bump `min_app_version` on the server too

Other layers (local DB, payload schema, backend revision) are documented in [COMPATIBILITY.md](./COMPATIBILITY.md).

---

## Changelog

[CHANGELOG.md](../CHANGELOG.md) follows [Keep a Changelog](https://keepachangelog.com/).

On each version bump:

1. Move items from `[Unreleased]` into a new `## [x.y.z] - YYYY-MM-DD` section
2. Leave `[Unreleased]` empty (or with placeholders) for the next cycle

---

## Backend revision

| File | Field |
|------|--------|
| `supabase/migrations/<id>_*.sql` | Migration id (timestamp prefix) |
| `mobile/src/config/compatibility.js` | `MIN_BACKEND_REVISION` — bump when **this app build** requires a newer migration |
| `app_config.backend_revision` | Set in SQL when applying migrations (see [COMPATIBILITY.md](./COMPATIBILITY.md)) |

Backend-only PRs (new migration, edge function) do **not** require an app semver bump. Document the change under `[Unreleased]` in `CHANGELOG.md` (CI enforced).

If you raise `MIN_BACKEND_REVISION` in the same PR, a matching `supabase/migrations/<id>_*.sql` must exist.

---

## CI: two separate checks

Workflow: `.github/workflows/version-checks.yml`

GitHub shows **three status checks** on each PR (one workflow, three jobs):

| Check name | Script | When it matters |
|------------|--------|-----------------|
| **App version** | `scripts/check-app-version.js` | `mobile/src/**` or `mobile/app.json` changed |
| **Backend revision** | `scripts/check-backend-revision.js` | `supabase/migrations/**` or `supabase/functions/**` changed |
| **Compatibility contract** | `scripts/check-backend-capabilities.js` | Always (JSON vs SQL capabilities) |

Each job **passes immediately** if its side did not change (compatibility contract always runs).

**App version** enforces:

1. `mobile/app.json` `expo.version` semver **greater than** base branch
2. Same version in `mobile/package.json` (mirrors `app.json`; not used by Expo builds)
3. `CHANGELOG.md` updated with `## [x.y.z] - YYYY-MM-DD` and at least one bullet

**Backend revision** enforces:

1. `CHANGELOG.md` updated with at least one new bullet or release section
2. If `MIN_BACKEND_REVISION` is raised, a migration file with that id exists
3. If a new migration is added and `compatibility.js` changes, `MIN_BACKEND_REVISION` must be at least the new migration id

Run both locally:

```bash
node scripts/check-version-bump.js --base origin/main --head HEAD
```

Or individually:

```bash
node scripts/check-app-version.js --base origin/main --head HEAD
node scripts/check-backend-revision.js --base origin/main --head HEAD
node scripts/check-backend-capabilities.js
```

---

## GitHub branch protection (one-time setup)

Branch protection cannot compare file versions by itself — it **requires the CI check** above.

1. GitHub → **Settings** → **Branches** → **Add branch ruleset** (or edit rule for `main`)
2. Enable **Require status checks to pass**
3. Search for and select **`App version`**, **`Backend revision`**, and **`Compatibility contract`**
4. Also keep **`Mobile tests`** required if already configured
5. Save

After this, PRs that change app/backend code cannot merge until the version and changelog are updated.

---

## After merging a release PR

See [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) for the full operator checklist. Summary:

1. Apply any new Supabase migrations; update `app_config.backend_revision` if needed
2. Confirm edge function deploy succeeded (Actions)
3. Build with EAS when ready for TestFlight / Play internal testing
4. Optionally bump `latest_app_version` in `app_config` for soft update nudges
