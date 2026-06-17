# MVP — First Release

Cross-platform (React Native + Expo) app for **teen permit supervised driving hours**. **Illinois first.**

**All MVP decisions:** [DECISIONS.md](./DECISIONS.md)  
**Screens:** [SCREENS.md](./SCREENS.md)  
**Session states:** [SESSION_LIFECYCLE.md](./SESSION_LIFECYCLE.md)

---

## Product summary (Phase 1)

The **teen** starts and stops practice sessions, reviews an editable summary, and **Save**s records locally with a content hash. The **dashboard** shows progress toward IL 50/10 hours, per-session **Edit**, and **Export all** as text/HTML.

No adult app, linking, push, or approval in Phase 1.

---

## Vision principles

- **Teen responsibility:** explicit start, review, save.
- **Safety:** no auto-start while driving.
- **Trust:** hash on save; approval provenance in Phase 2.
- **Offline-first:** local device is primary store ([DECISIONS.md](./DECISIONS.md)).

---

## Phase 1 scope

| In MVP | Post-MVP (Phase 2+) |
|--------|---------------------|
| Teen onboarding (no role screen) | Role selection, adult onboarding |
| Start / stop / review / save | Adult join, submit for approval |
| Hash on save | Adult approval + attestation |
| Day/night from start vs sunrise | Minute splits, road type, weather |
| 2-hour local nudge | Push notifications, GPS stall |
| Dashboard + edit + export all | PDF export, Live Activity |
| Mock auth (Expo Go) | Apple/Google + Supabase |
| Text/HTML export | Pixel-perfect IL PDF |

---

## Session lifecycle (summary)

1. Teen **Start** → active timer.
2. Teen **Stop** → **Review** (edit notes; see day/night).
3. **Save** | **Discard** | **Resume**.
4. Saved sessions on **Dashboard**; **Edit** reopens review; **Export all** shares log.

Details: [SESSION_LIFECYCLE.md](./SESSION_LIFECYCLE.md).

---

## Illinois

[ILLINOIS_RULES.md](./ILLINOIS_RULES.md) — 50 total hours, 10 night, 9-month holding period, text export fields.

---

## Technical stack

- React Native + Expo SDK 54, JavaScript
- Drizzle ORM + expo-sqlite (local)
- Supabase — Phase 2 ([BACKEND.md](./BACKEND.md))

---

## Out of scope (MVP)

Auto-start driving, adult flows, PDF export, pixel-perfect DSD X152, GPS stall, Live Activity, route co-present, supervisor license storage, teen nicknames, watch app.

See [WISHLIST.md](./WISHLIST.md).
