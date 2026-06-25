# Proximity — targeted push when adults are nearby

Decisions: [DECISIONS.md](./DECISIONS.md) · Notifications: [NOTIFICATIONS.md](./NOTIFICATIONS.md) · Wishlist: [WISHLIST.md](./WISHLIST.md#local-device-communication)

---

## Goal

When a teen submits a session, **linked adults who are physically nearby** should get the approval push first, instead of notifying every linked adult on the account.

Until background GPS and LAN discovery ship, proximity at submit uses:

| Source | Role |
|--------|------|
| **Teen location** | Last foreground GPS sample from the session, or a one-shot fix at submit |
| **Adult location** | If the adult app is **open (foreground)** on the dashboard, request current location when the teen submits. First time only, the OS shows its location permission dialog; after grant or deny, no in-app or OS prompt on later submits |
| **Supabase Realtime** | Teen broadcasts a location check; adults respond on `proximity:teen:{teenUserId}` |

Instructor GPS proximity (driving schools) is a **separate** concept — see [DRIVING_SCHOOLS.md](./DRIVING_SCHOOLS.md#approval-proximity-device-to-device).

---

## Push recipient rules (`session_submitted`)

Applied on the server (`send-approval-push`) and mirrored in `mobile/src/lib/proximityPush.js`:

1. **Closest nearby linked adult** from client (`nearbyAdultIds` — at most one id, intersected with links)
2. Else **all linked adults** (fallback — no teen location, no responses, or none within radius)

Client sends optional `nearbyAdultIds` on the push invoke. Server always intersects with active links; never trusts unlinked ids.

Withdraw / approve events unchanged (teen or approver targeted).

### Submit flow (teen client)

1. Resolve teen location (`resolveTeenSubmitLocation` — last session sample or one-shot GPS).
2. If no location → skip proximity collection; push falls back to all linked adults.
3. Broadcast on Realtime; wait **4.5s** for linked adults with the app open to respond.
4. Closest adult within **400 m** of the teen → single id in `nearbyAdultIds`; else omit (server pushes to all).

---

## Client modules

| Module | Role |
|--------|------|
| `proximityConfig.js` | Radius, wait time, channel/event names |
| `geo.js` | Haversine distance |
| `proximityRealtime.js` | Realtime broadcast request/response |
| `proximitySubmit.js` | Teen submit location + collect nearby adults |
| `useProximitySubmitResponder.js` | Adult dashboard listener + foreground GPS |
| `proximityPush.js` | `resolveSessionSubmitPushRecipients`, `listLinkedAdultIdsForTeen` |
| `approvalPush.js` | Passes `nearbyAdultIds` to edge function |
| `submissions.js` | Proximity collection before `notifyApprovalPush` |

### Supabase

Enable **Realtime** for the project (Broadcast). No RLS on channels — payloads use opaque user ids only; server still intersects with links.

### Dev testing (Expo Go)

```env
# Optional: skip Realtime and pretend one linked adult is nearby at submit
EXPO_PUBLIC_PROXIMITY_MOCK_ADULT_ID=<adult-user-uuid>
```

---

## Phased delivery

### Phase A — GPS + Realtime at submit (this branch)

- [x] Teen last-known / one-shot location at submit
- [x] Adult foreground location response via Realtime
- [x] Server + client recipient resolution (nearby + fallback)
- [x] Adult dashboard responder hook

### Phase B — background + LAN (dev build)

- [ ] Background GPS for adults — respond to submit Realtime from **local last-known fix** (see below); no server-side location store required for the on-demand path
- [ ] mDNS/BLE local discovery ([WISHLIST.md](./WISHLIST.md))
- [ ] Optional: session **start** push uses same filter ([NOTIFICATIONS.md](./NOTIFICATIONS.md))

### Backlog

- [ ] Adult **“I'm with the driver”** join UI → sets `activeSupervisorId` on session (schema exists; UI deferred)

---

## Privacy

- Realtime payloads: request id, session id, user ids, coordinates — only between linked accounts during submit
- No persistent server storage of proximity coordinates for this flow
- Adults who decline location or have the app closed are excluded from the nearby set; fallback notifies all linked adults
- In-app approval queue still works when push targets everyone

### Extending to background location

The Realtime request/response shape stays the same. The adult side injects location via `getLocation` in `subscribeAdultProximityResponder` — today foreground `getCurrentPositionAsync`, later:

| Approach | When | Server storage |
|----------|------|----------------|
| **On-demand (preferred)** | Background task or watch updates a **local** last-known fix; on teen submit broadcast, adult handler returns that cache even if app is backgrounded | None |
| **Foreground-only fallback** | Same as Phase A when background permission not granted | None |
| **Periodic upload** | Only if the app must respond while **fully killed** (no Realtime listener) | Would need stored last location — heavier privacy/ops cost; avoid unless required |

Phase B should not require changing teen submit flow or push recipient rules — only swap how the adult resolves `getLocation`.

### Known limitations (Phase A)

| Limitation | Behavior |
|------------|----------|
| **Responder scope** | Hook runs on `AdultHomeScreen` only — adults on other screens or before `linkedTeenIds` loads may miss the Realtime window → fallback push to all linked |
| **Submit latency** | ~4.5 s Realtime wait after RPC success blocks the approval push invoke (intentional for Phase A) |
| **Permission vs wait window** | First submit with `undetermined` location permission can show an OS dialog longer than the wait window → proximity skipped, all linked notified |
| **Foreground-only adults** | Backgrounded adults or those not subscribed miss the window → same fallback |
| **15-minute max age** | Stale outbox replays and old GPS samples skip proximity (`PROXIMITY_SUBMIT_MAX_AGE_MS`) |
