# Bound for the Road — Project TODO

**Last updated:** 2026-06-21 · **App:** 1.5.6 · **Phase:** 2

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

### 2. Editable session times and fields `[x]`

- [x] Edit `startedAt` / `endedAt` on Review and Edit session (duration computed; day/night from start)
- [x] Recompute hash and re-submit / re-approval when already submitted (edit flow reopens as draft → submit)
- [x] Review fields documented in [SCREENS.md](./SCREENS.md)

Promoted from [WISHLIST.md](./WISHLIST.md).

### 3. Location during active session — foreground (Expo Go) `[x]`

- [x] Sample `expo-location` while session is **active and app foreground** — coords + speed
- [x] On-device road-category heuristics (highway vs local from speed); no server upload ([CROSS_PLATFORM.md](./CROSS_PLATFORM.md))

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

- [x] Session state machine on iPhone + Android emulator

**Checklist:** `C:\tmp\expo-go-qa-checklist.md` — walk through start → stop → review → save → edit → delete on Expo Go. Jest covers logic; this is a one-time device sanity pass. **Maestro E2E** waits until native dev build (not this checkbox).

---

## Phase 2 — Dev build + Supabase

### Done

- [x] Postgres schema + RLS, Supabase auth (Google), profile sync, linking, invites
- [x] Submit / approve / decline / withdraw, push + edge function
- [x] Compatibility & versioning (1.5.x)
- [x] Settings sub-pages, theme presets, display names + nicknames (1.5.0–1.5.2)
- [x] Editable session times on Review and Edit session (1.5.5)
- [x] Foreground GPS sampling on Active session — local `session_location_samples`, road category UI

### Backlog (after next-up items)

- [ ] **Sync local ↔ remote session state** — On sign-in / app open (online), pull saved sessions + approvals from Supabase into local SQLite so a new phone or fresh install matches cloud (e.g. approved sessions visible on teen dashboard). Today: local is source of truth on device; outbox pushes submits only — no inbound merge. See [OFFLINE_SYNC.md](./OFFLINE_SYNC.md), [ONBOARDING.md](./ONBOARDING.md) (new phone).
- [x] **Road category time breakdown on Review** — Aggregate `session_location_samples` into local/highway/not-tracked; show on summary after user validates foreground GPS
- [ ] **iOS development build** — Apple Developer enrollment; see [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md#development-build-bound-for-the-road-branding)
- [ ] Sign in with Apple (after iOS dev build)
- [ ] **Email + password sign-up / sign-in** — Supabase email auth as fallback for users without Google or Apple. Google/Apple is great when available; email/password covers everyone else. Bootstrap from Order Envy when starting — get that agent to write an implementation doc we can port. See [AUTH.md](./AUTH.md).
- [ ] Maestro E2E happy path (dev/production build)
- [ ] Live Activity (iOS) + Android foreground service
- [ ] Deep links wired to push routes
- [x] **Copy from preset (custom theme)** — On Settings theme screen, add a "Copy from preset" button enabled only when a built-in preset is selected; copies that preset's header + accent hex into the custom fields and selects custom theme. Lets users start from a preset and tweak one color.
- [ ] Custom accent / header hex pickers (deferred)
- [ ] **Weather conditions during session** — When foreground GPS is on, sample weather alongside location (API TBD). Track at least: clear, rain, high winds, snow, fog; expand if data allows. Active session: weather icon on the right, day/night icon on the left, road category text centered (same row layout). Review + optional export line (like road category). Local samples only unless we decide to sync later.
- [ ] **Manual session entry** — Add an “Add manual entry” flow somewhere sensible (e.g. teen dashboard). For forgotten phone or dead battery: user enters start/end (and notes) without going through Active session. Treated as a no-GPS session — no location samples, no road category, no weather or other GPS-derived optional fields; user cannot enter those manually.
- [ ] **Overlapping session validation** — On save (initial Review save and save from edit), reject or flag sessions whose time range overlaps another session for the same teen. Validate locally (SQLite) and on the backend (Postgres) — offline mode may have sessions the other side hasn’t seen yet, so both layers needed. When overlap is detected, mark all involved sessions **except the oldest** as invalid until times are corrected; oldest stays valid by default.

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
