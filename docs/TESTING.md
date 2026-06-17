# Automated testing plan

**Last updated:** 2026-06-17  
**Status:** In progress — Jest harness + unit/component tests + CI; Maestro E2E still optional

Decisions: [DECISIONS.md](./DECISIONS.md)

---

## Goal

Catch regressions in session lifecycle, hash integrity, progress math, and navigation rules **before** Supabase, real auth, and adult flows (Phase 2).

Manual iPhone QA stays valuable; automated tests cover logic that is easy to break silently.

---

## Gate

| Milestone | Requirement |
|-----------|-------------|
| **Phase 1 complete (user sign-off)** | Feature set stable enough to freeze behavior under test |
| **Before Phase 2 starts** | Test harness in repo + CI running unit/integration suite |
| **Phase 2+** | Add API/sync tests against Supabase (local or staging) |

Do **not** start Phase 2 backend work until this gate is met.

---

## Test layers (planned)

### 1. Unit tests (Jest) — highest priority

Pure logic in `mobile/src/utils/` and `mobile/src/db/queries.js` (with mocked DB).

| Area | Examples |
|------|----------|
| `time.js` | `durationMinutes`, `isAtLeastAge`, `isValidISODate` |
| `dayNight.js` | Whole-session day/night from start vs sunrise/sunset (fixed dates + timezone) |
| `hash.js` | `stableStringify` key order, SHA-256 matches golden vector |
| `export.js` | Text export includes required IL fields |
| `curfew.js` | Overlap detection for weekday vs weekend |
| `queries.js` | Session state transitions, progress sums, soft-delete exclusion, edit backup restore |

**Tooling:** Jest + `jest-expo` (or Expo's documented Jest preset for SDK 54).

### 2. Component tests (React Native Testing Library)

Screen behavior without a device:

| Screen | Cases |
|--------|-------|
| Review | Resume hidden when `editing`; Cancel restores saved entry |
| Review | Save warns if &lt; 5 min; Discard vs Cancel copy |
| Dashboard | Progress bars from mocked progress query |
| Active session | Timer display from mocked session |

Mock `AuthContext`, `navigation`, and `queries.js` at module boundary.

### 3. Integration / E2E (later in Phase 1 test pass)

| Option | When | Notes |
|--------|------|-------|
| **Maestro** | Preferred for Expo | YAML flows: onboarding → start → stop → save → export |
| **Detox** | Phase 2+ if dev build | Heavier; needs EAS dev client, not Expo Go |

First E2E flow: **happy path teen session** on iOS simulator or device.

### 4. CI (GitHub Actions)

```text
on: pull_request
  → npm ci (mobile/)
  → npm test (unit + component)
  → optional: lint
```

E2E in CI is optional initially (simulator cost/complexity); run Maestro locally before release.

---

## Planned repo layout

```text
mobile/
  jest.config.js
  __tests__/
    utils/
      hash.test.js
      dayNight.test.js
    db/
      queries.test.js
    screens/
      ReviewSessionScreen.test.jsx
  .maestro/                    # later
    teen-session-happy-path.yaml
```

`package.json` scripts:

- `npm test` — Jest
- `npm run test:watch` — local dev
- `npm run test:e2e` — Maestro (when added)

---

## What we explicitly test (Phase 1 behavior)

From [SESSION_LIFECYCLE.md](./SESSION_LIFECYCLE.md) and [DECISIONS.md](./DECISIONS.md):

1. **State machine:** active → draft → saved; resume only from fresh stop; discard draft only
2. **Edit saved:** reopen → draft → re-save → new hash; Cancel restores prior hash
3. **Progress:** 50/10 totals exclude soft-deleted rows
4. **Hash on Save:** payload shape + recompute verification
5. **Day/night:** whole session from start time; no minute split in MVP

---

## Out of scope (Phase 1 tests)

- Supabase RLS, push delivery, Live Activity
- Real Apple/Google auth
- PDF export, GPS stall detection

---

## Implementation order (when user says go)

1. Add Jest + config + one golden test (`hash.test.js`)
2. Unit tests for utils + queries (mock sqlite/drizzle)
3. RTL tests for Review + Resume/Edit rules
4. CI workflow
5. Maestro happy-path flow (optional same sprint)

---

## Manual QA checklist (until automation exists)

See [TODO.md](./TODO.md) § QA — iPhone state machine walkthrough.
