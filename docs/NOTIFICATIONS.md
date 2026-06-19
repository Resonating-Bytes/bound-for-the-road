# Notifications

Decisions: [DECISIONS.md](./DECISIONS.md)

---

## Phase 1 (MVP)

| Event | Type | Recipients | Notes |
|-------|------|------------|-------|
| Session running ≥ 2 hours | **Local notification** | Teen | "Still driving?" — open app to stop or continue |
| Active session ≥ 24 hours on app open | **Local notification** + Review screen | Teen | Auto-stop to draft; review and save or discard |
| Session stop / save / discard | Cancel scheduled nudge | — | Cancel by session id |

- Implemented with `expo-notifications` (local schedule only).
- No push, no adult notifications in MVP.
- Threshold configurable later via `settings` (default 2 hours).

### Local nudge payload

```json
{
  "type": "session_duration_nudge",
  "sessionId": "uuid"
}
```

---

## Phase 2 — push matrix

| Event | Recipients | Status |
|-------|------------|--------|
| Session started | All linked adults | Wishlist: proximity filter |
| Adult claimed "I'm with the driver" | Other adults (info) | Not implemented |
| Session submitted | Eligible approver(s) | **Implemented** — `send-approval-push` → linked adults |
| Session approved | Teen | **Implemented** — `send-approval-push` → teen |
| Session deleted | Active supervisor if joined | Optional |

### Approval push (implemented)

- Teen submits → Edge Function notifies linked adults (`pending_approval` payload).
- Adult approves → Edge Function notifies teen (`session_approved` payload).
- Tap opens **Approve session** (adult) or **Dashboard** (teen) via `navigationRef`.
- Pull-to-refresh and screen focus remain the in-app fallback ([DECISIONS.md](./DECISIONS.md)).

After join, operational alerts → **teen + active supervisor** only.

### Push reliability by build type

| Build type | Push reliability |
|------------|------------------|
| Expo Go | Unreliable / limited — do not validate push flows here |
| Dev build (`expo-dev-client`) | Full push via FCM/APNs with your bundle ID |
| TestFlight / Play internal | Full push, production-like — **validate push here** |
| Production | Full push |

Push flows (session start, approval request, approved) are not considered validated until tested in a dev build or TestFlight.

### In-app fallback (always required)

Push is never guaranteed. Every notification event must also update in-app state:

- Badge on Sessions tab for pending approvals (adult view).
- "Awaiting approval" on session list (teen view).
- Adults see an **Approvals** queue in-app, not push alone.

Push payload shape and deep links: [CROSS_PLATFORM.md](./CROSS_PLATFORM.md).

---

## Platform notes

- iOS: request permission when scheduling first nudge (explain value).
- Android: channel `session_reminders` for Phase 1 nudge.
- Live Activity is local on start — not a push ([CROSS_PLATFORM.md](./CROSS_PLATFORM.md)).
