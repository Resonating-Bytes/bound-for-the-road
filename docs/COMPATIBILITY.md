# Compatibility and versioning

How the app, local SQLite, canonical payloads, and Supabase backend stay aligned as Phase 2 evolves.

Related: [APPROVAL_AND_HASH.md](./APPROVAL_AND_HASH.md) · [OFFLINE_SYNC.md](./OFFLINE_SYNC.md) · [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

---

## Version numbers (what bumps when)

| Layer | Where | Current | Who bumps |
|-------|--------|---------|-----------|
| **App** | `mobile/app.json` `expo.version` | `1.4.0` | Release / EAS build; bump with [CHANGELOG.md](../CHANGELOG.md). Runtime reads via `APP_VERSION`; `mobile/package.json` `version` mirrors it for npm. |
| **Local DB** | `schema_meta.local_db_version` | `2` | Mobile dev when SQLite shape changes |
| **Payload hash** | `schemaVersion` in canonical JSON | `1` | Mobile dev when hash-relevant fields change |
| **Backend** | `app_config.backend_revision` | migration id | Apply new Supabase migration + update seed row |

Lexicographic compare works for `backend_revision` (timestamp migration filenames).

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

`get_app_compatibility()` returns:

```json
{
  "backend_revision": "20260622120000",
  "min_app_version": "1.0.0",
  "payload_schema_version": "1",
  "capabilities": ["decline_submission", "send_approval_push", "..."]
}
```

Callable by `anon` and `authenticated` (read-only, no secrets).

After applying `20260620120000_app_compatibility.sql`, update `backend_revision` in `app_config` whenever a later migration requires a newer app build. `20260621120000_register_push_token_rpc.sql` adds the `register_push_token` RPC. `20260622120000_delete_my_account_rpc.sql` adds hard account deletion.

---

## Client check (startup)

When Supabase is configured and online:

1. Call `get_app_compatibility()`.
2. Compare app version vs `min_app_version`.
3. Compare required `MIN_BACKEND_REVISION` vs `backend_revision`.
4. Verify required capabilities are listed.

**Default policy (dev-friendly):**

| Situation | UX |
|-----------|-----|
| Offline / not configured | Skip check |
| RPC error (migration not applied) | Soft warning in Settings; **allow** use |
| App below `min_app_version` | Banner; **block remote approval sync**; local save + progress still work |
| Backend below `MIN_BACKEND_REVISION` | Banner; **block remote approval sync**; local save still works |
| App below `latest_app_version` only | Settings nudge + update button; **allow** writes |
| Payload newer than supported | Block submit for that session |

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

**Prerequisites**

1. Migration `20260620130000_app_compatibility_latest_version.sql` applied (adds `latest_app_version` to the RPC).
2. App still reports `1.0.0` (`mobile/src/config/compatibility.js` / `app.json`).
3. Server has `min_app_version = 1.0.0` (you stay “allowed”) but `latest_app_version` **higher** than installed.

**Steps**

1. In Supabase SQL editor:
   ```sql
   UPDATE app_config SET value = '1.0.1' WHERE key = 'latest_app_version';
   ```
2. Open the app (online), go to **Settings**.
3. Tap **Re-check compatibility** in the App version section.
4. Expect:
   - **No** yellow/purple header banner (you’re still compatible).
   - Status: **App update available**
   - Server latest: **1.0.1**
   - Blue button: **Update available — get latest app**
5. Submit/approve should still work (only `min_app_version` blocks writes).
6. Reset when done:
   ```sql
   UPDATE app_config SET value = '1.0.0' WHERE key = 'latest_app_version';
   ```

**Contrast with required update:** set `min_app_version = 1.0.1` instead — header banner appears, remote submit blocked, but **Save to log** still works on the review screen. Dashboard shows **Saved on device — update app to send for approval** until you update and tap **Send for approval**.

### Local save vs remote approval

When remote writes are blocked, teens can **Save to log** (practice time counts locally). Supervisor notification and approval sync wait until the app is updated. Dashboard shows **Saved on device — update app to send for approval** while blocked; after updating, the label becomes **ready to send for approval** and **Send for approval** appears. **Withdraw** always works on-device so sessions are not stuck.

### Header banners

Compatibility warnings render below `ScreenHeader` via `HeaderBannerStack`. Multiple banners stack vertically in that slot (shared layout for warning, preview, and info variants).

---

## Edge functions

`send-approval-push` (JavaScript) rejects unknown `event` values with `unknown_event`. Client sends `clientVersion` in the body for logging; server does not enforce yet.

---

## Checklist when shipping a breaking change

1. Bump local DB migration if SQLite changes.
2. Bump `schemaVersion` if hash payload changes (+ migration plan for in-flight rows).
3. Add Supabase migration; update `app_config.backend_revision`.
4. Bump `min_app_version` in `app_config` if old apps must not sync.
5. Update `mobile/src/config/compatibility.js` constants.
6. Redeploy edge functions if event surface changes.
