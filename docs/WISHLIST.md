# Wishlist — Post-MVP

Items here are **not** committed for first release. Promote to [MVP.md](./MVP.md) when scoped for a sprint.

## Session UX

- **Active timer:** show day/night classification (emoji or icon) while driving so the teen sees what the session counts toward before stopping.
- **Edit start/end times:** allow correcting `startedAt` / `endedAt` (forgot to tap Start/Stop). Consider teen-only, adult-only, or either — Phase 2+ with approval flows. Recompute duration, day/night, and hash on save.
- **Color themes:** app-wide light/dark themes beyond the driving timer screen.
- Configurable session duration nudge threshold (currently hardcoded 2 hours).
- Apple Watch: timer + stop (evaluate safety implications).
- Driving focus mode: guidance to use system Do Not Disturb.

## Supervisor qualification

- Verify adult meets state supervisor rules (age, license tenure, relationship where applicable).
- Store only **`supervisorVerified: boolean`** (default `false`).
- **Do not** persist license number or verification PII on device or server.

## Export and forms

- **State-aware text export:** header, totals, and field labels should follow the user's selected `stateCode` (MVP export still says "Illinois" / IL 50–10 everywhere).
- Pixel-perfect per-state PDFs; **IL DSD X152** as first official layout target.
- Pre-filled official DMV forms for states that publish templates (cf. Moda: IN, NC, NJ, NV, NY, OH, PA).

## Location and automation

- GPS-based **stall detection**: no movement ≥ N minutes (default 10, configurable) → prompt teen: **End Session** | **Still Driving**. Requires background location permission, foreground service on Android, and a dev build. Cannot be done in Expo Go.
- Auto day/night classification: use device location + sunrise/sunset API to split session minutes at the boundary. Replaces manual day/night tag on review screen.
- Geofence **home** → end-session hint (with confirmation).
- Suggest **trimmed end time** at last movement when user forgot to stop.
- Weather API for conditions tag.
- In-town vs highway from GPS / road graph.
- Co-present along **route** (legal/privacy review required).

## Driving heat map

Show a map visualizing where the teen has driven across all sessions. Parents can use this to identify areas already covered and plan new routes or environments (highway, downtown, rural, night driving, etc.).

- **All-sessions view:** cumulative heat map overlay on a standard map, showing roads/areas driven most frequently across the full log history.
- **Single-session view:** route replay or path display for one selected session.
- Requires GPS route recording during sessions (post-MVP — see Location and automation above). GPS points would be stored locally on-device; the heat map is rendered client-side from local data.
- Privacy consideration: GPS route data should stay on-device by default. If cloud backup is added, it must be opt-in with clear disclosure.
- Heat map density could differentiate by condition (day vs night, road type) using color or opacity layers.

## Local device communication

- Investigate mDNS/Bonjour or Bluetooth LE for adult join when physically nearby. Would remove push delivery dependency for the "I'm with the driver" step and naturally satisfy proximity requirement. Requires native module work beyond Expo Go.

## Adult stop

- Allow joined adult to stop the session (with confirmation dialog).
- Requires resolving stop-race-condition: if teen and adult tap simultaneously, teen wins.
- Teen is notified to complete review.
- Requires clear UX to prevent accidental adult stops.

## Notifications

- Push session start only to adults within **proximity** of teen; fallback to all linked.
- Configurable quiet hours per adult.
- Geofence "arrived home" local notification.

## Multi-state rules engine

The app is designed to expand to all 50 US states via a data-driven rules configuration per state, rather than hardcoded IL-specific logic. MVP focuses on IL only, but the architecture should be built with this in mind.

**What varies by state:**
- Total supervised hours required
- Night hours required (definition of "night" also varies)
- Permit holding period (minimum months before road test)
- Minimum age for permit
- Eligible supervisor requirements (age, license type, relationship)
- Curfew restrictions for permit holders
- Official log form format and required fields

**Design intent:**
- State rules live in a configuration object/file, not scattered through business logic
- Adding a new state means adding a config entry, not modifying core code
- The dashboard, progress calculations, export fields, and curfew warnings all read from the active state's config
- Requires research to enumerate all 50 states' rules and distill them into a consistent schema — this research is pre-work for the multi-state feature, not part of MVP

**Investigation needed before building:**
- Survey all 50 states' GDL requirements
- Identify edge cases where states differ in ways the config schema doesn't cover
- Determine which states publish official fillable PDF logs (these need pixel-perfect export support)

## Integrity

- HMAC or server signature on `requestHash` at approve for PDF footer.
- Append-only audit log for disputes.
- **Server data retention:** default **2 years** for synced records (long enough for typical DMV audit windows after licensure); user-configurable retention UI post-MVP.

## Local data protection

- **Encrypted SQLite at rest** — encryption key in SecureStore, tied to auth identity.
- **Local-first:** device is the primary store; server sync for coordination only, not user-facing backup.
- MVP uses user-scoped rows + "Delete all my data on this device" ([DECISIONS.md](./DECISIONS.md)).

## Platform and growth

- Parent read-only web portal.
- Milestones (25/50/75/100%) — optional, configurable to avoid notification fatigue.
- Skills checklist aligned with state parent-teen driving guides.
- Multi-teen per parent household.
- Family Sharing / store purchase model decisions.
