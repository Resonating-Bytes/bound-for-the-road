---
name: pre-commit
description: >-
  Run BoundForTheRoad pre-commit pre-flight before a mobile release commit.
  Bumps app semver, updates CHANGELOG, runs tests and version checks, then
  always ends with a commit message for all local changes. Use when the user
  says run pre-commit, pre-commit, pre-flight, ship check, release prep, or
  before merge checklist.
disable-model-invocation: true
---

# Pre-commit pre-flight (BoundForTheRoad)

**Scope:** Project-only — `.cursor/skills/pre-commit/` in this repo. Not global.
For all repos, copy to `~/.cursor/skills/pre-commit/` (personal skill).

Execute when the user asks to run pre-commit, pre-flight, ship check, or release prep.

**Always end the workflow** with a commit message for **all current local changes**
(uncommitted + staged). User does not need to ask separately.

**Do not run `git commit` unless the user's message contains the exact phrase `create a git commit`.**

Reference: [docs/RELEASE_CHECKLIST.md](../../docs/RELEASE_CHECKLIST.md) (before-merge section).

## Trigger phrases

- `run pre-commit` ← primary; enough on its own
- `pre-commit`
- `pre-flight`
- `run pre-commit checklist`
- `ship check`
- `release prep`

If the skill does not attach, reference it with `@pre-commit` or `@.cursor/skills/pre-commit/SKILL.md`.

User may pass optional hints: target version (`1.5.6`), release theme, or "checks only".

## Workflow

Copy this checklist and mark items as you go:

```
Pre-flight progress:
- [ ] 1. Inspect changes
- [ ] 2. Bump version + CHANGELOG
- [ ] 3. Backend docs (if Supabase changed)
- [ ] 4. Run tests
- [ ] 5. Run version checks
- [ ] 6. Report + commit message (required final step)
```

### 1. Inspect changes

Run in parallel:

- `git status --short`
- `git diff --stat HEAD`
- `git log -3 --oneline`

Note mobile vs Supabase vs docs-only changes.

### 2. Version + CHANGELOG (mobile changes)

When `mobile/src/**`, `mobile/app.json`, or `mobile/package.json` changed (excluding tests-only):

1. Read current version from `mobile/app.json` (`expo.version`).
2. Bump **patch** by default unless the user specified otherwise.
3. Set the **same** version in `mobile/app.json` and `mobile/package.json`.
4. Add `## [x.y.z] - YYYY-MM-DD` to the top of `CHANGELOG.md` (after the header blurb).
5. Use Keep a Changelog sections: `### Added`, `### Changed`, `### Fixed` (omit empty sections).
6. Bullets must be `- ` prefixed (CI validates format).

If the user already bumped version/changelog, verify they match and only fix gaps.

Optional: update `docs/TODO.md` header line `**App:** x.y.z` when the release is feature-complete.

### 3. Backend docs (only if `supabase/**` changed)

- [ ] New migration filename: `YYYYMMDDHHMMSS_description.sql`
- [ ] `CHANGELOG.md` documents Supabase changes in the release section
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

### 5. Run version checks

From repo root:

```bash
node scripts/check-version-bump.js --base origin/main --head HEAD
```

This runs app version, backend revision, and capability contract checks.

### 6. Report + commit message (always last)

Summarize:

- Version bumped to `x.y.z` (or "already at x.y.z")
- Test count / pass-fail
- Version script pass-fail
- Any skipped steps (docs-only, user said checks-only, etc.)

Then **always** provide a commit message covering **every file in the current working tree**
(`git status` / full diff). Do not wait for the user to ask.

**Commit message format** (one fenced code block, summary line + `-` bullets):

- **Do not** put the semver in the commit message — version lives in `CHANGELOG.md`, `app.json`, and the pre-flight report only.
- Summary line: short thematic description of the release (no `1.5.x`, no "Release x.y.z").
- Bullets: details from CHANGELOG or diff.

```
Foreground GPS, road category breakdown, and export polish
- Live road category and day/night on Active; Review breakdown and Insufficient data below threshold
- Export all dialog with optional road category; copy-from-preset on Appearance
```

Do not commit unless the user said `create a git commit`.

## Checks this workflow does NOT cover

Post-merge operator steps (migrations in Supabase SQL editor, EAS build, TestFlight) live in RELEASE_CHECKLIST **After merge** — not pre-commit.

Manual QA in Expo Go is optional; remind the user if the change is UI-heavy and they have not tested yet.

## Split modes

| User says | Do |
|-----------|-----|
| `pre-commit` (default) | Full workflow |
| `pre-commit checks only` | Steps 4–5 only |
| `pre-commit changelog` | Steps 1–2 + commit message draft |
| `pre-commit with 1.6.0` | Use specified semver in step 2 |
