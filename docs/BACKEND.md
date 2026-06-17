# Backend

Minimal backend requirements, API endpoints, and the build-vs-buy decision for TeenDriver MVP.

Read [AUTH.md](./AUTH.md) and [OFFLINE_SYNC.md](./OFFLINE_SYNC.md) first — this doc builds on both.

---

## Decision: Supabase ✓

**Supabase is the confirmed backend platform for MVP and beyond.**

Key reasons:
- **Postgres** is a natural fit for the relational data model (Users → Links → Sessions → Submissions → Approvals with hash-based integrity).
- **Row-level security (RLS)** enforces access control at the database layer — adults can only read sessions from their linked teens, teens can only read their own data. This is safer than relying on application code alone.
- **Auth** handles Sign in with Apple and Google token verification with minimal custom code (see AUTH.md).
- **Edge Functions** handle the push notification relay to Expo Push API without a full server.
- **Free tier** (500MB DB, 50MB storage, 500k Edge Function invocations/month) is sufficient for MVP and early beta at no cost.
- **Exit path is clean** — underlying data is standard Postgres; migrating to self-hosted Supabase or any Postgres provider is straightforward.

### Cost and scalability

| Stage | Expected usage | Cost |
|-------|---------------|------|
| MVP / beta | <1,000 users, tiny payloads | Free tier |
| Early growth | Tens of thousands of users | $25/month Pro (8GB DB, 250GB bandwidth) |
| Scale | Hundreds of thousands of users | Dedicated instance or self-hosted Postgres |

Session log data is very small — even 10,000 active teen users with a full year of logs is well under 1GB. Bandwidth is the more likely constraint at scale, driven by sync frequency. The offline-first outbox pattern (infrequent, small writes) is a favorable load profile.

The main long-term risk is Supabase as a company (founded 2020, well-funded but not AWS). Mitigation: data is plain Postgres, migration is clean if ever needed.

### Options considered and not chosen

| Option | Why not chosen |
|--------|---------------|
| **Firebase** | NoSQL (Firestore) is a poor fit for the relational sessions → submissions → approvals model; stronger vendor lock-in |
| **MongoDB Atlas + custom Node** | Reasonable alternative, but Supabase's RLS and built-in auth provide better security guardrails with less custom code |
| **Custom Node/Express + Postgres** | Right answer post-MVP if constraints emerge; unnecessary setup burden for MVP |

---

## Data that lives on the backend

The backend is **not** the source of truth for session state (devices are, per OFFLINE_SYNC.md). The backend stores:

- User accounts and auth identities
- Teen–adult link relationships
- Push tokens
- Submitted session metadata (hash + payload) for dispute resolution and cross-device sync
- Approval records
- Soft-deleted record markers

It does **not** store:
- Active session timer state (device only)
- Draft session edits (device only)
- GPS data (MVP)
- Full tag edit history

---

## API endpoints (MVP)

All endpoints require `Authorization: Bearer <session_token>` except `/auth/signin`.

### Auth

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| POST | `/auth/signin` | `{ provider, identity_token, display_name? }` | `{ session_token, user_id, is_new_user }` | Verifies provider token; creates or updates User |
| POST | `/auth/signout` | — | `{ ok }` | Invalidates session token server-side |
| GET | `/auth/me` | — | `{ user }` | Returns current user profile |
| PATCH | `/auth/me` | `{ legalName, dateOfBirth, stateCode, permitIssueDate, role }` | `{ user }` | Completes onboarding; role can only be set once |

### Teen–adult linking

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| POST | `/links/invite` | — | `{ code, expires_at }` | Teen generates a 6-digit invite code (valid 24 hrs) |
| POST | `/links/accept` | `{ code }` | `{ link }` | Adult enters code; link created with status `pending` |
| GET | `/links` | — | `{ links[] }` | Returns all links for current user (as teen or adult) |
| DELETE | `/links/{linkId}` | — | `{ ok }` | Either party can remove a link |

Link status flow: `pending` → `active` (teen confirms) → (deleted).

For MVP, teen acceptance of the link is automatic on the adult entering the code — no separate confirmation step needed. Add teen confirmation as post-MVP if desired.

### Push tokens

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| POST | `/push/register` | `{ token, platform }` | `{ ok }` | Register FCM or APNs token; call on every app open |
| DELETE | `/push/register` | `{ token }` | `{ ok }` | Deregister on sign-out |

### Sync — session coordination

These endpoints are called by the outbox queue when the device comes online.

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| POST | `/sessions/{id}/claim` | `{ adult_user_id, claimed_at }` | `{ ok, active_supervisor_id }` | Adult claims supervisor role; first-write-wins |
| POST | `/sessions/{id}/stop` | `{ ended_at, ended_by }` | `{ ok }` | Syncs teen stop to backend |
| GET | `/sessions/active` | — | `{ session? }` | Adult polls for active session on linked teen (fallback if push not received) |

### Sync — submissions and approvals

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| POST | `/submissions` | `{ session_id, request_hash, schema_version, payload_json, submitted_at }` | `{ ok }` | Teen submits; stored for dispute resolution and adult retrieval |
| GET | `/submissions/pending` | — | `{ submissions[] }` | Adult fetches submitted sessions awaiting their approval |
| POST | `/approvals` | `{ session_id, request_hash, schema_version, approved_at, joiner_present, supervisor_name }` | `{ ok }` | Adult approves; synced back to teen's device |
| GET | `/approvals?session_id={id}` | — | `{ approval? }` | Teen fetches approval status for a session |

### Push delivery (server-side, not called by app directly)

The backend triggers push notifications on these events:
- Session started → all linked adults
- Supervisor claimed → other linked adults (informational)
- Session submitted → eligible approver(s)
- Session approved → teen

Push is best-effort. The in-app sync endpoints above are the reliable fallback.

---

## Row-level security rules (Supabase RLS or equivalent)

| Table | Rule |
|-------|------|
| `users` | User can only read/write their own record |
| `links` | Readable by both linked users; deletable by either |
| `submissions` | Writable by teen (`submitted_by_user_id`); readable by linked adults |
| `approvals` | Writable by eligible approver; readable by linked teen |
| `push_tokens` | Readable/writable by owning user only |

These rules are enforced at the database layer, not just in application code.

---

## Hosting and infrastructure (MVP)

| Service | Provider | Notes |
|---------|----------|-------|
| Backend / DB | Supabase (free tier) | Postgres + auth + RLS + Edge Functions |
| Push relay | Supabase Edge Function | Calls Expo Push API (which relays to FCM/APNs) |
| File storage | Not needed in MVP | No attachments or images |
| Domain / SSL | Supabase provides | `*.supabase.co` subdomain is fine for MVP |

**Expo Push API** (`https://exp.host/--/api/v2/push/send`) is a convenient relay that handles both FCM and APNs from a single endpoint during development and early production. Switch to direct FCM/APNs for production scale if needed.

---

## What is deferred (post-MVP)

- Account merging (user has both Apple and Google identity)
- Admin tooling / dashboard
- Server-side session validation (currently backend trusts device-reported times)
- HMAC signing of approval records
- Audit log endpoint
- Rate limiting beyond Supabase defaults
- Analytics / telemetry
