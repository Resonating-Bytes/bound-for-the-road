# Changelog

All notable changes to the mobile app and its Supabase backend are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
App version uses [Semantic Versioning](https://semver.org/) (`mobile/app.json`).

## [Unreleased]

### Added

### Changed

### Fixed

- `send-approval-push` edge function entrypoint renamed to `index.ts` so Supabase CLI 2.x deploy finds the default entrypoint

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
