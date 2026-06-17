# Competitive Analysis

**Last updated:** 2026-05-31  
**Market:** US teen permit / supervised driving log apps  
**Our positioning:** Teen-owned session + in-progress adult join + hash-bound approval + cross-platform + IL-first.

> Ratings and review counts change frequently. Sections marked **YOU VERIFY** need your pass on the App Store / Play Store.

---

## Executive summary

| Finding | Implication |
|---------|-------------|
| **Many apps exist** — market is validated | Differentiate on workflow and trust, not “first log app” |
| **iOS-only leaders** (DriveLogs, GoTime, Moda, PermitLog) | Cross-platform Expo is a real advantage |
| **Moda is closest competitor** | Family link + verify + Live Activity — study UX, beat on approval provenance + Android + IL form |
| **Few do hash-bound approval** | Our submit-hash model is a defensible feature |
| **RoadReady** has brand/scale | Weak account model; don’t copy shared-login pattern |

---

## Feature gap opportunities (not just “better UX”)

| Gap | Competitors | Our MVP |
|-----|-------------|---------|
| Teen starts; adult **joins in progress** | Partial (family sync, not join) | **“I’m with the driver”** |
| Only teen + joined adult can **stop** | Rare | Yes |
| **Hash-bound approval** | Moda HMAC at save; not approval-specific | `requestHash` at submit |
| **Optional approval** with provenance on export | Mostly signature line on PDF | Full metadata |
| Approve without join → **supervisor name** | Uncommon | Required |
| **Explicit start**, end assist only | OtoZen/RoadReady auto-trip | Yes |
| Lock screen **stop → open app** for review | Moda timer on lock screen | Yes, no summary on LA |
| **Offline-first** + sync | DriveMint local; others cloud | Yes |
| **IL official form** | Moda: 7 states, **not IL** | IL-close MVP → DSD X152 later |
| **Cross-platform** teen + parent | Many iOS-only | Expo iOS + Android |

---

## Competitor scorecard (desk research)

Legend: **Y** = clearly advertised · **P** = partial/unclear · **N** = not advertised · **?** = verify on store

| App | iOS | Android | Price | Accounts / linking | Join in progress | In-app approval | Auto day/night | Export | Threat |
|-----|-----|---------|-------|-------------------|------------------|-----------------|----------------|--------|--------|
| **RoadReady** | Y | Y | Free | Shared login; separate accounts can’t merge easily | N | N | P | PDF email | Medium (brand) |
| **DriveLogs** | Y | **N** | $4.99 once | Unclear teen/parent roles | N | N | Y (sunset) | DMV-style PDF | Medium iOS |
| **GoTime** | Y | **?** | Free (store) | Family group sync | P | N | Y (sunset) | DMV reports | Medium |
| **Moda** | Y | **N** | $4.99 once | 6-digit family link | P (verify) | P (verify session) | Y | PDF/CSV; 7 official states, **not IL** | **High** |
| **PermitLog** | Y | **?** | One-time IAP | ? | N | N | Y | PDF; 50 states | Low–Med |
| **DriveMint** | Y | **N** | ? | No accounts; QR P2P | N | N | Y | PDF; offline | Low (different lane) |
| **LogIt** | Y | **?** | ? | “Parents verify entries” P | N | P | P | PDF | Low |
| **DMV Driving Hours Log** | Y | Y | ? | ? | N | N | Y | State layouts (e.g. CA) | Medium |
| **DriveClock** | Y | N | One-time | No accounts; iCloud | N | N | Y | PDF/CSV | Low |
| **OtoZen** | Y | Y | Freemium | Family safety app | N (auto trip) | N | Y | PDF | Low (adjacent) |
| **GUIDE2Safeti** | Y | Y | Subscription $$$ | Parent/teen | N | N | P | ? | Low (different lane) |
| **Teen Driving Log** | Y | **?** | Free/ad-free | No tracking claims | N | N | P | Share/backup | Low |
| **Student Driving Log** | **?** | Y | ? | Manual entry | N | N | P | PDF | Low Android |
| **Permit2Drive** | **?** | **?** | ? | Google Drive optional | N | N | P | Export | Low |

### Moda detail (primary benchmark)

- **Family linking:** parent code, up to 6 teens; parent sees sessions.
- **Unverified sessions:** still count; parent can verify from dashboard.
- **Live Activity:** timer on lock screen / Dynamic Island.
- **HMAC-signed records** at save (tamper detect, not edit lineage).
- **GPS:** coordinates stay on device; km totals may sync.
- **Official PDF fill:** IN, NC, NJ, NV, NY, OH, PA — **Illinois not listed**.
- **iOS 18+**, $4.99, very few ratings as of research date.

### RoadReady detail

- Free; DOT-adjacent program; **70M+ drives** claimed (program site).
- FAQ: **cannot link two accounts** for same driver — use one login or manual merge.
- Ohio variant: linked student + supervisor accounts (state-specific).
- Auto-stop logging; export via email.

### GoTime detail

- GPS auto time/distance; family sync; sunset day/night; weather/road tags.
- Free on App Store; **Android presence: YOU VERIFY**.

### DriveLogs detail

- iOS only; $4.99; cloud backup; weather + road type; 2-hour free trial.

### DriveMint detail

- No cloud; QR transfer between phones; auto-pause when stopped; privacy positioning.

---

## Comparison to our MVP workflow

| Step | Moda / others | TeenDriver MVP |
|------|---------------|----------------|
| Start | Teen/parent tap | **Teen only** |
| Adult engaged | Pre-select supervisor or family view | **“I’m with the driver”** during session |
| Stop | One tap; LA shows timer | Stop → **open app** for review |
| Review tags | Often automatic only | Teen confirms/edits → submit |
| Approval | Verify flag | **Approve `requestHash`**; supervisor name if not joined |
| Edit after approve | Unclear / new record | **Re-submit + re-approve** |

---

## Pricing landscape (snapshot)

| Model | Apps |
|-------|------|
| Free | RoadReady, GoTime (as listed), Teen Driving Log |
| One-time ~$5 | DriveLogs, Moda, DriveClock, PermitLog |
| Subscription | GUIDE2Safeti ($25/mo tier seen on store) |
| Freemium | OtoZen |

---

## Your validation tasks

Complete these on a spreadsheet (copy template below). Budget **45–60 minutes**.

### Task 1 — Store search (10 min)

Search both stores for:

- `teen driving log`
- `permit hours tracker`
- `DMV supervised driving log`
- `learner permit hours`

Note any apps **not** in our table; add a row.

### Task 2 — Review mining (20 min)

For **Moda**, **GoTime**, **DriveLogs**, **RoadReady**, **PermitLog**:

1. Sort reviews by **Most Recent**.
2. Tag complaints: `sync` | `data_loss` | `DMV_rejected` | `battery` | `UX` | `subscription` | `accuracy`
3. Save 2–3 verbatim quotes per app (1★–3★).

### Task 3 — Screenshot flows (15 min)

Capture:

- Session **start** screen
- **Active** / lock screen behavior
- **End** / summary
- **Export** PDF sample (if free or trial)

Store in `docs/competitive-screenshots/` (create folder).

### Task 4 — IL local check (10 min)

- Ask DMV office, driver ed teacher, or Illinois parents group: “What do you use for the 50-hour log?”
- Download [DSD X152](https://www.ilsos.gov/content/dam/publications/pdf_publications/dsd_x152.pdf) and note every column → update [ILLINOIS_RULES.md](./ILLINOIS_RULES.md) checklist.

### Task 5 — Android gap (5 min)

Confirm **Y/N** Android for: GoTime, PermitLog, LogIt, DriveLogs.

### Task 6 — Update this doc

Fill **YOU VERIFY** cells; add `Last validated: YYYY-MM-DD` at top.

---

## Spreadsheet template (copy to Sheets)

**Tab: Apps**

| App | iOS link | Android link | Price | Rating | # ratings | Last updated | Notes |
|-----|----------|--------------|-------|--------|-----------|--------------|-------|

**Tab: Features**

Use columns from [README](./README.md) competitive template:

`Teen account | Parent account | N adults | Social login | Push on start | Join in progress | Only joined can stop | Approve in app | Hash/integrity | Offline | IL official PDF | ...`

**Tab: Review themes**

| App | Theme | Quote | Date |
|-----|-------|-------|------|

---

## Sources (desk research)

| App | URL |
|-----|-----|
| DriveLogs | https://drivelogs.app/ |
| GoTime | https://apps.apple.com/us/app/gotime-teen-driving-log/id6759268978 |
| Moda | https://modadriving.com/ , https://modadriving.com/support , https://modadriving.com/faq |
| RoadReady | https://play.google.com/store/apps/details?id=com.saferoadsalliance.roadready , https://app.roadreadyapp.com/faq/ |
| DriveMint | https://apps.apple.com/us/app/drive-mint-dmv-permit-log/id6759653709 |
| PermitLog | https://apps.apple.com/us/app/permitlog-driving-hours/id6761863108 |
| DMV Driving Hours Log | https://dmvdrivinglog.com/ |
| Permit2Drive | https://permit2drive.com/ |
| IL GDL | https://www.ilsos.gov/departments/drivers/teen_driver_safety/gdl.html |

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-05-31 | Initial desk research; Moda = primary benchmark |
| | |
