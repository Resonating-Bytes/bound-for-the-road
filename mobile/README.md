# TeenDriver — Mobile app (Expo)

## Prerequisites

- **Node.js 20+** (24 LTS is fine). Check: `node -v`
- **Expo Go SDK must match the project** — this app uses **Expo SDK 54** (same as App Store Expo Go 54.x).
- **Expo Go** on your iPhone ([App Store](https://apps.apple.com/app/expo-go/id982107779))

## First run (iPhone)

1. Open a terminal in this folder:

   ```powershell
   cd C:\Users\erica\Documents\Code\TeenDriver\mobile
   ```

2. Install dependencies (if you haven't):

   ```powershell
   npm install
   ```

3. Start the dev server:

   ```powershell
   npm start
   ```

4. On your **iPhone**:
   - Same Wi‑Fi as your PC
   - Open **Expo Go**
   - Scan the **QR code** from the terminal (or from the page that opens in your browser)

5. You should see **TeenDriver** mock sign-in. Complete onboarding, then try Start → Stop → Save on the dashboard.

### Phase 1 app flow

Mock sign-in → onboarding (name, DOB, IL, permit date) → dashboard → start/stop session → review (Save / Discard / Resume) → export all from dashboard.

### If the phone can't connect ("Could not connect to development server")

Your PC is running Metro, but the iPhone can't reach `192.168.x.x:8081`. Try in order:

1. **Keep Metro running** — wait until the terminal shows `iOS Bundled …` before scanning.
2. **Same Wi‑Fi** — phone and PC on the same network (not guest Wi‑Fi).
3. **Windows Firewall (LAN — try this before tunnel)** — allow Node on private networks:
   - Windows Security → Firewall → Allow an app → **Node.js** → **Private** checked.
   - Or run PowerShell **as Administrator**:
     ```powershell
     New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow
     ```
   - Then: `npm run start:lan` and scan the QR code.
4. **Tunnel mode** (only if LAN still fails — requires **your** ngrok account; see below):
   ```powershell
   npm run kill:metro
   npm run start:tunnel
   ```
   Wait for `Tunnel ready.` and scan the **new** QR code. **Do not** accept port 8082 — free 8081 first with `kill:metro`.

### Tunnel fails (`Cannot read properties of undefined (reading 'body')`)

That message is misleading. The real error from ngrok is usually:

```text
ERR_NGROK_4018 — Usage of ngrok requires a verified account and authtoken.
```

Expo's built-in shared ngrok token **no longer works**. You need a **free ngrok account** (one-time setup):

1. Sign up: https://dashboard.ngrok.com/signup  
2. Copy your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken  
3. Register it (PowerShell — token is not stored in the repo):

   ```powershell
   cd C:\Users\erica\Documents\Code\TeenDriver\mobile
   $env:NGROK_AUTHTOKEN="paste_your_token_here"
   npm run ngrok:authtoken
   ```

4. Free port 8081, then tunnel:

   ```powershell
   npm run kill:metro
   npx expo start --tunnel -c
   ```

**Recommended:** skip tunnel and use **LAN + firewall** (section above). You already had the app working that way — it's faster and doesn't depend on ngrok.

Other tunnel failures:

- **Windows Defender** quarantining `node_modules\@expo\ngrok-bin-win32-x64\ngrok.exe` — restore and allow, then `npm install`
- **Port 8082 prompt** — say **no**; run `npm run kill:metro` and stay on 8081

### If the phone can't connect (other)

- In the terminal, press **`s`** to switch connection mode, or start with tunnel:

  ```powershell
  npx expo start --tunnel
  ```

  (Tunnel is slower but works when Wi‑Fi blocks device-to-PC traffic.)

- Allow **Node** through Windows Firewall if prompted.

### Port 8081 already in use

Metro **always** uses port **8081** — for both LAN and tunnel. Tunnel does not use a separate port; ngrok forwards *to* 8081. So this error almost always means **a prior Metro/Expo (or Node) process is still running**, not a "zombie tunnel" on another port.

Common causes:

- Previous terminal still running `npm start` / `npm run start:tunnel`
- Metro didn't exit cleanly after `Ctrl+C`
- A second terminal trying to start while the first is still up

**Find what's using 8081:**

```powershell
netstat -ano | findstr :8081
```

The last column is the PID. Match it in Task Manager, or:

```powershell
taskkill /PID <pid> /F
```

**Shortcut (this repo):**

```powershell
npm run kill:metro
```

Then start again: `npm start` or `npm run start:tunnel`.

### "Requires a newer version of Expo Go"

The project **SDK version must match** your Expo Go app. App Store Expo Go is often **SDK 54**; `create-expo-app` may default to SDK 56. This repo is pinned to **SDK 54** for Expo Go 54.0.2.

After changing SDK: stop Metro, then `npx expo start -c`.

### If you see a Node version error

Upgrade Node to **20+** from [nodejs.org](https://nodejs.org/), then:

```powershell
cd C:\Users\erica\Documents\Code\TeenDriver\mobile
npm install
npm start
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server + QR for Expo Go (LAN) |
| `npm run start:lan` | Same as start, LAN mode explicit |
| `npm run start:tunnel` | Tunnel via ngrok (**requires your ngrok authtoken** — see README) |
| `npm run ngrok:authtoken` | One-time ngrok token setup (`$env:NGROK_AUTHTOKEN=...`) |
| `npm run kill:metro` | Free port 8081 (stale Metro/Node on Windows) |
| `npm run android` | Open on Android emulator (needs Android Studio) |
| `npm run web` | Browser preview (quick UI check only) |
| `npm test` | Jest unit + component tests (CI mode) |
| `npm run test:watch` | Jest watch mode for local dev |

## Project layout

- `App.jsx` — DB init + navigation root
- `src/db/` — Drizzle schema, migrations, queries
- `src/utils/` — time, day/night, hash, export, notifications
- `src/screens/` — Phase 1 UI
- `src/context/AuthContext.jsx` — mock auth + profile
- `app.json` — Expo config
- `assets/` — icons and splash

Product specs: [`../docs/`](../docs/)
