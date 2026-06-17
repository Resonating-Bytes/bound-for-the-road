# TeenDriver — Project TODO

This file tracks design, documentation, and implementation work. Update it at the start and end of each session. New sessions should read this file first to understand current state.

**Last updated:** 2026-06-07
**Current phase:** Ready for implementation. All design decisions resolved. All docs complete.

---

## How to use this file

- `[ ]` = not started
- `[~]` = in progress or partially done
- `[x]` = complete
- Add a date and short note when marking complete

---

## 1. File copy status

Copy all files below from outputs into your repo root. These are the authoritative versions.

```
README.md
MVP.md
SESSION_LIFECYCLE.md
APPROVAL_AND_HASH.md
NOTIFICATIONS.md
OFFLINE_SYNC.md
WISHLIST.md
DATA_MODEL.md
ILLINOIS_RULES.md
DEVELOPMENT_SETUP.md
CROSS_PLATFORM.md   ← new
AUTH.md             ← new
BACKEND.md          ← new
ONBOARDING.md       ← new
TODO.md             ← this file
```

---

## 2. Documentation — all complete ✓

| File | Status | Notes |
|------|--------|-------|
| `MVP.md` | `[x]` | Core scope, roles, session flow, decisions |
| `SESSION_LIFECYCLE.md` | `[x]` | State machine, flows, who can do what |
| `APPROVAL_AND_HASH.md` | `[x]` | Hash integrity, attestation model, schema versioning |
| `NOTIFICATIONS.md` | `[x]` | Push events, Android channels, build-phase reliability |
| `OFFLINE_SYNC.md` | `[x]` | Outbox queue, conflict rules, backend requirements |
| `WISHLIST.md` | `[x]` | Post-MVP features including heat map and multi-state engine |
| `DATA_MODEL.md` | `[x]` | All entities, ORM approach, schema versioning |
| `ILLINOIS_RULES.md` | `[x]` | IL GDL rules, day/night manual tag, export fields |
| `DEVELOPMENT_SETUP.md` | `[x]` | Expo Go phases, ORM choice, capability matrix |
| `CROSS_PLATFORM.md` | `[x]` | iOS vs Android matrix, auth, Live Activity, EAS profiles |
| `AUTH.md` | `[x]` | Sign in with Apple + Google, token flow, SecureStore, Expo Go mock |
| `BACKEND.md` | `[x]` | Supabase confirmed, endpoints, RLS rules, cost/scale |
| `ONBOARDING.md` | `[x]` | Role selection, teen/adult screens, invite code linking |
| `README.md` | `[x]` | Full doc index, reading order, stack summary |

---

## 3. All design decisions resolved ✓

| Decision | Resolution |
|----------|-----------|
| ORM/DB library | Drizzle ORM + expo-sqlite |
| Backend platform | Supabase (confirmed) |
| Soft-delete policy | Sessions: soft-delete with `deletedAt`. Submissions + approvals: retained as immutable records. Outbox: hard-delete after syncing. |
| Adult stop in MVP | Removed. Teen-only stop. Post-MVP. |
| Stall detection in MVP | Removed. 2-hour time nudge instead. GPS stall post-MVP. |
| Day/night classification | Manual tag in MVP. Auto-sunset post-MVP. |
| Confirm vs Submit step | Single "Submit for Approval" on review screen. |
| Export format for MVP | Plain text / HTML. PDF post-MVP. |
| Approval eligibility | Joined adult only if joined; any active linked adult otherwise. No write-ins. |
| Approval attestation | Explicit attestation UI required. Equivalent to signing a physical log. |
| Session min duration | 5 minutes. Warn and recommend delete if shorter. |
| Session max / nudge | 2-hour elapsed time triggers local notification nudge. |
| Schema versioning | schemaVersion: 1 in all canonical payloads. Bump requires migration plan. |
| Withdraw submission | Teen can withdraw submitted session back to draft before approval. |
| Linking mechanism | Teen generates 6-digit code, 24-hr expiry, single-use. Adult enters code. |
| Multi-state architecture | Data-driven rules config per state. IL hardcoded for MVP; config layer built to accommodate all 50 states. Research needed before building. |
| Heat map | Post-MVP. Requires GPS recording. Route data stays on-device by default. |
| Data retention | Default 2 years on server. Configurable retention UI is post-MVP. |
| Google Sign-In library | Defer to Phase 2. expo-auth-session for Expo Go prototyping. |

---

## 4. Open questions (genuinely unresolved — decide before store submission)

| Question | Notes |
|----------|-------|
| Multi-teen households | One adult linked to multiple teens. Works with current data model (links table is many-to-many). Confirm whether dashboard handles this in MVP or post-MVP. |
| Pricing / monetization | Free? One-time IAP? Subscription? Must decide before store submission. |

---

## 5. Implementation — MVP build order

Start here when ready to build. Work through phases in order — each depends on the previous.

### Phase 1 — Expo Go (no native modules needed)
- [ ] Install Drizzle ORM + expo-sqlite (`npm install drizzle-orm expo-sqlite`)
- [ ] Copy `src/db/schema.js`, `src/db/migrations.js`, `src/db/client.js`, `src/db/queries.js` into mobile project (starter files written — see prior session outputs)
- [ ] Add `src/utils/time.js` (generateId, nowISO helpers used by queries.js)
- [ ] Add `src/utils/hash.js` (SHA-256 canonical payload builder)
- [ ] Wire `initDb()` into App.jsx at startup
- [ ] Auth UI screens (Sign in with Apple / Google — **mocked** in Expo Go, real in Phase 2)
- [ ] Role selection screen
- [ ] Teen onboarding (name, DOB, state, permit issue date)
- [ ] Adult onboarding (name)
- [ ] Invite code generation screen (teen)
- [ ] Invite code entry screen + validation (adult)
- [ ] Linking confirmation screen
- [ ] Navigation structure (tab bar or stack — teen view vs adult view)
- [ ] Session start screen
- [ ] Active session screen (elapsed timer, "I'm with the driver" button for adult)
- [ ] Stop → Review screen (manual day/night tag, duration display)
- [ ] Duration validation warning (< 5 min)
- [ ] Submit for approval (hash computation, write to local DB)
- [ ] 2-hour local notification nudge (expo-notifications)
- [ ] Approval screen (session summary, attestation language, Approve button)
- [ ] Withdraw submission (submitted → draft)
- [ ] Session list / dashboard (progress bars: X/50 hrs, X/10 night hrs)
- [ ] Filter: All sessions vs Approved only
- [ ] Plain-text / HTML export (share sheet)
- [ ] Offline outbox queue (enqueue on every write, no server yet)
- [ ] Curfew warning on review screen (IL only)
- [ ] Settings screen (edit name, permit date, manage links, sign out)
- [ ] All state machine transitions tested on iPhone + Android emulator

### Phase 2 — Dev build (native modules)
- [ ] Supabase project created and configured
- [ ] Supabase schema + RLS policies deployed (mirror local schema)
- [ ] Real Sign in with Apple (iOS) wired to Supabase auth
- [ ] Real Google Sign-In wired to Supabase auth
- [ ] Push notifications via Expo Push API (FCM + APNs)
- [ ] Supabase Edge Function for push relay
- [ ] Sync outbox connected to backend endpoints
- [ ] iOS Live Activity (lock screen timer + stop button)
- [ ] Android foreground service (persistent notification timer)
- [ ] Deep links configured (iOS + Android)
- [ ] Android notification channels configured
- [ ] All push flows validated on real devices

### Phase 3 — TestFlight / Play internal
- [ ] All push flows tested end-to-end (session start → adult notified → join → submit → approve)
- [ ] Cross-device sync tested (teen phone + adult phone, both online and offline)
- [ ] Export reviewed against IL DSD X152 field list
- [ ] Beta user testing with real families

### Phase 4 — Store release
- [ ] App Store / Play Store metadata and screenshots
- [ ] Privacy policy (data stored, retention, location data future use)
- [ ] IL disclaimer reviewed
- [ ] Pricing / monetization decided
- [ ] EAS production build + submission

---

## 6. Notes for implementation agents

When starting implementation, read docs in this order:
1. `README.md` — orientation
2. `MVP.md` — scope and principles
3. `SESSION_LIFECYCLE.md` — the core state machine
4. `AUTH.md` — auth before any screens
5. `ONBOARDING.md` — first screens after auth
6. `DATA_MODEL.md` + `APPROVAL_AND_HASH.md` — before any DB work
7. `OFFLINE_SYNC.md` + `BACKEND.md` — before any sync or server work
8. `CROSS_PLATFORM.md` + `DEVELOPMENT_SETUP.md` — before any native module work

Key constraints to keep in mind:
- Phase 1 must work entirely in **Expo Go** — no native modules
- Auth is **mocked** in Phase 1; real auth is Phase 2
- The backend is **not** the source of truth — devices are
- All DB writes go through `src/db/queries.js` — no raw SQL in components
- Every session write that needs to reach the server goes through the **outbox queue**
- The canonical payload for hashing must exactly match the spec in `APPROVAL_AND_HASH.md`
