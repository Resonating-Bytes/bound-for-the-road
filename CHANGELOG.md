# Changelog

All notable changes to the mobile app and its Supabase backend are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
App version uses [Semantic Versioning](https://semver.org/) (`mobile/app.json`).

## [Unreleased]

### Added

### Changed

### Fixed

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
