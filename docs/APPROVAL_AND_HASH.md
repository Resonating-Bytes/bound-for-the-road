# Approval and Hash

Decisions: [DECISIONS.md](./DECISIONS.md)

---

## Phase 1 (MVP) — hash on Save only

- **No hash** during `active` or `draft`.
- **Hash on Save:** `requestHash = SHA-256(canonicalPayload)`.
- **No approval record** in MVP — export shows hash for integrity only.
- Re-Save after edit → new hash; store new `payloadJson`.

Implementation: [mobile/src/utils/hash.js](../mobile/src/utils/hash.js)

### MVP canonical payload

```json
{
  "schemaVersion": 1,
  "sessionId": "uuid",
  "stateCode": "IL",
  "startedAt": "ISO-8601 UTC",
  "endedAt": "ISO-8601 UTC",
  "durationMinutes": 42,
  "dayNight": "day | night",
  "notes": null,
  "savedAt": "ISO-8601 UTC",
  "savedByUserId": "uuid"
}
```

Serialize with **stable key order** (see `stableStringify`). Exclude sync flags and `updatedAt`.

**Algorithm:** SHA-256 → lowercase hex. UI shows truncated hash (e.g. first 8 chars).

---

## Phase 2 — submit and approval

**Approval is for a specific snapshot**, not a living row.

- **Hash at submit** (Save renamed → Submit for approval).
- **Approval** stores `requestHash` only.
- Display **Approved** only when approval exists for that hash.

### Full canonical payload (Phase 2 submit)

```json
{
  "schemaVersion": 1,
  "sessionId": "uuid",
  "stateCode": "IL",
  "startedAt": "ISO-8601",
  "endedAt": "ISO-8601",
  "endedBy": "teen",
  "activeSupervisorId": "uuid-or-null",
  "activeSupervisorJoinedAt": "ISO-8601-or-null",
  "durationMinutes": 42,
  "dayNight": "day | night",
  "notes": null,
  "submittedAt": "ISO-8601",
  "submittedByUserId": "uuid"
}
```

### Approval record

```json
{
  "approvalId": "uuid",
  "sessionId": "uuid",
  "requestHash": "hex",
  "approvedByUserId": "uuid",
  "approvedAt": "ISO-8601",
  "joinedSession": true,
  "supervisorInVehicleName": "string",
  "approverPresent": "co_present | other_adult"
}
```

Attestation UI required before Approve ([DECISIONS.md](./DECISIONS.md)).

### Edit rules (Phase 2)

| Event | Result |
|-------|--------|
| Edit draft before submit | No hash |
| Submit | `requestHash` H1 |
| Withdraw before approve | H1 invalidated; back to draft |
| Approve H1 | Approved |
| Edit after approve | New submit H2; re-approval required |
| Parent edit before approve | New hash + auto-approve (recommended) |
| Soft-delete session | `deletedAt` set; hash history retained |

### Display states (Phase 2 UI)

| State | UI |
|-------|-----|
| Draft | "Not submitted" |
| Submitted, no approval | "Pending approval" |
| Hash approved | "Approved by [name], [date]" |
| Newer hash than approved | "Superseded — approval on prior version" |
| Session &lt; 5 min (submitted anyway) | Warning badge on record |

Export does **not** include internal record hashes — those stay in the database for integrity only.

---

## Verification on load

Recompute hash from stored `payloadJson`; mismatch → corruption warning, block export.

Optional later: HMAC on approve for PDF footer ([WISHLIST.md](./WISHLIST.md)).

## Security expectations

- Hash proves internal consistency and (Phase 2) approval binding — not protection against a compromised device or falsified inputs.
- Family-trust product: attestation (adults confirm accuracy) is the trust mechanism, not cryptography alone.
- Device clock manipulation can affect `startedAt`/`endedAt`; acknowledged and accepted for MVP.
- Encrypted SQLite at rest → post-MVP ([WISHLIST.md](./WISHLIST.md)).
