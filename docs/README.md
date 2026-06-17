# TeenDriver — Design Documentation

Product design and planning docs for a cross-platform teen permit driving-hours tracker (IL-first).

## Document index

| Document | Purpose |
|----------|---------|
| [MVP.md](./MVP.md) | First release scope and policies |
| [WISHLIST.md](./WISHLIST.md) | Post-MVP and future ideas |
| [SESSION_LIFECYCLE.md](./SESSION_LIFECYCLE.md) | Session states, flows, who can do what |
| [APPROVAL_AND_HASH.md](./APPROVAL_AND_HASH.md) | Submit hash, approval binding, edits |
| [DATA_MODEL.md](./DATA_MODEL.md) | Core entities and local/sync fields |
| [NOTIFICATIONS.md](./NOTIFICATIONS.md) | Push events and recipients |
| [OFFLINE_SYNC.md](./OFFLINE_SYNC.md) | Local-first storage and sync rules |
| [ILLINOIS_RULES.md](./ILLINOIS_RULES.md) | IL GDL requirements for v1 |
| [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) | Market scan, gaps, your validation tasks |
| [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) | EAS, Expo Go, devices, emulators, testing phases |

## How we maintain these docs

- **MVP** changes require explicit agreement before implementation diverges.
- **Wishlist** items are ideas only until promoted to MVP or a sprint.
- Update docs when product policy changes (especially approval, hash, and session rules).

## Stack (planned)

- React Native + Expo, JavaScript
- Minimal backend: auth, teen–adult linking, push, sync metadata
- Local-first session storage

## Official references (IL)

- [IL GDL — Teen Driver Safety](https://www.ilsos.gov/departments/drivers/teen_driver_safety/gdl.html)
- [50-Hour Practice Driving Log (DSD X152)](https://www.ilsos.gov/content/dam/publications/pdf_publications/dsd_x152.pdf)
