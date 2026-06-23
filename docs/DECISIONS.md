# Design Decisions (single source of truth)

**Last updated:** 2026-06-17

All product and MVP technical choices live here. Other docs link here instead of duplicating decision tables.

---

## MVP scope

| Topic | Decision |
|-------|----------|
| Primary user (MVP) | **Teen driver only** — no adult app surface until Phase 2 |
| Adult involvement (MVP) | **None** — no join, stop, push, or approval in Phase 1 |
| Illinois first | IL rules and text export; multi-state config layer for later |
| Accounts | **One person per account** always |
| Multi-teen | Adult may link many teens (Phase 2); teen sees **linked adults only**, never other teens |
| Pricing | **Direction:** small **paid App Store download** (consumer) + **driving-school subscription** (B2B listing). Amounts TBD before submission. See [DRIVING_SCHOOLS.md](./DRIVING_SCHOOLS.md#monetization-product). |

---

## Session flow (Phase 1)

| Topic | Decision |
|-------|----------|
| Start | Teen explicit tap only — no auto-start |
| Stop | Teen only |
| Review actions | **Save**, **Discard**, **Resume** |
| Save | Persists `saved` session + `requestHash`; Phase 2 label → **Submit for approval** |
| Discard | Hard-delete **draft** only |
| Delete saved | Soft-delete via `deletedAt` |
| Edit saved | Reopen → `draft` → re-Save (new hash) |
| Min duration | Warn if &lt; 5 min; **allow Save** |
| Active nudge | **2-hour** elapsed local notification (no GPS stall in MVP) |
| Stale active session | If `active` **&gt; 24 hours** on next app open → force to `draft`, notify teen |
| Dashboard | Progress 50/10; session list; **Edit** per row; **Export all** (text/HTML) |

---

## Day / night (MVP)

| Topic | Decision |
|-------|----------|
| Classification | **Whole session** bucketed by **start time** vs sunrise/sunset |
| Location (MVP) | **No permission** — device timezone → timezone centroid lat/lon for SunCalc |
| Split minutes | Post-MVP (partial day/night, road type, weather) |

---

## Data, hash, export

| Topic | Decision |
|-------|----------|
| Storage | **Local-first** — device is primary; server not user backup |
| ORM | Drizzle + expo-sqlite |
| Hash | **On Save** in MVP (`schemaVersion: 1`); no approval record until Phase 2 |
| Export (MVP) | Plain **text/HTML** share sheet; PDF post-MVP |
| Soft-delete | Sessions: `deletedAt`; submissions/approvals immutable when present |
| Sign out | Clear token only; **user-scoped rows** retained |
| Delete all data | Settings → hard wipe current user's local rows |
| Encryption at rest | **Post-MVP** — encrypted SQLite + SecureStore key (see [WISHLIST.md](./WISHLIST.md)) |

---

## Onboarding (Phase 1 exception)

Full flow: [ONBOARDING.md](./ONBOARDING.md). MVP overrides:

| Topic | Decision |
|-------|----------|
| Role selection | **Hidden** — teen-only app |
| Linking gate | **Deferred** — profile → dashboard |
| Teen screens | Name, DOB, state (IL), **permit issue date (required)** |
| Mock auth | Expo Go: mock sign-in → local user (Phase 2: real Apple/Google + Supabase) |

---

## Phase 2 (confirmed direction, not MVP)

| Topic | Decision |
|-------|----------|
| Backend | Supabase (Postgres, RLS, Edge Functions) |
| Linking | 6-digit code, 24 hr, single-use |
| Save → Submit | Rename Save; adult approval + attestation |
| Approval | Joined adult if joined; else any linked adult; no write-in names |
| Withdraw submission | Teen may withdraw to draft before approve |
| Push | FCM/APNs via Expo Push API |
| Lock screen | Live Activity (iOS) + foreground service (Android) |
| Server data retention | Default **2 years** for synced records; user-configurable UI post-MVP ([WISHLIST.md](./WISHLIST.md)) |
| Adult multi-teen context | One linked teen → static label with teen name (no switcher). Two or more → show who is selected and an easy control to switch (dropdown or equivalent). Adult dashboard content (approvals, session presence) scopes to the selected teen. Deferred until adult dashboard is fleshed out — not part of the linking-only slice |
| Instructor + driving schools | Third role; school subscription listing; proximity instructor push; parent backup approve without push. Full spec: [DRIVING_SCHOOLS.md](./DRIVING_SCHOOLS.md) |

---

## Open (pre-store only)

| Topic | Notes |
|-------|-------|
| Pricing | Same as MVP row — paid download + school subscription; details in [DRIVING_SCHOOLS.md](./DRIVING_SCHOOLS.md) |

---

## Change log

| Date | Change |
|------|--------|
| 2026-06-22 | Instructor role + driving schools backlog; paid download + school subscription; qualifying signup = instructor-approved session |
| 2026-06-17 | Adult multi-teen dashboard: static name when one teen linked; picker/switcher when multiple (deferred past linking slice) |
| 2026-06-17 | Cherry-pick from planning archive: stale-session guardrail, retention default, multi-teen open item |
| 2026-06-07 | Initial consolidated decisions from planning sessions |
