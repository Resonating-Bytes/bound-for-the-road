# Offline and Sync

## Goals

- Full **start → stop → review → submit** without network.
- **Approve** when parent comes online later.
- Support spotty rural cell and teens on **limited data** plans.

## Local-first

- All sessions, drafts, submissions, approvals stored in on-device DB first.
- UI always reads local state; sync is background.

## Outbox queue

When offline, enqueue:

| Operation | Payload |
|-----------|---------|
| `supervisor_claim` | sessionId, adultUserId, claimedAt |
| `session_stop` | sessionId, endedAt, endedBy |
| `submission` | requestHash, payloadJson |
| `approval` | requestHash, approval record |
| `delete` | sessionId, deletedAt |

Replay in order per `sessionId` when online.

## Conflict rules

| Conflict | Resolution |
|----------|------------|
| Two adults claim same session offline | Server timestamp first-wins; notify teen to confirm |
| Submit while parent approves old hash offline | Newer `submittedAt` wins; reject approve if hash unknown |
| Duplicate approval same hash | Idempotent ignore |

## What syncs to server (MVP minimal)

- User ids, link relationships, push tokens
- Supervisor claim for active session
- Submissions and approvals (metadata + hash; not full GPS trail for MVP)
- Deletes

## What stays local (MVP)

- GPS route points (if collected later)
- Draft edits before submit
- Full tag edit history optional

## Teen device without data

- Wi-Fi at home: sync outbox.
- Parent on Wi-Fi can approve while teen stays offline after submit (submission must reach server—teen queues submit).

## Implementation notes (Expo)

- NetInfo for connectivity listener.
- Exponential backoff retry on outbox.
- Show sync status: “Pending sync”, “Up to date”.
