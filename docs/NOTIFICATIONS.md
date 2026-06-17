# Notifications

Decisions: [DECISIONS.md](./DECISIONS.md)

---

## Phase 1 (MVP)

| Event | Type | Recipients | Notes |
|-------|------|------------|-------|
| Session running ≥ 2 hours | **Local notification** | Teen | "Still driving?" — open app to stop or continue |
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

| Event | Recipients | Notes |
|-------|------------|-------|
| Session started | All linked adults | Wishlist: proximity filter |
| Adult claimed "I'm with the driver" | Other adults (info) | Active supervisor locked |
| Session submitted | Eligible approver(s) | |
| Session approved | Teen | |
| Session deleted | Active supervisor if joined | Optional |

After join, operational alerts → **teen + active supervisor** only.

Push payload shape and deep links: [CROSS_PLATFORM.md](./CROSS_PLATFORM.md).

In-app fallback: pending approval queue for adults; badge on Sessions tab.

---

## Platform notes

- iOS: request permission when scheduling first nudge (explain value).
- Android: channel `session_reminders` for Phase 1 nudge.
- Live Activity is local on start — not a push ([CROSS_PLATFORM.md](./CROSS_PLATFORM.md)).
