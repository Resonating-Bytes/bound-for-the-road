# Session Lifecycle

Decisions: [DECISIONS.md](./DECISIONS.md)

---

## Phase 1 (MVP) — teen only

### Concepts

| Term | Meaning |
|------|---------|
| **Session** | One practice drive from Start until saved, discarded, or soft-deleted. |
| **Draft** | Post-stop, pre-save; mutable. |
| **Saved** | Completed record with `requestHash`; counts toward progress. |

### State machine

```mermaid
stateDiagram-v2
  [*] --> Active: teen_start
  Active --> Draft: teen_stop
  Draft --> Active: resume
  Draft --> [*]: discard
  Draft --> Saved: save
  Saved --> Draft: edit
  Saved --> [*]: soft_delete
```

### Who can do what (Phase 1)

| Action | Teen |
|--------|------|
| Start | Yes |
| Stop | Yes |
| Review Save / Discard / Resume | Yes |
| Edit saved (dashboard) | Yes |
| Soft-delete saved | Yes |

### Flow

1. **Start** — `status = active`; schedule 2-hour local nudge ([NOTIFICATIONS.md](./NOTIFICATIONS.md)).
2. **Stop** — pause timer; `status = draft`; open Review screen.
3. **Stale active** — on app open, if active **&gt; 24 hours**, auto-stop to `draft`, notify teen, open Review.
4. **Review** — show duration, day/night, notes; warn if &lt; 5 min on Save.
5. **Save** — compute hash, `status = saved`; cancel nudge.
6. **Discard** — delete draft row (never saved).
7. **Edit** (from dashboard) — `saved` → `draft`; clear hash until re-save.

---

## Phase 2 — multi-actor (future)

Full design retained for implementation later.

### Additional concepts

| Term | Meaning |
|------|---------|
| **Active supervisor** | Adult who tapped **“I’m with the driver”**. |
| **Submitted** | Frozen hash awaiting approval. |
| **Approved** | Approval record for `requestHash`. |

### Additional states

```mermaid
stateDiagram-v2
  Saved --> Submitted: submit_for_approval
  Submitted --> Approved: adult_approve
  Submitted --> Draft: withdraw
  Approved --> Submitted: edit_resubmit
```

**Withdraw:** teen may withdraw a submitted session before approval → back to `draft`; hash invalidated; pending approval notifications voided.

**Delete:** teen may delete at any state (confirm always). Soft-delete recommended; removes session from progress totals.

**Teaching responsibility (Phase 2):** teen starts and submits; adult joins when actually supervising; adult approves with explicit attestation — honest record of who was present.

- Adult **join** in progress; adult **stop** (post-MVP per [WISHLIST.md](./WISHLIST.md)).
- Push on start, submit, approve — [NOTIFICATIONS.md](./NOTIFICATIONS.md) Phase 2 section.

See [ONBOARDING.md](./ONBOARDING.md) for linking gates.
