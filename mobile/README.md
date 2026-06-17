# Bound for the Road — mobile app (Expo)

Expo SDK **54** · local SQLite · Phase 1 teen flow

## Prerequisites

- **Node.js 20+** — `node -v`
- **Expo Go** on iPhone ([App Store](https://apps.apple.com/app/expo-go/id982107779)), matching **SDK 54**

## First run

From this folder:

```powershell
npm install
npm start
```

1. PC and iPhone on the **same Wi‑Fi**
2. Open **Expo Go** and scan the QR code
3. Mock sign-in → onboarding → dashboard → Start → Stop → Save

**Phase 1 flow:** mock sign-in → onboarding (name, DOB, state, permit date) → dashboard → start/stop → review (Save / Discard / Resume) → export from dashboard.

**Troubleshooting** (LAN, firewall, tunnel, port 8081, SDK mismatch): [`../docs/DEVELOPMENT_SETUP.md`](../docs/DEVELOPMENT_SETUP.md#troubleshooting-windows--iphone).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server + QR (LAN) |
| `npm run start:lan` | LAN mode explicit |
| `npm run start:tunnel` | Tunnel via ngrok (needs authtoken — see dev setup doc) |
| `npm run ngrok:authtoken` | One-time ngrok token (`$env:NGROK_AUTHTOKEN=...`) |
| `npm run kill:metro` | Free port 8081 on Windows |
| `npm run android` | Android emulator |
| `npm run web` | Browser preview (UI only) |
| `npm test` | Jest (CI mode) |
| `npm run test:watch` | Jest watch |

## Layout

| Path | Role |
|------|------|
| `App.jsx` | DB init + navigation root |
| `src/db/` | Drizzle schema, migrations, queries |
| `src/utils/` | time, day/night, hash, export, notifications |
| `src/screens/` | Phase 1 UI |
| `src/context/AuthContext.jsx` | mock auth + profile |
| `app.json` | Expo config |

Product specs: [`../docs/`](../docs/)
