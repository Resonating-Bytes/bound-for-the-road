# Bound for the Road — Project TODO

**Last updated:** 2026-06-18  
**Current phase:** Phase 2 — Google sign-in working in Expo Go; next: Apple, linking, sync

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

- [x] Postgres schema + RLS migrations (`supabase/migrations/`)
- [x] Mobile Supabase client stub + env template ([SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- [x] Supabase project created + migrations applied (manual)
- [x] Google sign-in via Supabase Auth (Expo Go)
- [x] Dev build scaffold (`expo-dev-client`, `eas.json`, bundle ID in `app.json`) — install blocked until Apple Dev
- [ ] **Follow-up: iOS development build** (when ready for Apple Developer $99/year) — see [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md#development-build-bound-for-the-road-branding)
  - [ ] Enroll in [Apple Developer Program](https://developer.apple.com/programs/)
  - [ ] `npx eas-cli login` → `npx eas-cli init` (from `mobile/`)
  - [ ] Supabase **Redirect URLs**: `boundfortheroad://**` (covers `boundfortheroad://auth/callback`)
  - [ ] `npx eas-cli device:create` (register iPhone)
  - [ ] `npx eas-cli build --profile development --platform ios`
  - [ ] Install build on iPhone; daily dev via `npm run start:dev-client` (not Expo Go)
  - [ ] OAuth system prompt should say **Bound for the Road** instead of **Expo**
- [ ] Sign in with Apple (after iOS dev build)
- [ ] Role selection, adult onboarding, linking (ONBOARDING Part 2)
- [ ] Submit for approval, adult approve, attestation
- [ ] Push + Edge Function relay
- [ ] Outbox sync to BACKEND endpoints
- [ ] Maestro E2E happy path (dev/production build — not Expo Go)
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
