# Cross-Platform Notes

This document captures platform-specific implementation decisions, known divergences between iOS and Android, and deferred items that require native capabilities beyond Expo Go. It is a living reference — update it as decisions are made.

## Development phases and platform capability

| Capability | Expo Go | Dev build | TestFlight / Play internal | Production |
|------------|---------|-----------|---------------------------|------------|
| Core UI, navigation, local DB | ✅ | ✅ | ✅ | ✅ |
| In-app notification queue / badge | ✅ | ✅ | ✅ | ✅ |
| Push notifications (FCM/APNs) | ⚠️ Limited | ✅ | ✅ | ✅ |
| iOS Live Activity (lock screen timer) | ❌ | ✅ | ✅ | ✅ |
| Android foreground service (persistent timer) | ❌ | ✅ | ✅ | ✅ |
| Sign in with Apple (production config) | ⚠️ Limited | ✅ | ✅ | ✅ |
| GPS / foreground location (active session) | ✅ | ✅ | ✅ | ✅ |
| GPS / background location | ❌ | ✅ | ✅ | ✅ |
| Deep links (universal / app links) | ⚠️ | ✅ | ✅ | ✅ |

**Rule:** Do not consider a feature validated until it has been tested in a dev build or TestFlight/Play internal. Expo Go results for any of the ⚠️/❌ rows are not representative.

## Authentication

**iOS:** Sign in with Apple is **required** by Apple App Store guidelines when any other social login is offered. Must be implemented alongside Google Sign-In.

**Android:** Sign in with Apple is not available as a native SDK on Android. Google Sign-In only on Android. Auth layer must handle the platform difference cleanly — don't assume both providers are available on both platforms.

**Implementation approach:** Use Expo's `expo-auth-session` for the OAuth flows, with `expo-apple-authentication` for the native Sign in with Apple button on iOS. The backend receives a token from either provider and issues its own session token.

## Lock screen session UI

### iOS — Live Activity
- Displays elapsed timer and Stop button on the Dynamic Island / lock screen.
- Started **locally** when the teen taps Start. Not a push notification.
- Requires `expo-live-activities` or a custom native module. Not available in Expo Go.
- Requires a dev build for development testing.
- No session summary is shown on the Live Activity — timer and Stop only (safety principle).

### Android — Foreground Service Notification
- A persistent, non-dismissible notification in the `session_active` channel shows elapsed time.
- Stop button is an action on the notification.
- Implemented as a foreground service to survive backgrounding.
- Requires `FOREGROUND_SERVICE` permission in `AndroidManifest.xml`.
- As of Android 14, must declare foreground service type. Appropriate type: `specialUse` or `connectedDevice` depending on final implementation. Requires justification in Play Store listing.
- Requires a custom Expo config plugin (or app prebuild) — cannot be done with managed workflow Expo Go.
- Time display must update while the app is backgrounded. This is the core reason a foreground service is required.

**Both platforms must reach equivalent UX:** user can see elapsed time and stop the session without opening the app. The implementation path differs but the end result should feel the same.

## Deep links

All push notifications include a `deepLink` field. Deep links are how a notification tap opens the right screen.

**Scheme:** `boundfortheroad://`

**Required routes (MVP):**
- `boundfortheroad://sessions/{sessionId}` — open a specific session (for approval, review, etc.)
- `boundfortheroad://sessions/active` — open the current active session

**iOS setup:**
- Custom URL scheme in `app.json` `ios.bundleIdentifier` + `scheme`.
- For universal links (recommended for email/web deep links later): Associated Domains entitlement + `apple-app-site-association` file on server.
- For MVP, custom scheme is sufficient.

**Android setup:**
- Intent filter in `AndroidManifest.xml` via Expo config.
- `app.json` `android.intentFilters` block.

Both must be configured before the first real push notification test. Validate in a dev build.

## Local database

**Requirement:** A query layer that avoids raw SQL in application code, works cross-platform (iOS + Android), and supports the sync outbox pattern.

**Options under consideration:**

| Library | Pros | Cons |
|---------|------|------|
| **Drizzle ORM + expo-sqlite** | Lightweight, type-inferred queries, works with expo-sqlite, active community | Newer project, some rough edges |
| **WatermelonDB** | Purpose-built for React Native offline-first, excellent sync patterns | More complex setup, heavier |
| **Prisma** | Familiar to Node/web devs | React Native support is experimental |

**Decision:** To be made before data layer implementation begins. Drizzle + expo-sqlite is the current lean given its lighter weight and that the sync outbox can be handled at the application layer. WatermelonDB is the fallback if sync complexity grows.

**Requirements for the chosen library:**
- Cross-platform (iOS + Android)
- No raw SQL in business logic
- Supports migrations with version tracking
- Works in Expo managed workflow (or requires only a config plugin, not a full prebuild)

## EAS Build profiles

An `eas.json` with the following profiles should be set up before the first build:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

- **development:** for day-to-day feature work requiring native capabilities (push, Live Activity, foreground service). Distributed internally via EAS or direct install.
- **preview:** for stakeholder testing / TestFlight beta / Play internal testing. Validates push flows.
- **production:** store submission.

Windows dev machine cannot compile iOS locally. Use EAS Build cloud for all iOS builds.

## Android notification channels

Channels are permanent on the user's device once created. They cannot be renamed or have their importance changed by an app update. Users can override them. Get this right before first production release.

| Channel ID | Name | Importance | Notes |
|------------|------|------------|-------|
| `session_active` | Active Session | LOW (silent, visible) | Ongoing foreground service notification. Non-dismissible while session runs. |
| `approval` | Approvals | DEFAULT (makes sound) | Approval requests and confirmations. |
| `reminders` | Reminders | LOW | 2-hour time nudge and similar. |

All channels must be created at app first launch, even if not immediately used.

## GPS and location

**Foreground (Expo Go — shipped):** While a practice session is active and the app is in the foreground, `expo-location` samples coordinates and speed. Points are stored locally in `session_location_samples` and are **not** uploaded to Supabase. Road category (local vs highway) is inferred on-device from speed heuristics.

**Background (dev build — later):**

**Android background location:**
- Android 10+ requires `ACCESS_BACKGROUND_LOCATION` as a separate permission, shown in a dedicated system prompt.
- Android 11+ requires the user to manually grant "Allow all the time" in Settings — the app cannot prompt for this directly.
- Google Play requires a prominent disclosure and may require a privacy policy update.
- Foreground-only location (while app is visible) is easier to obtain but insufficient for stall detection while driving.
- Consider: foreground location only while the session notification is active (foreground service gives extended location access on some Android versions).

**iOS background location:**
- `NSLocationAlwaysAndWhenInUseUsageDescription` required in Info.plist.
- Apple review scrutinizes always-on location. Use it only if stall detection genuinely requires it.
- Consider `significantLocationChange` API as a lower-power alternative for detecting stops.

**General:**
- Location data should not leave the device for MVP even when GPS is added. The privacy positioning (cf. DriveMint) is a competitive differentiator worth preserving.
- If location is used for stall detection, it can be confined to on-device processing with no server upload.

## Testing matrix

Before each milestone, verify on:
- Physical iPhone (primary iOS test device)
- Android emulator (Pixel 6 API 34 or similar) for UI/logic
- Physical Android device for GPS, notification behavior, OEM-specific quirks (add when available, not blocking for early sprints)

Expo Go is sufficient for UI, navigation, and local DB work. Move to dev build for any feature in the ❌ column of the capability table above.
