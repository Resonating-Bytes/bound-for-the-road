# Wishlist — Post-MVP

Items here are **not** committed for first release. Promote to [MVP.md](./MVP.md) when scoped for a sprint.

## Supervisor qualification

- Verify adult meets state supervisor rules (age, license tenure, relationship where applicable).
- Store only **`supervisorVerified: boolean`** (default `false`).
- **Do not** persist license number or verification PII on device or server.

## Adult nicknames

- Teen assigns display nicknames (“Mom”) on dashboard.
- Export and official log use **legal name** from adult profile.

## Export and forms

- Pixel-perfect per-state PDFs; **IL DSD X152** as first official layout target.
- Pre-filled official DMV forms for states that publish templates (cf. Moda: IN, NC, NJ, NV, NY, OH, PA).

## Location and automation

- Geofence **home** → end-session hint (with confirmation).
- Suggest **trimmed end time** at last movement when user forgot to stop.
- Weather API for conditions tag.
- In-town vs highway from GPS / road graph.
- Co-present along **route** (legal/privacy review required).

## Notifications

- Push session start only to adults within **proximity** of teen; fallback to all linked.

## Session UX

- Driving focus: link to system Do Not Disturb (cannot mute all third-party notifications).
- Apple Watch: timer + stop (evaluate safety).

## Multi-state

- Full rules engine: total/night hours, holding period, eligible supervisors, export field sets.
- Dashboard auto-adjusts by `stateCode`.

## Integrity

- HMAC or server signature on `requestHash` at approve for PDF footer.
- Soft-delete with append-only audit log for disputes.

## Platform and growth

- Parent read-only web portal.
- Milestones (25/50/75/100%) if not noisy.
- Skills checklist aligned with state parent-teen guides.

## Competitive parity (validate before building)

- Multi-teen per parent household (may be MVP-adjacent).
- Family Sharing / store purchase model decisions.
