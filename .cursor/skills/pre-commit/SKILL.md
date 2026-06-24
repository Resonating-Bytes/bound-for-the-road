---
name: pre-commit
description: >-
  Run BoundForTheRoad pre-commit pre-flight before a mobile release commit.
  Bumps app semver and CHANGELOG when required, runs tests and version checks,
  then always ends with a commit message for all local changes. Use when the
  user says run pre-commit, pre-commit, pre-flight, ship check, release prep, or
  before merge checklist.
disable-model-invocation: true
---

# Pre-commit pre-flight (BoundForTheRoad)

**Scope:** Project-only — `.cursor/skills/pre-commit/` in this repo. Not global.
For all repos, copy to `~/.cursor/skills/pre-commit/` (personal skill).

Execute when the user asks to run pre-commit, pre-flight, ship check, release prep, or before-merge prep.

**Always end the workflow** with a commit message for **all current local changes**
(uncommitted + staged). User does not need to ask separately.

**Do not run `git commit` unless the user's message contains the exact phrase `create a git commit`.**

References:

- [docs/RELEASE.md](../../docs/RELEASE.md) — semver bump levels, CI gates
- [docs/RELEASE_CHECKLIST.md](../../docs/RELEASE_CHECKLIST.md) — before-merge section
- `scripts/check-app-version.js` — exempt paths and bump rules (source of truth for CI)

## Trigger phrases

- `run pre-commit` ← primary; enough on its own
- `pre-commit`
- `pre-flight`
- `run pre-commit checklist`
- `ship check`
- `release prep`
- `before merge`

If the skill does not attach, reference it with `@pre-commit` or `@.cursor/skills/pre-commit/SKILL.md`.

User may pass optional hints: target version (`1.5.6`), bump level (patch/minor/major), theme for changelog, `checks only`, or `exempt`.

## Workflow

Copy this checklist and mark items as you go:

```
Pre-flight progress:
- [ ] 0. Confirm branch (not `main`)
- [ ] 1. Inspect changes
- [ ] 2. Bump version + CHANGELOG (if required)
- [ ] 3. Backend docs (if Supabase changed)
- [ ] 4. Run tests
- [ ] 5. Run version checks
- [ ] 6. Report + commit message (required final step)
```

### 0. Confirm branch (not `main`)

Run:

```bash
git fetch origin
git rev-parse --abbrev-ref HEAD
```

- If the result is `main`, **stop** and tell the user to create or switch to a feature branch first (e.g. `git switch -c dev/feature-name`). Do not bump version, run release checks, or draft a ship message on `main`.
- If already on a feature branch, continue.

**All version decisions use `origin/main` as the baseline** — not the parent commit, not the previous commit on this branch.

### 1. Inspect changes (vs `origin/main`)

Run in parallel:

- `git status --short`
- `git diff --stat origin/main` — working tree vs main (includes uncommitted)
- `git diff --name-only origin/main` — file list for bump decision
- `git log origin/main..HEAD --oneline`
- `git show origin/main:mobile/app.json` — `expo.version` on main

Note mobile vs Supabase vs docs-only changes.

### 2. Version + CHANGELOG (functional changes vs `origin/main`)

Use [RELEASE.md](../../docs/RELEASE.md) app version section. Matches `scripts/check-app-version.js` (CI **App version** job).

**Exempt (no bump):** changes only under paths that do **not** match the required list below (see `scripts/check-app-version.js`).

Examples that are exempt on their own: `docs/**`, `mobile/tests/**`, `web/**`, `.github/**`, `supabase/**` (backend has its own gate), `mobile/App.jsx` / `mobile/index.js` (runtime but not in CI app-path list — still bump if the same PR already bumps for `mobile/src/**`).

**Required:** any path under `mobile/src/**` except `mobile/tests/**`, or changes to `mobile/app.json` / `mobile/package.json`.

**Bump rule (matches CI):**

1. Collect functional paths from `git diff --name-only origin/main` (working tree vs main).
2. If **no** functional paths → skip bump.
3. If **yes** functional paths:
   - `main_version` = `expo.version` from `git show origin/main:mobile/app.json`
   - `head_version` = read `mobile/app.json` from disk
   - If `head_version == main_version` → **must bump** (default PATCH unless user specified minor/major). Add a **new** `## [X.Y.Z] - YYYY-MM-DD` section at the top of CHANGELOG — do not only extend an older section.
   - If `head_version` is already **greater than** `main_version` → **one bump per branch**: do not bump again; ensure top CHANGELOG heading matches `head_version` and bullets cover this branch's changes.
4. `head_version` must match the top `## [X.Y.Z]` heading in `CHANGELOG.md`; `mobile/package.json` `version` must match `mobile/app.json` `expo.version`.
5. Use Keep a Changelog sections: `### Added`, `### Changed`, `### Fixed` (omit empty sections).
6. Bullets must be `- ` prefixed (CI validates format).

**Why this matters:** CI runs `check-app-version.js --base origin/main --head HEAD` (or the PR merge base). It fails when functional files changed but `expo.version` still equals the base. Extending an existing changelog section without bumping version does **not** pass CI.

Optional: update `docs/TODO.md` header line `**App:** x.y.z` when the release is feature-complete.

If the user already bumped version/changelog, verify against `origin/main` and only fix gaps.

### 3. Backend docs (only if `supabase/**` changed vs `origin/main`)

- [ ] New migration filename: `YYYYMMDDHHMMSS_description.sql`
- [ ] `CHANGELOG.md` documents Supabase changes (new bullets or release section; backend-only PRs may use `[Unreleased]` per [RELEASE.md](../../docs/RELEASE.md))
- [ ] Raise `MIN_BACKEND_REVISION` if this app build requires the new migration
- [ ] Update `mobile/src/config/requiredBackendCapabilities.json` if RPC capabilities changed

Skip when no Supabase changes.

### 4. Run tests

```bash
cd mobile && npm test
```

Fix failures before continuing. Common gotchas:

- Renamed theme preset IDs → update `mobile/tests/theme/theme.test.js`
- New DB helpers → extend `mobile/tests/db/queries.test.js`

### 5. Run version checks (same as CI)

From repo root:

```bash
git fetch origin
node scripts/check-version-bump.js --base origin/main --head HEAD
```

This compares **committed** branch changes vs `origin/main` but reads `mobile/app.json`, `mobile/package.json`, and `CHANGELOG.md` from the **working tree** — so step 2 must update those files before this command.

If it fails, fix step 2 and re-run. Do not finish pre-commit with a failing version check.

**Note:** If step 2 required a bump based on **uncommitted** `mobile/src/**` changes, step 5 may still pass until those files are committed; remind the user CI will enforce the bump once the PR includes those paths.

Optional: `node --test scripts/check-version-bump.test.js`

### 6. Report + commit message (always last)

Summarize:

- `origin/main` app version vs branch `expo.version` (bumped to `x.y.z`, already ahead of main, or exempt)
- Test count / pass-fail
- `check-version-bump.js --base origin/main` pass-fail
- Any skipped steps (checks-only, exempt, docs-only, etc.)

Then **always** provide a commit message covering **every file in the current working tree**
(`git status` / full diff). Do not wait for the user to ask.

**Commit message format** (one fenced code block, summary line + `-` bullets — one-click copy):

- **Do not** put the semver in the commit message — version lives in `CHANGELOG.md`, `app.json`, and the pre-flight report only.
- Summary line: short thematic description (no `1.5.x`, no "Release x.y.z").
- Bullets: details from CHANGELOG or diff.

```
Short thematic summary of the change

- what changed
- what changed
```

- Bullets describe **what** was done, not why. As brief as possible.
- Large changes (5+ areas): summary line naming the main theme, then bullets.
- **Do not** duplicate bullets outside the code block.

Do not commit unless the user said `create a git commit`.

## Checks this workflow does NOT cover

Post-merge operator steps (migrations in Supabase SQL editor, EAS build, TestFlight) live in RELEASE_CHECKLIST **After merge** — not pre-commit.

Manual QA in Expo Go is optional; remind the user if the change is UI-heavy and they have not tested yet.

Pushing branch or opening PR — user handles git remote.

## Split modes

| User says | Do |
|-----------|-----|
| `pre-commit` (default) | Full workflow |
| `pre-commit checks only` | Steps 4–5 only |
| `pre-commit changelog` | Steps 1–2 + commit message draft |
| `pre-commit with 1.6.0` | Use specified semver in step 2 |
| `pre-commit exempt` | Steps 1, 4–6 only (confirm docs/tests-only or otherwise exempt per step 2) |
