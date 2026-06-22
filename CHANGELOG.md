# Changelog

All notable changes to the mobile app and its Supabase backend are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
App version uses [Semantic Versioning](https://semver.org/) (`mobile/app.json`).

## [1.5.8] - 2026-06-22

### Added

- Client-only session overlap validation on teen device; invalid sessions grouped at top of dashboard with fix-before-approval hints
- Inbound teen session sync (`pullAndMergeTeenSessions`) on dashboard focus and before outbox flush; overlap recompute on merged set
- Review overlap banner with tap-to-edit conflicting sessions; submit disabled while times conflict
- Server sync watermark RPCs (`teen_sync_watermark`, `submit_session_for_approval`, `approve_submission_synced`, `withdraw_submission_synced`); client resyncs and retries on `sync_stale`
- Supabase migrations `20260626120000`–`20260627120000` (interim), `20260628120000` (remove server `time_invalid`), `20260629120000` (sync watermark)
- Local SQLite `time_invalid` column (schema v8) for overlap flag; excluded from progress and remote push

### Changed

- Invalid sessions never enqueued or sent to server; adult no longer sees invalid-session UI or approval blocks
- Outbox flush pulls and merges teen data before replaying `session_submitted`
- Adult approve/decline flush outbox first and send client sync watermark with each write
- Second-adult invite flow polls link count on mount and redirects when a new link appears
- `MIN_BACKEND_REVISION` → `20260629120000`; four new backend capability strings

## [1.5.7] - 2026-06-21

### Added

- Manual session entry from Dashboard — single Review screen with start/end, notes, save or discard (no GPS-derived fields)
- Outbox replay for approve, decline, and withdraw when offline or on network failure

### Changed

- Active session stats stack vertically (day/night, then road category when tracking)
- Manual entry hint above submit; location caveat only when foreground permission is granted; Resume hidden for manual drafts
- TODO: overlapping session validation promoted to next up; sync local ↔ remote queued first in backlog

## [1.5.6] - 2026-06-21

### Added

- Foreground GPS sampling during active session (local only); live road category and day/night on Active screen
- Road category breakdown on Review (local/highway minutes); Insufficient data when coverage is below threshold
- Export all dialog on Dashboard with optional road category lines; preference persisted in settings storage
- Copy from preset on Appearance — copies preset header and accent into custom theme fields
- Header border color derived from background luminance (presets and custom themes)
- Local SQLite: `session_location_samples`, `highway_road_minutes` (migration v7)
- Supabase: `sessions.night_minutes` for IL night-hour progress (`20260625120000`)

### Changed

- Mixed road category summary shows two lines (local then highway) without a Mixed prefix; single-category sessions show Local or Highway only
- Active session hides road category when location is not tracking; day/night icon centers when alone

### Fixed

- Road category coverage uses millisecond gaps so ~5s GPS samples count toward the 50% threshold
- Lead-in and tail excluded symmetrically from the coverage gate (inter-sample gaps only)

## [1.5.5] - 2026-06-21

### Added

- Editable start/end times and notes on draft review and Edit session; duration and day/night recomputed from times
- `DateTimePickerField` — full-row tap target, iOS popover anchored to the field, tap-outside to dismiss
- Shared `useKeyboardScrollAlign` hook for Review notes and Appearance custom color fields

### Changed

- Header theme presets refreshed with curated accent colors; Espresso, Royal Plum, Cyber Lime, and Ultraviolet replace prior neutrals/vibrant entries
- Night practice progress bar uses theme accent (same as total practice)
- Neutrals theme picker order: Slate before Charcoal

## [1.5.4] - 2026-06-21

### Added

- Custom header and accent colors on Appearance — hex inputs, swatch preview, values persist per user when switching presets

### Changed

- Appearance custom color editor uses compact side-by-side layout aligned with preset groups
- Keyboard-aware scroll on Appearance centers hex fields while typing; bottom padding animates on dismiss

## [1.5.3] - 2026-06-21

### Added

- Offline outbox sync: queued session submits replay when online; About shows pending count and sync status
- Dashboard refreshes session tile labels when background sync completes

### Changed

- Teen dashboard loads saved sessions from local SQLite first, then enriches from remote
- Pending offline submit label reads "Saved on device — pending sync"

### Fixed

- Offline submit no longer throws on network failure; notes stick when editing a saved session offline
- Outbox sync uses auth user id for remote upsert (RLS); sync spinner clears when flush finishes
- Settings and Edit session back use stack pop instead of dashboard reset (correct slide animation)
- Linked account nickname field preserves spaces while typing (length cap only)

## [1.5.2] - 2026-06-21

### Changed

- Adult dashboard shows "You approved" when the viewer approved from the car; other-adult sessions still name the supervisor
- Review session uses standard header back navigation for saved sessions
- Linked account details: "Account details" title, nickname hint copy, simpler save/remove spacing
- Docs describe versioning structure without snapshot values; CI requires CHANGELOG only for backend PRs

### Fixed

- Legal and supervisor name fields trim whitespace on submit only (spaces while typing preserved)

## [1.5.1] - 2026-06-20

### Added

- Explicit compatibility states (`compatible`, `update_required`, `capability_missing`, etc.)
- Central RPC contract doc (`docs/RPC_CONTRACT.md`) and operator release checklist
- `requiredBackendCapabilities.json` as single source for capability strings; CI validates JSON vs SQL
- Compatibility contract CI job; stricter changelog heading/date/bullet validation
- Fail-closed compatibility policy for production builds when RPC check errors (dev remains fail-open)

### Changed

- `get_app_compatibility` migration expands capability list (push token, account deletion, nicknames)
- `MIN_BACKEND_REVISION` → `20260624120000`
- Removed dead `AGENT_VERSIONING.md` links from docs index

### Fixed

- `send-approval-push` edge function entrypoint renamed to `index.ts` so Supabase CLI 2.x deploy finds the default entrypoint
- Edge deploy workflow pins Supabase CLI `2.107.0` instead of `latest` to avoid GitHub API gateway timeouts during setup

## [1.5.0] - 2026-06-17

### Added

- `display_name` on user profiles; required alongside legal name in onboarding and Settings
- Per-viewer nicknames for linked accounts (`user_aliases` table + detail screen)
- Linked account list shows casual label plus legal name; chevron opens nickname editor
- Supabase migration `20260623120000`: `display_name`, `user_aliases`, `upsert_user_alias`, `delete_user_alias`
- Local SQLite v3: `display_name` column and `user_aliases` table for offline nickname sync

### Changed

- Approve screen: two presence options — in-car approver or another supervising adult (legal name required)
- Approved session labels use supervisor name snapshot from the approval record
- Push notifications use nickname → display name for linked users (`send-approval-push`)
- `MIN_BACKEND_REVISION` → `20260623120000`

## [1.4.0] - 2026-06-22

### Added

- Settings sub-pages (Profile, Appearance, About, Linked accounts)
- `delete_my_account` RPC for permanent account deletion with double confirmation

### Changed

- Settings hub with chevron rows; sign out on hub; role on Profile
- About screen (formerly App & updates); accent preview on Appearance
- Onboarding role buttons spaced and narrowed

### Fixed

- Adult link screen requires full 6-digit invite code before submit

## [1.3.0] - 2026-06-19

### Added

- Per-teen adult switcher with persisted selection and filtered session lists
- `register_push_token` RPC and unique push token index

### Changed

- Chevron session rows; edit/discard actions on ReviewSession detail
- Teen discard copy; short names in list tiles and push notifications
- `send-approval-push` edge function converted from TypeScript to JavaScript

### Fixed

- Revision-requested sessions open straight to edit; ReviewSession render loop
- Push token registration so notifications stay on the right phone
- Role-scoped in-app push handling; LinkAdult selects teen after link

## [1.2.0] - 2026-06-17

### Added

- Header theme presets with curated **accent colors** (Neutrals, Saturated, Light, **Vibrant**)
- Per-user header color picker in Settings (header swatch + accent chip preview)
- Header title **halo** on all screen headers for readability on mid-tone backgrounds

### Changed

- Default theme preset is **Charcoal** with original blue accent for buttons and links
- Primary actions, links, loaders, and progress bar use `theme.accent` instead of hardcoded blue
- Teen dashboard header title renamed to **Teen dashboard** (matches Adult dashboard)
- **Scarlet** preset (renamed from Crimson); Eric’s curated accent/header values across presets

## [1.1.0] - 2026-06-17

### Added

- EAS build profiles (`eas.json`) and `expo-dev-client` for native development builds
- OAuth redirect routing: Expo Go uses `exp://`; dev and production builds use `boundfortheroad://`
- `npm run start:dev-client` for daily dev after installing a development build
- Development build setup guide in `docs/DEVELOPMENT_SETUP.md`

### Changed

- Google Sign-In button styling aligned with Google Identity branding guidelines
- OAuth debug logging in development (`redirectTo`, PKCE details)

## [1.0.0] - 2026-06-19

### Added

- App–backend compatibility checks (`get_app_compatibility`, startup banner, Settings version UI)
- Local SQLite schema migrations (`schema_meta.local_db_version`)
- Deferred approval sync: save sessions locally when remote writes are blocked; send when compatible
- Payload `schemaVersion` guards for canonical session hashes
- Platform-specific app update URLs (`EXPO_PUBLIC_APP_UPDATE_URL_*`)
