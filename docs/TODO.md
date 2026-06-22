# Bound for the Road — Project TODO

**Last updated:** 2026-06-22 · **App:** 1.5.9 · **Phase:** 2

**Decisions:** [DECISIONS.md](./DECISIONS.md) — do not duplicate here.  
**Screens:** [SCREENS.md](./SCREENS.md) · **Testing:** [TESTING.md](./TESTING.md)  
**Supabase:** apply migrations per [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

---

## How to use this file

- `[ ]` not started · `[~]` in progress · `[x]` complete

---

## Next up (priority)

### 1. Auth + proximity (candidate)

- [ ] **Email + password sign-up / sign-in** — Supabase email auth for users without Google/Apple. See [AUTH.md](./AUTH.md).
- [ ] **Nearby linked adults** — detect supervising adult on local network (mDNS/BLE per [WISHLIST.md](./WISHLIST.md)) to target push for session submit / join without notifying every linked adult

### 2. Location — background (after native dev build)

- [ ] Background track, stall detection, route heat map — dev client + Live Activity / Android foreground service

---

## Open (pre-store)

| Question | Notes |
|----------|-------|
| Pricing | TBD |

---

## Phase 2 — Dev build + Supabase (backlog)

- [ ] **iOS development build** — Apple Developer enrollment; see [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md#development-build-bound-for-the-road-branding)
- [ ] Sign in with Apple (after iOS dev build)
- [ ] **Email + password sign-up / sign-in** — Supabase email auth as fallback for users without Google or Apple. Google/Apple is great when available; email/password covers everyone else. Bootstrap from Order Envy when starting — get that agent to write an implementation doc we can port. See [AUTH.md](./AUTH.md).
- [ ] Maestro E2E happy path (dev/production build)
- [ ] Live Activity (iOS) + Android foreground service
- [ ] Deep links wired to push routes
- [ ] Custom accent / header hex pickers (deferred)
- [ ] **Weather conditions during session** — When foreground GPS is on, sample weather alongside location (API TBD). Track at least: clear, rain, high winds, snow, fog; expand if data allows. Active session: vertical stack — day/night icon, weather icon, road category label (heaviest, bottom). Review + optional export line (like road category). Local samples only unless we decide to sync later.

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
