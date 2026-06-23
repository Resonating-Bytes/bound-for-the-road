---
name: post-review
description: >-
  Run BoundForTheRoad post-review after a self-review loop on a moderate-complexity
  PR. Audits branch commits, CHANGELOG coverage, and deferred review items; suggests
  fixes or documents deferrals. Use when the user says run post-review, post-review,
  harden, harden pass, or pre-merge review.
disable-model-invocation: true
---

# Post-review (BoundForTheRoad)

**Scope:** Project-only — `.cursor/skills/post-review/` in this repo. Not global.
For all repos, copy to `~/.cursor/skills/post-review/` (personal skill).

Execute after a self-review loop (one or more agent/human review passes) and **before**
`pre-commit` on moderate-complexity PRs.

**Pair with:** [pre-commit](../pre-commit/SKILL.md) — post-review is qualitative merge
readiness; pre-commit is version, tests, CI checks, and commit message.

**Do not run `git commit` unless the user's message contains the exact phrase `create a git commit`.**

References:

- [docs/RELEASE_CHECKLIST.md](../../docs/RELEASE_CHECKLIST.md) — before-merge section
- [CHANGELOG.md](../../CHANGELOG.md) — release section for the branch

## Trigger phrases

- `run post-review` ← primary; enough on its own
- `post-review`
- `run post-review checklist`
- `harden`
- `harden pass`
- `pre-merge review` (alias)

If the skill does not attach, reference it with `@post-review` or `@.cursor/skills/post-review/SKILL.md`.

User may pass optional hints: number of self-review rounds completed, known open items, or "commits only".

## Workflow

Copy this checklist and mark items as you go:

```
Post-review progress:
- [ ] 0. Confirm branch (not `main`)
- [ ] 1. Inspect branch commits
- [ ] 2. Verify CHANGELOG vs branch diff
- [ ] 3. Triage deferred review items
- [ ] 4. Run tests (if fixes made)
- [ ] 5. Report + next steps (required final step)
```

### 0. Confirm branch (not `main`)

Run:

```bash
git fetch origin
git rev-parse --abbrev-ref HEAD
```

- If the result is `main`, **stop** and tell the user to switch to a feature branch.
- If already on a feature branch, continue.

**Use `origin/main` as the baseline** for changelog and diff coverage.

### 1. Inspect branch commits

Check the contents of all local commits to make sure they are solid and worth keeping.

Run:

```bash
git log origin/main..HEAD --oneline
git log origin/main..HEAD --format="%h %s%n%b---"
```

For each commit, note:

- Message quality (summary line, bullets, no stray markdown artifacts)
- Whether it should be **kept**, **reworded**, or **squashed** into a neighbor
- Whether dev-only changes (e.g. `.cursor/skills/**`) belong in the same PR or a separate commit

Suggest squash groupings when many small hardening commits tell one story, but do not rewrite history unless the user asks.

### 2. Verify CHANGELOG vs branch diff

Make sure the changelog covers all changes made in this branch.

Run:

```bash
git diff --name-only origin/main
git diff --stat origin/main
```

Read the top `## [x.y.z] - YYYY-MM-DD` section in `CHANGELOG.md` (for the branch's app version if bumped).

Check:

- Every **user-facing** change under `mobile/src/**`, `mobile/App.jsx`, `mobile/index.js`, `web/**`, and `supabase/**` has a bullet (or is intentionally omitted with reason)
- Release date is **not earlier** than the section below it (newer versions should have same or later date)
- Section version matches `mobile/app.json` `expo.version` when the branch bumps app version
- Dev-only changes (`.cursor/**`, skill files) usually **do not** need CHANGELOG bullets

Fix gaps in `CHANGELOG.md` when obvious; otherwise list missing bullets for the user.

### 3. Triage deferred review items

There are the items called out, but left open. Let me know if you feel any should be addressed now:

For each open item from the self-review (or a list the user provides), classify:

| Verdict | Meaning |
|---------|---------|
| **Fix now** | Small, low-risk, blocks merge confidence |
| **Defer** | Edge case, larger refactor, or acceptable known limitation |
| **Document** | Defer code but add a line to `docs/AUTH.md`, PR description, or a short comment |

Default posture: fix hygiene (missing tests, changelog, broken commit messages); defer edge-case UX unless the user says otherwise.

If the user supplied a numbered optional list, respond with the same numbers and a one-line verdict each.

### 4. Run tests (if fixes made)

Only when step 2 or 3 changed code:

```bash
cd mobile && npm test
```

Skip if this pass was audit-only.

### 5. Report + next steps (always last)

Summarize:

- Commit audit (count, keep/squash/reword recommendations)
- CHANGELOG coverage (complete / gaps fixed / gaps remaining)
- Deferred items table (fix now vs defer vs document)
- Test result if step 4 ran

End with:

> When ready to ship: **run pre-commit** (version bump if needed, CI checks, commit message).

Do **not** duplicate pre-commit's version bump rules or commit message unless the user also asked for a message in this pass.

## What this workflow does NOT cover

- App semver bump or `check-version-bump.js` — **pre-commit**
- Drafting the final commit message for all local changes — **pre-commit** (unless user asks here too)
- Creating the GitHub PR or merging — operator steps in RELEASE_CHECKLIST

## Split modes

| User says | Do |
|-----------|-----|
| `post-review` (default) | Full workflow |
| `post-review commits only` | Steps 0–1 + report |
| `post-review changelog` | Steps 0–2 + report |
| `post-review triage` | Steps 0, 3 + report (user supplies open items) |
