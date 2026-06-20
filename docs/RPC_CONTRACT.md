# RPC and compatibility contract

Canonical reference for Supabase RPCs, the compatibility check, and backend capability strings.  
Human release steps: [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md). Version policy: [COMPATIBILITY.md](./COMPATIBILITY.md).

---

## Compatibility RPC

### `get_app_compatibility()`

| | |
|---|---|
| **Auth** | `anon`, `authenticated` |
| **Returns** | JSON object (stable keys below) |
| **Contract version** | `1` (`COMPATIBILITY_CONTRACT_VERSION` in app config) |

**Response shape:**

```json
{
  "backend_revision": "20260624120000",
  "min_app_version": "1.0.0",
  "latest_app_version": "1.5.0",
  "payload_schema_version": "1",
  "capabilities": ["decline_submission", "..."]
}
```

| Field | Meaning |
|-------|---------|
| `backend_revision` | Latest applied migration id (`app_config.backend_revision`) |
| `min_app_version` | App versions below this cannot perform remote writes |
| `latest_app_version` | Soft nudge in Settings when app is older (writes still allowed) |
| `payload_schema_version` | Server's canonical session schema version |
| `capabilities` | Feature strings this server exposes (see below) |

**Defined in:** latest migration that replaces `get_app_compatibility` (currently `20260624120000_app_compatibility_capabilities.sql`).

**Client constants:** `mobile/src/config/requiredBackendCapabilities.json` — CI validates JSON matches SQL.

---

## Required backend capabilities

| Constant | String | Introduced |
|----------|--------|------------|
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

Client capability strings describe edge support; event names in the HTTP body differ:

| Capability string | Edge `event` value |
|-------------------|-------------------|
| `send_approval_push_session_submitted` | `session_submitted` |
| `send_approval_push_session_approved` | `session_approved` |
| `send_approval_push_session_declined` | `session_declined` |
| `send_approval_push_session_withdrawn` | `session_withdrawn` |

Invoke body: `{ event, sessionId, requestHash, clientVersion? }` — see `mobile/src/lib/approvalPush.js`.

---

## Other RPCs

| RPC | Params | Min revision | Capability |
|-----|--------|--------------|------------|
| `decline_submission` | `p_request_hash TEXT` | `20260619150000` | `decline_submission` |
| `accept_link_invite` | `p_code TEXT` | `20260619120000` | `accept_link_invite` |
| `register_push_token` | `p_token TEXT`, `p_platform TEXT` | `20260621120000` | `register_push_token` |
| `delete_my_account` | none | `20260622120000` | `delete_my_account` |
| `upsert_user_alias` | `p_target_user_id UUID`, `p_nickname TEXT` | `20260623120000` | `upsert_user_alias` |
| `delete_user_alias` | `p_target_user_id UUID` | `20260623120000` | `delete_user_alias` |

---

## Compatibility states (runtime)

| State | Remote writes | Typical UX |
|-------|---------------|------------|
| `compatible` | Allowed | Settings: Up to date |
| `update_available` | Allowed | Settings nudge only |
| `update_required` | Blocked | Banner + Settings |
| `backend_stale` | Blocked | Banner |
| `capability_missing` | Blocked | Banner |
| `payload_schema_unsupported` | Blocked | Error on affected session |
| `check_skipped` | Allowed if fail-open | Settings warning (dev) |
| `check_error` | Blocked if fail-closed | Banner (production default) |
| `preview` | Blocked | Purple preview banner |

**Fail policy:** `EXPO_PUBLIC_COMPATIBILITY_RPC_FAIL_POLICY=open|closed`. Default: `open` in `__DEV__`, `closed` in production builds.

---

## CI validation

| Script | Validates |
|--------|-----------|
| `scripts/check-backend-capabilities.js` | JSON capabilities = SQL `json_build_array` |
| `scripts/check-backend-revision.js` | Docs + `MIN_BACKEND_REVISION` vs migrations |
| `scripts/check-app-version.js` | Semver bump + changelog heading/date/bullets |

Run all: `node scripts/check-version-bump.js --base origin/main --head HEAD`
