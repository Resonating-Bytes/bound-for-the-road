# Approval and Hash

## Principle

**Approval is for a specific snapshot of data**, not a living row that can change underneath the approver.

- **No hash** during `active` or `draft`.
- **Hash at submit:** `requestHash = SHA-256(canonicalPayload)`.
- **Approval** stores `requestHash` only.
- Display **“Approved”** only when an approval exists for the hash being viewed/exported.

Multiple approvals for the same hash are **meaningless** (idempotent; store one).

## Canonical payload (at submit)

Serialize with **stable key order** and normalized types (UTC ISO times, integer minutes).

Include at minimum:

```json
{
  "schemaVersion": 1,
  "sessionId": "uuid",
  "stateCode": "IL",
  "startedAt": "ISO-8601",
  "endedAt": "ISO-8601",
  "endedBy": "teen | adult | system_stall",
  "activeSupervisorId": "uuid-or-null",
  "activeSupervisorJoinedAt": "ISO-8601-or-null",
  "durationMinutes": 42,
  "nightMinutes": 12,
  "tags": {},
  "supervisorInVehicle": {
    "linkedUserId": "uuid-or-null",
    "legalName": "Jane Doe"
  },
  "submittedAt": "ISO-8601",
  "submittedByUserId": "uuid"
}
```

Exclude: sync flags, `updatedAt`, device-only caches.

**Algorithm:** SHA-256 → hex string (display truncated in UI).

Optional later: `signature = HMAC(serverSecret, requestHash)` on approve for PDF.

## Approval record

```json
{
  "approvalId": "uuid",
  "sessionId": "uuid",
  "requestHash": "hex",
  "approvedByUserId": "uuid",
  "approvedAt": "ISO-8601",
  "approverPresent": "co_present | remote | unknown",
  "supervisorInVehicleName": "string",
  "joinedSession": true
}
```

### Adult did not tap “I’m with the driver”

On approve UI:

- Require **name of adult in vehicle**, OR
- **“I was with them”** → set `supervisorInVehicleName` to approver’s legal name and `joinedSession: false` (or `approverPresent: co_present` if button implies physical presence).

### Adult joined session

- `joinedSession: true`; supervisor name defaults from profile unless teen edited in draft.

## Edit rules

| Event | Result |
|-------|--------|
| Teen edits draft before submit | No hash yet |
| Teen submits | `requestHash` H1 |
| Parent approves H1 | Approved |
| Teen edits after approve | New submit H2; H1 approval historical only |
| Parent edits before approve | New hash H2; recommend auto-approve H2 |
| Teen deletes session | Remove session + hashes + approvals (or soft-delete policy) |

**Re-approval:** required after any post-approval edit.

## Display

| State | UI |
|-------|-----|
| Draft | “Not submitted” |
| Submitted, no approval | “Pending approval” |
| Hash approved | “Approved by [name], [date]” |
| Newer hash than approved | “Superseded — approval on prior version” |

Export footer (optional): `Record ID: a1b2…c3` (truncated hash).

## Verification on load

Recompute hash from stored payload; if mismatch → corruption warning, block export.

## Security expectations

- Hash chain proves **internal consistency** and **approval binding**; not proof against a compromised device.
- Family-trust product; stronger attestation is wishlist.
