# Compatibility and versioning

How the app, local SQLite, canonical payloads, and Supabase backend stay aligned as Phase 2 evolves.

Related: [APPROVAL_AND_HASH.md](./APPROVAL_AND_HASH.md) · [OFFLINE_SYNC.md](./OFFLINE_SYNC.md) · [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

---

## Version numbers (what bumps when)

| Layer | Source of truth | Who bumps |
|-------|-----------------|-----------|
| **App** | `mobile/app.json` → `expo.version` (mirrored in `mobile/package.json`; runtime via `APP_VERSION` in `compatibility.js`) | Release / EAS build; document in [CHANGELOG.md](../CHANGELOG.md) |
| **Local DB** | `schemaMigrations.js` → `LOCAL_DB_VERSION`; stored in `schema_meta.local_db_version` on device | Mobile dev when SQLite shape changes |
| **Payload hash** | `schemaVersion` in canonical JSON; constants in `compatibility.js` | Mobile dev when hash-relevant fields change |
| **Backend** | `app_config.backend_revision`; client floor in `MIN_BACKEND_REVISION` (`compatibility.js`) | New Supabase migration + SQL seed row when schema/RPC changes |

Lexicographic compare works for `backend_revision` (14-digit migration filename prefixes).

---

## Payload `schemaVersion`

- Hash covers only fields in the canonical key list (`hash.js`).
- **Bump** when adding/removing/renaming hash-relevant fields.
- **Do not bump** for display-only or sync-only fields excluded from canonical JSON.
- Approvals bind to `requestHash` — old approvals remain valid for the payload version they were created against.
- App **writes** `CURRENT_PAYLOAD_SCHEMA_VERSION` on new submits.
- App **reads** any payload version `<= SUPPORTED_PAYLOAD_SCHEMA_VERSION`; newer versions block submit with a clear error.

---

## Local SQLite migrations

1. `schema_meta` table stores `local_db_version`.
2. Numbered `up()` steps in `schemaMigrations.js` run once, in order.
3. Fresh install and legacy DB (no meta row) both run from version `0` → current.

---

## Backend compatibility RPC

Canonical shape and capability strings: [RPC_CONTRACT.md](./RPC_CONTRACT.md).

`get_app_compatibility()` returns server-side version gates and a capability list. The client compares that payload against `APP_VERSION`, `MIN_BACKEND_REVISION`, and `requiredBackendCapabilities.json`.

Required capability strings live in `mobile/src/config/requiredBackendCapabilities.json`. CI validates that file against the latest `get_app_compatibility` migration SQL.

Callable by `anon` and `authenticated` (read-only, no secrets).

When you add backend features, update `get_app_compatibility()` (new migration if needed), `requiredBackendCapabilities.json`, and `app_config.backend_revision` together. See [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md).

---

## Compatibility states

Each startup check resolves to one explicit state (see `mobile/src/config/compatibilityStates.js`):

| State | Remote writes |
|-------|---------------|
| `compatible` | Allowed |
| `update_available` | Allowed (Settings nudge only) |
| `update_required` | Blocked |
| `backend_stale` | Blocked |
| `capability_missing` | Blocked |
| `payload_schema_unsupported` | Blocked |
| `check_skipped` | Allowed when fail-open |
| `check_error` | Blocked when fail-closed |
| `preview` | Blocked (dev banner preview) |

---

## Client check (startup)

When Supabase is configured and online:

1. Call `get_app_compatibility()`.
2. Compare app version vs `min_app_version`.
3. Compare required `MIN_BACKEND_REVISION` vs `backend_revision`.
4. Verify required capabilities are listed.

**Policy:**

| Situation | Fail-open (dev default) | Fail-closed (production default) |
|-----------|-------------------------|----------------------------------|
| Offline / not configured | Skip check; allow writes | Skip check; allow writes |
| RPC error (migration not applied) | Settings warning; **allow** writes | Header banner; **block** writes |
| App below `min_app_version` | Banner; **block** remote sync | Same |
| Backend below `MIN_BACKEND_REVISION` | Banner; **block** remote sync | Same |
| Missing required capability | Banner; **block** remote sync | Same |
| App below `latest_app_version` only | Settings nudge; **allow** writes | Same |
| Payload newer than supported | Block submit for that session | Same |

Override: `EXPO_PUBLIC_COMPATIBILITY_RPC_FAIL_POLICY=open|closed` in `mobile/.env`.

### Preview the banner (dev)

Add to `mobile/.env` and restart Expo:

```
EXPO_PUBLIC_FORCE_COMPATIBILITY_BANNER=true
```

Purple **[Preview]** banner simulates a stale-server warning without changing Supabase. Remove when done.

### Update link (Settings)

Store listings use different URLs per platform. Set whichever you have:

```
EXPO_PUBLIC_APP_UPDATE_URL_IOS=https://apps.apple.com/app/idXXXXXXXX
EXPO_PUBLIC_APP_UPDATE_URL_ANDROID=https://play.google.com/store/apps/details?id=com.example.app
```

Or a single landing page that redirects by device:

```
EXPO_PUBLIC_APP_UPDATE_URL=https://yoursite.com/download
```

Platform-specific vars take precedence; the generic URL is the fallback.

Settings shows **Get update** when the app is below `min_app_version` (required) or `latest_app_version` (optional nudge).

Bump `latest_app_version` in `app_config` for soft patch/minor nudges; bump `min_app_version` when old builds must not sync.

### Testing optional update nudges

Optional nudges are **soft** — no header banner, writes still work. They appear in **Settings → App version** only.

**Setup**

1. `get_app_compatibility()` includes `latest_app_version` (see migrations under `supabase/migrations/`).
2. In Supabase, set `min_app_version` at or below your installed app version (`mobile/app.json` → `expo.version`).
3. Set `latest_app_version` **higher** than the installed app version.

**Steps**

1. In Supabase SQL editor, raise `latest_app_version` above your installed build.
2. Open the app (online) → **Settings** → **Re-check compatibility**.
3. Expect: no header banner; Settings shows **App update available** and the raised latest version.
4. Submit/approve should still work (`min_app_version` is what blocks writes).
5. Reset `latest_app_version` when done.

**Contrast with required update:** raise `min_app_version` above the installed app instead — header banner appears, remote submit blocked, but **Save to log** still works on the review screen. Dashboard shows **Saved on device — update app to send for approval** until you update and tap **Send for approval**.

### Local save vs remote approval

When remote writes are blocked, teens can **Save to log** (practice time counts locally). Supervisor notification and approval sync wait until the app is updated. Dashboard shows **Saved on device — update app to send for approval** while blocked; after updating, the label becomes **ready to send for approval** and **Send for approval** appears. **Withdraw** always works on-device so sessions are not stuck.

### Header banners

Compatibility warnings render below `ScreenHeader` via `HeaderBannerStack`. Multiple banners stack vertically in that slot (shared layout for warning, preview, and info variants).

---

## Edge functions

`send-approval-push` (TypeScript) rejects unknown `event` values with `unknown_event`. Client sends `clientVersion` in the body for logging; server does not enforce yet.

---

## Checklist when shipping a breaking change

1. Bump local DB migration if SQLite changes.
2. Bump `schemaVersion` if hash payload changes (+ migration plan for in-flight rows).
3. Add Supabase migration; update `app_config.backend_revision`.
4. Bump `min_app_version` in `app_config` if old apps must not sync.
5. Update `mobile/src/config/compatibility.js` and `requiredBackendCapabilities.json` if constants change.
6. Redeploy edge functions if event surface changes.

Post-merge operator steps: [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md).
