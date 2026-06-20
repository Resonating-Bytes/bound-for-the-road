# Bound for the Road — Project TODO

**Last updated:** 2026-06-21 · **App:** 1.5.4 (pending merge) · **Phase:** 2

**Decisions:** [DECISIONS.md](./DECISIONS.md) — do not duplicate here.  
**Screens:** [SCREENS.md](./SCREENS.md) · **Testing:** [TESTING.md](./TESTING.md)  
**Supabase:** apply migrations per [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

---

## How to use this file

- `[ ]` not started · `[~]` in progress · `[x]` complete

---

## Next up (priority)

### 1. Outbox sync (+ nickname trim fix) `[x]`

- [x] Outbox replay worker — NetInfo listener, ordered replay, exponential backoff ([OFFLINE_SYNC.md](./OFFLINE_SYNC.md))
- [ ] Route additional remote writes through outbox when offline (approve/decline/withdraw — later)
- [x] Sync status UI — “Pending sync” / “Up to date” (Settings → About)
- [x] **Nickname field:** `limitNameLength` on submit only in `SettingsLinkedAccountDetailScreen`

**Offline mode scope:** Local start → stop → review → save works without network. Outbox sync completes the **remote half** — queued submits replay when connectivity and compatibility allow.

### 2. Editable session times and fields

- [ ] Edit `startedAt` / `endedAt` on Review (forgot to tap Start/Stop)
- [ ] Recompute duration, day/night, curfew, and hash on save; handle re-submit / re-approval when already submitted
- [ ] Audit other read-only review fields ([SCREENS.md](./SCREENS.md))

Promoted from [WISHLIST.md](./WISHLIST.md).

### 3. Location during active session — foreground (Expo Go)

- [ ] Sample `expo-location` while session is **active and app foreground** — coords + speed
- [ ] On-device road-type heuristics (highway vs local from speed); no server upload ([CROSS_PLATFORM.md](./CROSS_PLATFORM.md))

### 4. Location — background (after native dev build)

- [ ] Background track, stall detection, route heat map — dev client + Live Activity / Android foreground service

---

## Open (pre-store)

| Question | Notes |
|----------|-------|
| Pricing | TBD |

---

## Phase 1 — Expo Go (teen-only) `[x]`

Foundation, auth, session flow, settings, and automated test harness are complete.

### QA (manual — Expo Go, do now)

- [ ] Session state machine on iPhone + Android emulator

**Checklist:** `C:\tmp\expo-go-qa-checklist.md` — walk through start → stop → review → save → edit → delete on Expo Go. Jest covers logic; this is a one-time device sanity pass. **Maestro E2E** waits until native dev build (not this checkbox).

---

## Phase 2 — Dev build + Supabase

### Done

- [x] Postgres schema + RLS, Supabase auth (Google), profile sync, linking, invites
- [x] Submit / approve / decline / withdraw, push + edge function
- [x] Compatibility & versioning (1.5.x)
- [x] Settings sub-pages, theme presets, display names + nicknames (1.5.0–1.5.2)
- [x] Custom header/accent hex on Appearance (persisted per user)
- [x] 1.5.2 post-merge operator steps (no new migrations; local smoke test)

### Backlog (after next-up items)

- [ ] **iOS development build** — Apple Developer enrollment; see [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md#development-build-bound-for-the-road-branding)
- [ ] Sign in with Apple (after iOS dev build)
- [ ] Maestro E2E happy path (dev/production build)
- [ ] Live Activity (iOS) + Android foreground service
- [ ] Deep links wired to push routes
- [ ] Custom accent / header hex pickers (deferred)

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
5. [AUTH.md](./AUTH.md) + [ONBOARDING.md](./ONBOARDING.md)
6. [OFFLINE_SYNC.md](./OFFLINE_SYNC.md) + [BACKEND.md](./BACKEND.md)

Constraints: all SQL via `queries.js`; hash per APPROVAL_AND_HASH MVP payload.
