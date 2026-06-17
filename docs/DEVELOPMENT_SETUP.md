# Development Setup and Testing

How we build and test TeenDriver on **Windows**, with an **iPhone** and **Android emulator** (no Android phone required to start).

**Related:** [MVP.md](./MVP.md) (stack), [WISHLIST.md](./WISHLIST.md) (Live Activity, dev builds).

---

## What is EAS?

**EAS** = **Expo Application Services** — Expo’s hosted toolkit for native app lifecycle tasks you cannot do with JavaScript alone on your laptop.

| Service | What it does |
|---------|----------------|
| **EAS Build** | Compiles **real** `.ipa` (iOS) and `.apk` / `.aab` (Android) in the cloud (macOS workers for iOS). Required when you outgrow Expo Go or need custom native code. |
| **EAS Submit** | Uploads builds to **App Store Connect** and **Google Play**. |
| **EAS Update** | Ships **JS/asset updates** over the air to apps that already use a compatible native binary (not a substitute for every native change). |

**EAS is not your app.** It is infrastructure around the Expo project (configured via `eas.json`, Expo account, CLI `eas build` / `eas submit`).

### When you need EAS vs not

| Phase | Typical approach |
|-------|----------------|
| Early UI + logic | **Expo Go** on devices (no EAS required) |
| Custom native modules (e.g. Live Activity, certain push setups) | **Development build** → often **EAS Build** (especially iOS from Windows) |
| TestFlight / Play internal testing | **EAS Build** + **EAS Submit** (or local builds on Mac for iOS) |
| App Store / Play release | **EAS Build** + **EAS Submit** |

**On Windows:** you cannot compile iOS binaries locally; **EAS Build** is the usual path to iOS TestFlight without owning a Mac.

- Docs: [Expo — EAS](https://docs.expo.dev/eas/)
- Pricing: free tier exists; paid tiers for more build minutes / team features.

---

## What is Expo Go?

**Expo Go** is a **pre-built sandbox app** published by Expo on the **App Store** and **Google Play**. It already contains many common native modules Expo supports.

### Where it is installed

| Location | Role |
|----------|------|
| **Your laptop** | **Expo CLI** / `npx expo start` (via Node.js project). Serves your JavaScript bundle and shows a QR code. **Do not** install “Expo Go” on the laptop. |
| **iPhone** | Install **Expo Go** from the App Store. |
| **Android emulator or phone** | Install **Expo Go** from Play Store (or sideload APK into emulator). |

Flow:

```text
Laptop:  TeenDriver project  →  npx expo start  →  dev server + QR
Phone:   Expo Go scans QR     →  downloads bundle  →  runs your app UI
```

Same project, same JS/TS codebase — Expo Go loads it on both platforms for development.

### What Expo Go handles (cross-platform)

Expo Go **does** handle well for early development:

- React Native UI across iOS and Android
- Expo SDK APIs that are **included in Expo Go** (camera, location, many file APIs, etc. — check [supported modules](https://docs.expo.dev/versions/latest/))
- Fast refresh, logging, basic navigation
- Proving layouts, flows, and local state before native customization

Expo Go **does not** replace a production app. It is a **shared development container**, not your branded “TeenDriver” binary.

### What Expo Go does *not* handle (you need a development or production build)

Anything that requires **native code not bundled into Expo Go**, for example:

- **iOS Live Activities** (lock screen session UI)
- **Custom native modules** not in the Expo Go app
- **Custom app icon / name** as the installed App Store app (Expo Go always shows as “Expo Go”)
- Some **push notification** setups tied to your app’s bundle ID
- **Sign in with Apple** in production-like configuration (often needs your bundle ID)

For those, you create a **development build** (`expo-dev-client`) or **production build** — usually via **EAS Build**.

### Is Expo Go a good choice for cross-platform?

| Use case | Verdict |
|----------|---------|
| **Starting the project**, shared screens, navigation, local DB, most business logic | **Yes — excellent** |
| **Proving iOS + Android** without two store submissions | **Yes** |
| **Shipping MVP to real users** with TeenDriver branding, full push, Live Activity | **No — move to dev/production builds** |
| **Long-term “the product”** | **No** — ship your own binary |

**Recommendation for TeenDriver:**

1. **Phase 1:** Expo Go + iPhone + Android emulator (Windows).
2. **Phase 2:** Development builds when implementing push, app identity, lock screen features.
3. **Phase 3:** EAS Build → TestFlight / Play internal testing → store release.

---

## Expo vs React Native (one sentence)

- **React Native** = cross-platform UI framework.
- **Expo** = tooling, SDK, and services on top of RN (CLI, modules, EAS, Expo Go).

We use **Expo** (managed workflow with prebuild when needed), not bare RN from scratch.

### JavaScript vs TypeScript

This repo uses **JavaScript** (`.jsx`). TypeScript is optional for React Native; we chose JS for simpler onboarding. Complex areas (canonical hash payloads, session state) can use **JSDoc** `@typedef` comments later if we want hints without a TS build step.

---

## Your environment (Windows + iPhone, no Android phone yet)

### iOS — physical iPhone (primary)

- Install **Expo Go** on the iPhone.
- Laptop and phone on same Wi‑Fi, or use `npx expo start --tunnel` if LAN blocks discovery.
- **iOS Simulator is not available on Windows** (requires Mac + Xcode). Use the iPhone for real iOS behavior.

### Android — emulator on Windows

1. Install [Android Studio](https://developer.android.com/studio).
2. **Device Manager** → Create Virtual Device (e.g. Pixel 6, API 34).
3. Start emulator; install **Expo Go** from Play Store inside the emulator.
4. `npx expo start` → press **`a`** to open on Android emulator, or scan QR if supported.

Enable CPU virtualization in BIOS if the emulator is slow or fails to start.

### Physical Android later

Useful for real GPS, notification behavior, and OEM-specific quirks — add when convenient, not blocking for sprint 1.

---

## Recommended testing matrix

| Capability | Expo Go | Dev build | Production build |
|------------|---------|-----------|------------------|
| UI / navigation / local DB | Yes | Yes | Yes |
| Android emulator | Yes | Yes | Yes |
| iPhone physical | Yes | Yes | Yes |
| iOS Simulator (Mac only) | Yes | Yes | Yes |
| App name/icon as TeenDriver | No | Yes | Yes |
| Live Activity (iOS) | No | Yes | Yes |
| Store-ready push (your bundle ID) | Limited | Yes | Yes |
| TestFlight / Play Store | No | Via EAS | Yes |

---

## Accounts and costs (when)

| Account | Needed for |
|---------|------------|
| **Expo** (free tier OK) | EAS Build, project dashboard |
| **Apple Developer** ($99/year) | TestFlight, App Store, production Sign in with Apple |
| **Google Play Console** ($25 one-time) | Play Store distribution |

Expo Go development does **not** require paid Apple/Google accounts.

---

## Quick start (iPhone + Expo Go)

The runnable app lives in [`../mobile/`](../mobile/).

```powershell
cd C:\Users\erica\Documents\Code\TeenDriver\mobile
npm install
npm start
```

1. Install **Expo Go** on iPhone (done).
2. PC and iPhone on the **same Wi‑Fi**.
3. Scan the **QR code** from the terminal in Expo Go.
4. Confirm the TeenDriver dev shell loads; edit `mobile/App.jsx` and save to test fast refresh.

If connection fails: `npx expo start --tunnel` (see [mobile/README.md](../mobile/README.md)).

**Node:** **20+** (24 LTS is fine). Run `node -v` before starting.

**Expo Go vs SDK:** App Store Expo Go tracks one SDK (e.g. **54.0.2**). The project must use the **same SDK** (`expo@^54` in `mobile/package.json`). SDK 56 projects need a newer Expo Go that may not be on the App Store yet for iOS.

---

## Tooling checklist (before first `expo start`)

- [ ] Node.js LTS installed
- [ ] Git (optional but recommended for this repo)
- [ ] Expo Go on iPhone
- [ ] Android Studio + one AVD (for Android)
- [ ] Expo account (when using EAS)

---

## Feature → testing note (MVP)

| MVP feature | Early test surface |
|-------------|-------------------|
| Teen start / stop / review | Expo Go, both platforms |
| “I’m with the driver” + push | Dev build + real devices (push unreliable in Expo Go for production-like flows) |
| Lock screen timer | iOS: dev build + iPhone; Android: ongoing notification in dev build |
| Offline / local DB | Expo Go OK |
| Sign in with Apple / Google | Expo Go for UI; production-like auth in dev build |
| Hash / approval flows | Expo Go OK |

---

## Plan mode vs implementation docs

| Doc type | Location |
|----------|----------|
| Product / MVP | [MVP.md](./MVP.md), [SESSION_LIFECYCLE.md](./SESSION_LIFECYCLE.md) |
| Tooling / devices / EAS / Expo Go | **This file** |
| Market research | [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) |

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-05-31 | Windows dev machine; iPhone for iOS; Android emulator until physical device; Expo Go for phase 1, EAS dev builds before store. |
