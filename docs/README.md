# TeenDriver

Design and implementation workspace for a cross-platform teen permit supervised-driving log app (Illinois first).

## Status

**In development** — Expo shell in [`mobile/`](./mobile/). All design decisions resolved. Ready for implementation.

### Run on your iPhone (Expo Go)

```powershell
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go. See [`mobile/README.md`](./mobile/README.md) for troubleshooting.

## Start here

New to the project? Read in this order:

1. [MVP.md](./MVP.md) — what we're building and why
2. [SESSION_LIFECYCLE.md](./SESSION_LIFECYCLE.md) — the core session flow
3. [TODO.md](./TODO.md) — current status and implementation roadmap

## Documentation index

| Doc | Description |
|-----|-------------|
| [MVP.md](./MVP.md) | First release scope, principles, roles, decisions |
| [SESSION_LIFECYCLE.md](./SESSION_LIFECYCLE.md) | Session states, flows, who can do what |
| [APPROVAL_AND_HASH.md](./APPROVAL_AND_HASH.md) | Hash integrity, approval binding, attestation model, schema versioning |
| [DATA_MODEL.md](./DATA_MODEL.md) | All entities, local/sync fields, ORM approach |
| [NOTIFICATIONS.md](./NOTIFICATIONS.md) | Push events, recipients, Android channels, build-phase reliability |
| [OFFLINE_SYNC.md](./OFFLINE_SYNC.md) | Local-first storage, outbox queue, backend requirements |
| [ILLINOIS_RULES.md](./ILLINOIS_RULES.md) | IL GDL requirements, day/night rules, export fields |
| [AUTH.md](./AUTH.md) | Sign in with Apple + Google, token flow, session storage, Expo Go mock approach |
| [BACKEND.md](./BACKEND.md) | Supabase, API endpoints, RLS rules, cost and scalability |
| [ONBOARDING.md](./ONBOARDING.md) | Role selection, teen/adult screens, invite code linking flow |
| [CROSS_PLATFORM.md](./CROSS_PLATFORM.md) | iOS vs Android capability matrix, Live Activity, foreground service, EAS profiles |
| [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) | Expo Go phases, Windows + iPhone + Android emulator setup |
| [WISHLIST.md](./WISHLIST.md) | Post-MVP features: heat map, multi-state engine, GPS stall detection, and more |
| [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) | Market scan and validation tasks |
| [TODO.md](./TODO.md) | Work tracker and implementation roadmap — read this every session |

## Planned stack

- React Native + Expo (managed workflow), JavaScript
- Local-first storage: Drizzle ORM + expo-sqlite
- Backend: Supabase (Postgres + RLS + Edge Functions)
- Push: FCM (Android) + APNs (iOS) via Expo Push API
- Auth: Sign in with Apple (iOS) + Google Sign-In (both platforms)

## Illinois references

- [GDL requirements](https://www.ilsos.gov/departments/drivers/teen_driver_safety/gdl.html)
- [50-hour log form (DSD X152)](https://www.ilsos.gov/content/dam/publications/pdf_publications/dsd_x152.pdf)
