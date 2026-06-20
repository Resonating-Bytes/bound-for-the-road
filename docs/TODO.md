# Bound for the Road — Project TODO

**Last updated:** 2026-06-20  
**Current phase:** Phase 2 — **next:** outbox sync (after settings sub-pages)

**Decisions:** [DECISIONS.md](./DECISIONS.md) — do not duplicate here.  
**Screens:** [SCREENS.md](./SCREENS.md)  
**Testing:** [TESTING.md](./TESTING.md) — planned harness; implement after Phase 1 feature sign-off

**Supabase migrations to apply (in order):** `20260618120000_initial_schema.sql` through `20260619170000_approvals_adult_linked_select.sql` — see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

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
- [x] Dev build scaffold (`expo-dev-client`, `eas.json`, bundle ID in `app.json`) — install blocked until Apple Dev

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
- [ ] Custom header color picker (hex / native color wheel) — see **After versioning — theme & color system**
- [x] Adult dashboard UX — multi-teen switcher ([SCREENS.md](./SCREENS.md)): 1 teen = static label; 2+ = chips; scope progress + sessions
- [x] **LinkAdult navigation:** navigate to AdultHome after successful link; select newly linked teen
- [x] Submit for approval, adult approve, attestation
- [x] Push + Edge Function relay (deploy `send-approval-push`; run `eas init` for project ID — see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- [ ] **Follow-up: iOS development build** (when ready for Apple Developer $99/year) — see [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md#development-build-bound-for-the-road-branding)
  - [ ] Enroll in [Apple Developer Program](https://developer.apple.com/programs/)
  - [ ] `npx eas-cli login` → `npx eas-cli init` (from `mobile/`)
  - [ ] Supabase **Redirect URLs**: `boundfortheroad://**` (covers `boundfortheroad://auth/callback`)
  - [ ] `npx eas-cli device:create` (register iPhone)
  - [ ] `npx eas-cli build --profile development --platform ios`
  - [ ] Install build on iPhone; daily dev via `npm run start:dev-client` (not Expo Go)
  - [ ] OAuth system prompt should say **Bound for the Road** instead of **Expo**
- [ ] Sign in with Apple (after iOS dev build)
- [ ] Outbox sync to BACKEND endpoints
- [ ] Maestro E2E happy path (dev/production build — not Expo Go)
- [ ] Live Activity + Android foreground service
- [ ] Deep links

---

## Next batch (after merge) — compatibility & versioning

**Goal:** Safe schema/API evolution so old app builds, new backends, and in-flight payloads don’t silently corrupt data.

**What exists today (partial):**
- Payload `schemaVersion: 1` in hash canonical JSON ([APPROVAL_AND_HASH.md](./APPROVAL_AND_HASH.md), `hash.js`) — field is set but no bump/migration policy yet
- Supabase DDL via timestamped SQL files (`supabase/migrations/`) — manual apply; app does not check revision
- Local SQLite uses `CREATE TABLE IF NOT EXISTS` only (`migrations.js`) — **no version table or incremental migrations** (CROSS_PLATFORM.md called for this; not built)

**You need both layers (not either/or):**
| Layer | What it versions | Example |
|-------|------------------|---------|
| **Data / payload** | Shape of hashed session JSON | `schemaVersion: 2` adds a field; old approvals still bind to v1 hashes |
| **Data / storage** | SQLite + Postgres table columns | Local migration v3 adds column; Supabase migration adds RPC param |
| **Software / API** | App build ↔ backend capabilities | App 1.2 requires `decline_submission` RPC + `session_withdrawn` push event; block or prompt if missing |

### Plan (implement in this batch)
- [x] Short design note in docs ([COMPATIBILITY.md](./COMPATIBILITY.md)): version numbering, who bumps what, and client behavior on mismatch
- [x] **Local SQLite:** `schema_meta` table + numbered incremental migrations (`schemaMigrations.js`)
- [x] **Payload:** `schemaVersion` constants; backward-compatible readers; reject newer payloads on verify
- [x] **Backend revision:** `app_config` + `get_app_compatibility()` RPC (`20260620120000_app_compatibility.sql`)
- [x] **App startup check:** `CompatibilityProvider` + banner; block remote submit/approve/decline/withdraw when incompatible
- [x] **Edge functions:** `clientVersion` on push invoke body (optional on server)
- [x] Tests: local DB version, compatibility evaluation, payload schema guard

### Still queued after versioning (Phase 2 continued)
- [x] Multi-teen switcher (includes LinkAdult → AdultHome after linking a 2nd+ teen)
- [ ] Outbox sync
- [ ] Maestro E2E, Live Activity, deep links, Apple dev build

---

## After versioning — theme & color system

**Goal:** Richer personalization beyond header-only presets; **accent color** for highlights across the app (buttons, links, progress, selected states).

**What exists today:**
- Per-user header preset (`header_theme_id_<userId>`) in Settings — Neutrals, Saturated, Light, **Vibrant** categories
- `resolveTheme()` sets header colors, **curated accent per preset**, `accentText`, and **halo** on header titles (always on; tweak `HEADER_TITLE_HALO` in `headerTitleEffects.js`)
- Body UI uses `theme.accent` / `theme.accentText` for primary actions, links, loaders, progress bar, theme picker selection ring
- Theme picker shows header swatch + accent chip per preset

### Design (completed 2026-06)
- [x] **Accent approach:** hybrid — curated `accent` on each preset; derived fallback in `resolveAccentForPreset()` when missing
- [x] **Header title effect:** halo (`HEADER_TITLE_HALO`: radius 3, opacity 1), always on
- [x] Contrast for accent on light backgrounds via `getAccentTextColor()` in `accent.js`
- [x] Theme spike removed; production tuning via `HEADER_TITLE_HALO` in `headerTitleEffects.js`

### Implementation (completed 2026-06)
- [x] Extend preset model + `resolveTheme()` with `accent`, `accentText`, `headerTitleHalo`
- [x] Rename teen dashboard header title to **Teen dashboard**
- [x] Replace hardcoded `#2563eb` in production screens/components (spike/dev files may still reference blue)
- [x] `ThemePickerSection` — selected swatch uses preset accent; accent chip under each swatch
- [x] **Vibrant** category — bright orange, hot pink, lime green, royal blue
- [x] `ScreenHeader` — applies halo via `ScreenHeaderTitle`
- [x] Tests: `resolveTheme` accent + halo assertions
- [x] Removed theme spike screen, SVG outline exploration, and `react-native-svg` dependency

### Future milestone — customization & expansion (deferred)
- [ ] **Custom accent hex** — Settings UI, per-user persistence (`accent_hex_<userId>` or similar), wire into `resolveAccentForPreset()` override hook in `accent.js`
- [ ] **Custom header hex** — native color wheel / hex field (same Settings milestone or sub-page)
- [x] Per-preset accent tuning after dogfooding (adjust `presets.js` values only — no new UI)
- [x] **Onboarding title halo** — not needed (no header bar on onboarding screens)
- [x] Version bump + CHANGELOG when merging theme work to `main`

**Reading order:** `presets.js`, `resolveTheme.js`, `accent.js`, `headerTitleEffects.js`, `ScreenHeader.jsx`, `ThemePickerSection.jsx`

---

## After theming — Settings sub-pages

**Goal:** Reduce clutter on the main Settings screen by grouping related options into focused sub-screens.

**What exists today:** Single long `SettingsScreen` scroll — theme picker, app version, profile fields, linked accounts, sign out, delete data.

### Proposed structure (spike)
- [x] **Profile** — legal name, permit date (teen), save; delete all local data at bottom
- [x] **Appearance** — header theme picker
- [x] **About** — installed version, compatibility status, update link
- [x] **Linked accounts** — invite, list, remove (top-level hub row when Supabase configured)
- [x] Main Settings — short list of rows (title + chevron); sign out on hub
- [x] Destructive delete buried on Profile sub-screen
- [x] Reuse existing section components inside sub-screens

**Reading order:** `SettingsScreen.jsx`, stack navigators in `RootNavigator.jsx`

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
