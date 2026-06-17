# MVP — First Release

## Product summary

Cross-platform (React Native + Expo) app for families tracking **supervised permit driving hours**. The **teen** starts and closes practice sessions; **one linked adult** joins in progress via **“I’m with the driver”**; **approval binds to a frozen hash** of the submitted record. **Illinois** rules and export first.

## Vision principles

- **Teen responsibility:** explicit start, review, submit for approval.
- **Safety:** no auto-start while driving; lock screen shows timer/stop only—not a full summary.
- **Trust:** optional approval with full provenance; hash defines exactly what was approved.
- **Offline-first:** works with spotty signal and limited data plans.

## Platforms

- iOS and Android (Expo).
- IL rules and IL-close export in v1; multi-state engine later.

## Accounts

- **Required:** teen account (13+) and one or more linked adult accounts from onboarding.
- **Auth:** Sign in with Apple / Google (email optional later). Minimal backend for identity, linking, push, sync.
- **No** storing driver license numbers in MVP (see [WISHLIST.md](./WISHLIST.md) for qualification flag only).

## Roles


| Role                    | Capabilities                                                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Teen**                | Start session; stop (opens app for review); resume; confirm draft; submit for approval; delete session (with confirm) any time; edit → re-submit per hash rules.                 |
| **Joined adult**        | Tap **“I’m with the driver”** on active session; view live stats; stop session (with confirm). Only **teen + joined adult** may stop while active.                               |
| **Other linked adults** | Notified on start; cannot stop until one adult joins. May approve submitted hash if product allows any linked adult (default: active supervisor or any linked—confirm at build). |


## Multi-parent

- One teen may link to **any number** of adults.
- State rules may limit who counts as an **eligible supervisor** for official hours—warn or filter on export, do not block linking.
- **Post-MVP:** proximity-filtered push at session start; MVP pushes all linked adults, then narrows alerts to **joined adult + teen** after “I’m with the driver.”

## Session lifecycle (summary)

See [SESSION_LIFECYCLE.md](./SESSION_LIFECYCLE.md).

1. Teen **Start** → ACTIVE.
2. Push linked adults; first **“I’m with the driver”** → active supervisor.
3. During drive: lock screen / notification shows elapsed time + **Stop** (no summary on lock screen).
4. **Stop** (teen or joined adult) → app opens for teen **review** (teen stop unlocks/opens app).
5. Review: **Confirm** | **Resume driving** | **Delete** (destructive confirm).
6. After Confirm: **Submit for approval** → `requestHash` created.
7. Adult: summary + one-tap **Approve**; if not joined, require supervisor-in-vehicle name or **“I was with them.”**
8. Edit after approval → new submit → new hash → **re-approval required**.

## End flows

### Teen stop (two steps)

1. **Stop** — pauses timer; launches/opens app (do not show summary in Live Activity).
2. **Review** — time, day/night, tags; **Confirm** / **Resume** / **Delete** (confirm delete).

### Adult stop

- Confirm dialog → session ends → teen notified to complete review in app.
- Teen does **not** need to confirm the adult’s stop action.

### Stall detection

- Default **10 minutes** without meaningful movement → prompt: **End session** | **Still driving**.
- Configurable in settings.
- Parking practice: **Still driving** resets timer (MVP).

### Geofence

- **Wishlist / soft post-MVP:** “arrived home” hint combined with stall logic; optional suggested end time on review screen.

## Approval and hash

See [APPROVAL_AND_HASH.md](./APPROVAL_AND_HASH.md).

- Hash **only** when teen submits for approval (`requestHash`).
- Approval references `requestHash` only.
- Multiple approvals on same hash are redundant (idempotent OK).
- Teen may **delete** a session any time (confirm)—pre- or post-approval.

## Display and export

- Dashboard may show progress from **all** completed sessions.
- Filter: **All** | **Approved only** (list and export).
- Export MVP: **IL-close** PDF (all fields IL expects); pixel-perfect DSD X152 later.
- Disclaimer: not legal advice; verify with IL SOS.

## Tags and automation (MVP)

- **Auto:** day/night from time / sunset logic.
- **Manual:** qualifiers for requirements (road type, etc.—define for IL in [ILLINOIS_RULES.md](./ILLINOIS_RULES.md)).
- **Not MVP:** weather API, highway vs in-town GPS, route co-present.

## Notifications

See [NOTIFICATIONS.md](./NOTIFICATIONS.md).

## Data and offline

See [OFFLINE_SYNC.md](./OFFLINE_SYNC.md).

## UI

- Simple, clean, easy to understand over flashy branding.
- Teen-facing copy emphasizes ownership of logging.

## Out of scope (MVP)

- Auto-start driving detection.
- Pixel-perfect state PDFs (IL-close generic only).
- Route-based co-present verification.
- Supervisor license verification storage.
- Teen nicknames for adults in UI.
- Global notification suppression.
- Watch app.

## Technical stack

- React Native + Expo, JavaScript.
- Local DB (e.g. SQLite) + minimal backend API.
- Push via FCM + APNs.

## Open implementation decisions

- Can teen **withdraw** submission before approve (back to draft)? Recommend: yes.
- Soft-delete vs hard-delete audit trail for deleted sessions.
- Which linked adults may approve: active supervisor only vs any linked adult.

