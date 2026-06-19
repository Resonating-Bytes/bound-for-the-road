# Bound for the Road — Project TODO

**Last updated:** 2026-06-19  
**Current phase:** Phase 2 — push notifications wired; next up: outbox sync, multi-teen switcher

**Decisions:** [DECISIONS.md](./DECISIONS.md) — do not duplicate here.  
**Screens:** [SCREENS.md](./SCREENS.md)  
**Testing:** [TESTING.md](./TESTING.md) — planned harness; implement after Phase 1 feature sign-off

**Supabase migrations to apply (in order):** `20260618120000_initial_schema.sql`, `20260618120001_rls_policies.sql`, `20260619120000_link_invite_rpc.sql`, `20260619130000_users_insert_own.sql` — see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

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
- [x] Stale active session → draft on app open (>24h)

### Settings & data
- [x] Edit name, permit date
- [x] Sign out (token only)
- [x] Delete all my data on this device
- [x] Outbox stub (enqueue only)

### QA
- [ ] State machine on iPhone + Android emulator

### Automated testing (gate before Phase 2)
- [x] Jest + jest-expo in `mobile/`
- [x] Unit tests: hash, dayNight, time, curfew, export
- [x] Unit tests: queries (session state machine, progress, edit restore)
- [x] Component tests: Review Resume/Edit/Cancel rules
- [x] GitHub Actions: `npm test` on PR

See [TESTING.md](./TESTING.md). Maestro E2E deferred to Phase 2 (dev/production build — not Expo Go).

---

## Phase 2 — Dev build + Supabase

### Foundation & auth
- [x] Postgres schema + RLS migrations (`supabase/migrations/`)
- [x] Mobile Supabase client + env template ([SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- [x] Supabase project created + migrations applied (manual)
- [x] Google sign-in via Supabase Auth (Expo Go)
- [x] Profile upsert to Supabase (incl. `users_insert_own` for dev DB resets)

### Onboarding Part 2 — role + linking
- [x] Role selection (teen vs adult) + adult name onboarding
- [x] Teen/adult 6-digit invite codes (`accept_link_invite` RPC)
- [x] Invite later (teen can defer; resume from Settings)
- [x] Link established → both sides land on dashboard/home
- [x] Linked accounts in Settings (list, remove, invite) — teen + adult
- [x] Settings UI polish (native back button, compact permit date editor)
- [x] Adult invite entry formatted as `482 916`
- [x] Jest: links helpers, navigation helpers

### Next (Phase 2 continued)
- [x] Theme color picker in Settings — categorized preset swatches + auto contrast text
- [ ] Custom header color picker (hex / native color wheel for full control)
- [ ] Adult dashboard UX — multi-teen switcher ([SCREENS.md](./SCREENS.md)): 1 teen = static name; 2+ = dropdown; scope session/approval UI to selection
- [x] Submit for approval, adult approve, attestation
- [x] Push + Edge Function relay (deploy `send-approval-push`; run `eas init` for project ID — see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- [ ] Outbox sync to BACKEND endpoints
- [ ] Maestro E2E happy path (dev/production build — not Expo Go)
- [ ] Live Activity + Android foreground service
- [ ] Deep links
- [ ] iOS dev build / Sign in with Apple (when Apple Dev account ready)

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
