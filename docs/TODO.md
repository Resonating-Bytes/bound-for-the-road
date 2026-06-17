# TeenDriver — Project TODO

**Last updated:** 2026-06-17  
**Current phase:** Phase 1 implementation (teen-only, local DB) — **automated testing gate before Phase 2**

**Decisions:** [DECISIONS.md](./DECISIONS.md) — do not duplicate here.  
**Screens:** [SCREENS.md](./SCREENS.md)  
**Testing:** [TESTING.md](./TESTING.md) — planned harness; implement after Phase 1 feature sign-off

---

## How to use this file

- `[ ]` not started · `[~]` in progress · `[x]` complete

---

## Documentation

| File | Status |
|------|--------|
| DECISIONS.md, SCREENS.md | `[x]` 2026-06-07 |
| MVP, SESSION, APPROVAL, NOTIFICATIONS, ILLINOIS, DATA_MODEL synced | `[x]` 2026-06-07 |
| ONBOARDING Phase 1 exception, AUTH sign-out, WISHLIST encryption | `[x]` 2026-06-07 |

---

## Open (pre-store)

| Question | Notes |
|----------|-------|
| Pricing | TBD |

---

## Phase 1 — Expo Go (teen-only)

### Foundation
- [x] Install Drizzle + expo-sqlite + expo-crypto + suncalc
- [x] `src/db/schema.js`, `client.js`, `migrations.js`, `queries.js`
- [x] `src/utils/time.js`, `dayNight.js`, `hash.js`, `export.js`
- [x] `src/config/states/IL.js`, `timezoneCentroids.js`
- [x] Wire `initDb()` in App.jsx

### Auth & onboarding
- [x] Mock sign-in screen
- [x] Teen onboarding (name, DOB, state, permit date — no role screen, no linking)
- [x] Profile complete gate → dashboard

### Session flow
- [x] Dashboard (progress 50/10, list, Start, Export all, Edit row)
- [x] Active session (timer, Stop)
- [x] Review (Save / Discard / Resume, notes, day/night display)
- [x] Hash on Save
- [x] Warn if duration &lt; 5 min
- [x] Soft-delete saved session
- [x] 2-hour local notification nudge (expo-notifications)
- [x] Curfew warning on review (IL)

### Settings & data
- [x] Edit name, permit date
- [x] Sign out (token only)
- [x] Delete all my data on this device
- [x] Outbox stub (enqueue only)

### QA
- [ ] State machine on iPhone + Android emulator

### Automated testing (gate before Phase 2)
- [ ] Jest + jest-expo in `mobile/`
- [ ] Unit tests: hash, dayNight, time, curfew, export
- [ ] Unit tests: queries (session state machine, progress, edit restore)
- [ ] Component tests: Review Resume/Edit/Cancel rules
- [ ] GitHub Actions: `npm test` on PR
- [ ] Maestro E2E happy path (optional same pass)

See [TESTING.md](./TESTING.md). **User sign-off on Phase 1 features first**, then implement this block before Supabase/Phase 2.

---

## Phase 2 — Dev build + Supabase

- [ ] Supabase project, schema, RLS
- [ ] Real Apple / Google auth
- [ ] Role selection, adult onboarding, linking (ONBOARDING Part 2)
- [ ] Submit for approval, adult approve, attestation
- [ ] Push + Edge Function relay
- [ ] Outbox sync to BACKEND endpoints
- [ ] Live Activity + Android foreground service
- [ ] Deep links

---

## Phase 3 — Beta

- [ ] End-to-end multi-device
- [ ] Export field review vs IL DSD X152
- [ ] Family beta testing

---

## Phase 4 — Store

- [ ] Metadata, privacy policy, pricing
- [ ] EAS production build

---

## Agent reading order

1. [DECISIONS.md](./DECISIONS.md)
2. [SCREENS.md](./SCREENS.md)
3. [SESSION_LIFECYCLE.md](./SESSION_LIFECYCLE.md)
4. [DATA_MODEL.md](./DATA_MODEL.md) + [APPROVAL_AND_HASH.md](./APPROVAL_AND_HASH.md)
5. [AUTH.md](./AUTH.md) + [ONBOARDING.md](./ONBOARDING.md) (Phase 1 exception first)
6. [OFFLINE_SYNC.md](./OFFLINE_SYNC.md) + [BACKEND.md](./BACKEND.md) (Phase 2)

Constraints: Expo Go only in Phase 1; all SQL via `queries.js`; hash per APPROVAL_AND_HASH MVP payload.
