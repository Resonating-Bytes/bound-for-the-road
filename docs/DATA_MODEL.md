# Data Model

Decisions: [DECISIONS.md](./DECISIONS.md)

**Canonical DDL:** [mobile/src/db/schema.js](../mobile/src/db/schema.js)  
**All DB access:** [mobile/src/db/queries.js](../mobile/src/db/queries.js) — no raw SQL in UI components.

---

## Principles

- **Local-first:** device is primary store.
- **User-scoped rows:** every session keyed by `teenUserId`.
- **Soft-delete:** sessions use `deletedAt`; excluded from progress and export.

---

## users

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT PK | UUID |
| `role` | TEXT | `'teen'` in MVP |
| `legalName` | TEXT | Export header |
| `email` | TEXT | nullable |
| `dateOfBirth` | TEXT | ISO date |
| `stateCode` | TEXT | default `IL` |
| `permitIssueDate` | TEXT | ISO date, **required** before dashboard in MVP |
| `createdAt` | TEXT | |
| `updatedAt` | TEXT | |

---

## links (Phase 2; table exists in MVP, empty)

| Field | Notes |
|-------|-------|
| `teenUserId`, `adultUserId` | Many-to-many |
| `status` | `pending` \| `active` |

Teen never sees other teens through this table.

---

## sessions

| Field | Notes |
|-------|-------|
| `id` | UUID |
| `teenUserId` | FK |
| `stateCode` | Snapshot at start |
| `status` | `active` \| `draft` \| `saved` \| `deleted` |
| `startedAt`, `endedAt` | ISO datetime |
| `durationMinutes` | Set on save |
| `dayNight` | `day` \| `night` |
| `notes` | Optional |
| `requestHash`, `payloadJson` | Set on save |
| `deletedAt` | Soft-delete |
| `activeSupervisorId` | Phase 2 |

Phase 2 may add `submitted` / `approved` as status or derive from submissions table.

### Session length guardrails (at review / app open)

- **&lt; 5 minutes:** warn on review; recommend discard if accidental ([DECISIONS.md](./DECISIONS.md)).
- **≥ 2 hours active:** local nudge notification (implemented); optional future `auto_paused` status not used in Phase 1.
- **&gt; 24 hours still active:** on next app open, force to `draft` and notify teen ([DECISIONS.md](./DECISIONS.md) — not yet implemented).

`startedAt` / `endedAt` are device-supplied; app does not claim tamper-proof timestamps ([APPROVAL_AND_HASH.md](./APPROVAL_AND_HASH.md)).

---

## submissions, approvals, outbox

Tables created in MVP schema; **populated in Phase 2**. See schema.js.

`schemaVersion` in canonical payloads starts at **1**; hash-relevant field changes require a version bump and migration plan ([APPROVAL_AND_HASH.md](./APPROVAL_AND_HASH.md)).

### Session cache (Phase 2, optional)

Derived fields for fast dashboard queries — recomputable from submissions/approvals:

| Field | Notes |
|-------|-------|
| `sessionId` | |
| `latestRequestHash` | |
| `latestApprovedRequestHash` | Nullable |

---

## Progress queries

```
totalMinutes = SUM(durationMinutes) WHERE status='saved' AND deletedAt IS NULL
nightMinutes = SUM(...) WHERE dayNight='night'
```

---

## Indexes

- `sessions(teenUserId, status)`
- `sessions(teenUserId, startedAt DESC)`
- `submissions(sessionId)`, `approvals(requestHash)`
