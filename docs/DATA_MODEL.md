# Data Model (MVP)

Logical entities for local-first storage with minimal server sync.

## Users

| Field | Notes |
|-------|-------|
| `id` | UUID |
| `role` | `teen` \| `adult` |
| `legalName` | Export / official log |
| `email` | From auth provider |
| `dateOfBirth` | Teen; verify 13+ |
| `stateCode` | Teen primary state (IL MVP) |
| `createdAt` | |

## Teen–adult links

| Field | Notes |
|-------|-------|
| `id` | |
| `teenUserId` | |
| `adultUserId` | |
| `status` | `pending` \| `active` |
| `nickname` | Wishlist: teen-only display name |
| `createdAt` | |

Cardinality: many-to-many (N adults per teen).

## Adult profile extensions (wishlist)

| Field | Notes |
|-------|-------|
| `supervisorVerified` | Boolean, default false; no license storage |

## Sessions

| Field | Notes |
|-------|-------|
| `id` | UUID |
| `teenUserId` | |
| `stateCode` | Snapshot at start |
| `status` | `active` \| `draft` \| `submitted` \| `approved` \| `deleted` |
| `startedAt` | |
| `endedAt` | Nullable until stop |
| `endedBy` | `teen` \| `adult` \| null |
| `activeSupervisorId` | Set on join |
| `activeSupervisorJoinedAt` | |
| `draftPayload` | JSON, mutable in draft |
| `currentRequestHash` | Latest submit |
| `deletedAt` | Soft-delete optional |

## Submissions (immutable)

| Field | Notes |
|-------|-------|
| `requestHash` | PK |
| `sessionId` | |
| `payloadJson` | Canonical bytes used for hash |
| `submittedAt` | |
| `submittedByUserId` | |
| `superseded` | Boolean when newer submit exists |

## Approvals (immutable)

| Field | Notes |
|-------|-------|
| `id` | |
| `requestHash` | FK |
| `sessionId` | |
| `approvedByUserId` | |
| `approvedAt` | |
| `joinedSession` | Boolean |
| `supervisorInVehicleName` | |
| `approverPresent` | Enum |

## Session cache (optional)

| Field | Notes |
|-------|-------|
| `sessionId` | |
| `latestRequestHash` | |
| `latestApprovedRequestHash` | Nullable |

## Server-side (minimal)

- `users`, `links`, `push_tokens`
- Sync queue: submissions, approvals, deletes, supervisor claims
- **Do not** require full GPS upload for MVP

## Indexes

- Sessions by `teenUserId`, `status`, `startedAt`
- Submissions by `sessionId`, `submittedAt`
- Approvals by `requestHash`, `sessionId`
