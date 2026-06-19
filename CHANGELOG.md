# Changelog

All notable changes to the mobile app and its Supabase backend are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
App version uses [Semantic Versioning](https://semver.org/) (`mobile/app.json`).

## [Unreleased]

### Added

### Changed

### Fixed

## [1.0.0] - 2026-06-19

### Added

- App–backend compatibility checks (`get_app_compatibility`, startup banner, Settings version UI)
- Local SQLite schema migrations (`schema_meta.local_db_version`)
- Deferred approval sync: save sessions locally when remote writes are blocked; send when compatible
- Payload `schemaVersion` guards for canonical session hashes
- Platform-specific app update URLs (`EXPO_PUBLIC_APP_UPDATE_URL_*`)
