# RPC and compatibility contract

Canonical reference for Supabase RPC shapes, capability strings, and edge event names.  
Runtime policy (fail-open/closed, banners): [COMPATIBILITY.md](./COMPATIBILITY.md).  
Release steps: [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md).

---

## Compatibility RPC

### `get_app_compatibility()`

| | |
|---|---|
| **Auth** | `anon`, `authenticated` |
| **Returns** | JSON object (stable keys below) |
| **Contract version** | `COMPATIBILITY_CONTRACT_VERSION` in `requiredBackendCapabilities.json` |

**Response fields:**

| Field | Meaning |
|-------|---------|
| `backend_revision` | Applied migration id (`app_config.backend_revision`) |
| `min_app_version` | App versions below this cannot perform remote writes |
| `latest_app_version` | Soft nudge in Settings when app is older (writes still allowed) |
| `payload_schema_version` | Server's canonical session schema version |
| `capabilities` | Feature strings this server exposes (see below) |

**Server definition:** whichever migration in `supabase/migrations/` last replaces `get_app_compatibility()`.

**Client floor:** `mobile/src/config/requiredBackendCapabilities.json` — CI validates JSON matches that SQL via `scripts/check-backend-capabilities.js`.

---

## Required backend capabilities

Named constants in `requiredBackendCapabilities.json` → string values returned in `capabilities`:

| Constant | Capability string | Added in migration (filename prefix) |
|----------|-------------------|--------------------------------------|
| `DECLINE_SUBMISSION` | `decline_submission` | `20260619150000` |
| `SEND_APPROVAL_PUSH_SESSION_SUBMITTED` | `send_approval_push_session_submitted` | edge function |
| `SEND_APPROVAL_PUSH_SESSION_APPROVED` | `send_approval_push_session_approved` | edge function |
| `SEND_APPROVAL_PUSH_SESSION_DECLINED` | `send_approval_push_session_declined` | edge function |
| `SEND_APPROVAL_PUSH_SESSION_WITHDRAWN` | `send_approval_push_session_withdrawn` | edge function |
| `ACCEPT_LINK_INVITE` | `accept_link_invite` | `20260619120000` |
| `REGISTER_PUSH_TOKEN` | `register_push_token` | `20260621120000` |
| `DELETE_MY_ACCOUNT` | `delete_my_account` | `20260622120000` |
| `UPSERT_USER_ALIAS` | `upsert_user_alias` | `20260623120000` |
| `DELETE_USER_ALIAS` | `delete_user_alias` | `20260623120000` |

When adding a capability:

1. Add named entry to `requiredBackendCapabilities.json`
2. Update `get_app_compatibility()` in a new migration
3. Run `node scripts/check-backend-capabilities.js`

---

## Edge function events (`send-approval-push`)

Client capability strings describe edge support; HTTP `event` values differ:

| Capability string | Edge `event` value |
|-------------------|-------------------|
| `send_approval_push_session_submitted` | `session_submitted` |
| `send_approval_push_session_approved` | `session_approved` |
| `send_approval_push_session_declined` | `session_declined` |
| `send_approval_push_session_withdrawn` | `session_withdrawn` |

Invoke body: `{ event, sessionId, requestHash, clientVersion? }` — see `mobile/src/lib/approvalPush.js`.

---

## Other RPCs

| RPC | Params | Capability (if gated) |
|-----|--------|------------------------|
| `decline_submission` | `p_request_hash TEXT` | `decline_submission` |
| `accept_link_invite` | `p_code TEXT` | `accept_link_invite` |
| `register_push_token` | `p_token TEXT`, `p_platform TEXT` | `register_push_token` |
| `delete_my_account` | none | `delete_my_account` |
| `upsert_user_alias` | `p_target_user_id UUID`, `p_nickname TEXT` | `upsert_user_alias` |
| `delete_user_alias` | `p_target_user_id UUID` | `delete_user_alias` |

Each RPC lives in a migration under `supabase/migrations/`. The app may also require a minimum migration via `MIN_BACKEND_REVISION` in `compatibility.js`.

---

## Compatibility states (runtime)

See `mobile/src/config/compatibilityStates.js` and the policy tables in [COMPATIBILITY.md](./COMPATIBILITY.md).

---

## CI validation

| Script | Validates |
|--------|-----------|
| `scripts/check-backend-capabilities.js` | JSON capabilities = SQL `json_build_array` |
| `scripts/check-backend-revision.js` | CHANGELOG documents backend changes; `MIN_BACKEND_REVISION` vs migrations |
| `scripts/check-app-version.js` | Semver bump + CHANGELOG release section when mobile changes |

Run all: `node scripts/check-version-bump.js --base origin/main --head HEAD`
