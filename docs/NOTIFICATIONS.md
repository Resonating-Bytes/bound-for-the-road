# Notifications

## MVP policy

| Event | Recipients | Notes |
|-------|------------|-------|
| Session started | All linked adults | Wishlist: proximity filter |
| Adult tapped “I’m with the driver” | Other adults (informational); teen (optional) | Active supervisor locked |
| Stall / still driving? | Teen + active supervisor | Default 10 min idle |
| Adult ended session | Teen | Open app to review |
| Submitted for approval | Active supervisor (default) | Or all linked—TBD |
| Approved | Teen | |
| Session deleted | Active supervisor if was joined | Optional |

After **join**, only **teen + active supervisor** receive operational alerts (stall, stop-related)—not all linked adults.

## Push payload (minimal)

```json
{
  "type": "session_started | session_claimed | session_stopped | stall_prompt | approval_requested | approved",
  "sessionId": "uuid",
  "teenUserId": "uuid",
  "deepLink": "teendriver://..."
}
```

## In-app fallbacks

If push disabled: badge on Sessions tab; pending approval queue for adults.

## Platform notes

- iOS: request permission after value explanation (onboarding).
- Android: notification channels — `session_active`, `approval`, `reminders`.
- Live Activity is not a push; started locally on session start.

## Wishlist

- Proximity-filtered start notification.
- Geofence “arrived home” local notification to teen + supervisor.
