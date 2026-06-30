# Onboarding Flow

What new users see after first sign-in, and how the teen–adult link is established.

Read [AUTH.md](./AUTH.md) first — this doc picks up after `is_new_user: true` is returned.

---

## Phase 1 (MVP) exception

**Authoritative for full product below.** MVP overrides ([DECISIONS.md](./DECISIONS.md)):

| Full product | MVP (Phase 1) |
|--------------|---------------|
| Screen 1 — role selection | **Skipped** — teen-only app |
| Teen screens 2–5 | **Yes** — all required |
| Permit issue date skippable | **No** — required before dashboard |
| Part 2 — linking | **Skipped** — go to dashboard after profile |
| Adult onboarding | **Phase 2** |

MVP flow: mock sign-in → Name → DOB → State → Permit date → Dashboard.

Screens: [SCREENS.md](./SCREENS.md).

---

## Overview (Phase 2+)

Onboarding has two parts:
1. **Profile setup** — role selection and required fields
2. **Linking** — connecting a teen and adult account

Both must be complete before the app's main features are accessible.

---

## Part 1: Profile setup

### Screen 1 — Role selection

Shown to every new user immediately after first sign-in.

> **"Are you a teen driver or a supervising adult?"**
> [ I'm a teen driver ] [ I'm a supervising adult ]

- Role is written to the backend immediately on selection.
- Role cannot be changed after this screen without contacting support.
- If the user backs out without selecting, they see this screen again on next open.

---

### Teen onboarding (4 screens)

**Screen 2 — Name**
- Field: Legal first and last name
- Pre-filled from Apple/Google if available
- Hint: "Use your full legal name — it appears on your driving log"

**Screen 3 — Date of birth**
- Date picker
- Must be 13 or older to proceed (show error if under 13: "Bound for the Road is for drivers aged 13 and up")
- Stored for age verification only; not displayed elsewhere in MVP

**Screen 4 — State**
- Picker, pre-selected to Illinois (IL only in MVP)
- Note: "More states coming soon"

**Screen 5 — Permit issue date**
- Date picker: "When did you get your learner's permit?"
- Used to calculate the 9-month holding period eligibility date on the dashboard
- Self-reported; app does not verify
- Can be updated later in Settings

**MVP:** permit issue date is **required** — no skip. See Phase 1 exception at top of this doc.

After Screen 5 (Phase 2+): profile saved → linking (Part 2). **MVP:** profile saved → dashboard.

**Driving schools (when Phase 3 ships):** before or with school picker — optional **ZIP** field:

- Hint: *Optional. Used to show driving schools near you if you enter it.*
- Not required to continue; school list still works via state browse and name search without it.

**Instructor (Phase 1+):** **Driving instructor** → name → **6-digit school code** (skipped if email auto-matches school owner) → dashboard. Link teens in **Settings**. See [DRIVING_SCHOOLS.md](./DRIVING_SCHOOLS.md#static-school-code-poc--small-schools).

---

### Adult onboarding (1 screen)

**Screen 2 — Name**
- Field: Legal first and last name
- Pre-filled from Apple/Google if available
- Hint: "Use your full legal name — it appears on driving log approvals"

After Screen 2: profile saved to backend → proceed to linking (Part 2).

---

## Part 2: Linking a teen and adult

Linking requires one side to initiate and the other to accept. Either side can go first.

### Option A: Teen invites adult (recommended flow)

1. Teen taps **"Add a supervisor"** at end of onboarding (or later from Settings).
2. App calls `POST /links/invite` → backend returns a **6-digit code** valid for 24 hours.
3. Teen sees: "Share this code with your supervising adult: **482 916**" with a copy button and a share sheet option (SMS/iMessage is the natural channel).
4. Adult opens Bound for the Road, completes their own onboarding if needed, then taps **"I have an invite code"**.
5. Adult enters the 6-digit code.
6. App calls `POST /links/accept` → link created with status `active`.
7. Both sides see confirmation: "You're now linked with [Name]."

### Option B: Adult enters first (adult has the app, teen doesn't yet)

Same flow — adult sees **"Link with a teen driver"** and is told to ask the teen to download the app and share a code. The adult cannot generate the code; the teen must.

### Invite code UX details

- 6 digits, displayed with a space in the middle for readability: `482 916`
- Valid for 24 hours from generation
- Single-use — invalidated after accepted
- If expired: teen generates a new one
- If wrong code: show "Invalid or expired code. Ask the driver to share a new one."
- Codes are case-insensitive and ignore spaces (so `482916`, `482 916`, `482-916` all work)

---

## Onboarding completion gates

The app's main session features are locked until:

| Role | Gate |
|------|------|
| Teen | Profile complete **and** at least one active adult link |
| Adult | Profile complete **and** at least one active teen link |

If profile is complete but no link yet, show a "waiting" screen:
- **Teen:** "Now invite a supervising adult" — shows invite code UI
- **Adult:** "Ask your teen to share an invite code" — shows code entry UI

Users can still access Settings and their profile while waiting for a link.

---

## Re-onboarding edge cases

| Situation | Behavior |
|-----------|---------|
| User uninstalls and reinstalls | Auth token is gone; must sign in again. `is_new_user: false` → skip profile setup, go to dashboard (profile already exists on backend) |
| User gets a new phone | Same as above — sign in, local DB rebuilds from backend sync |
| Teen's adult link is removed | Teen sees "No supervisors linked" banner; can generate a new invite code. Existing approved sessions are unaffected. |
| Adult's teen link is removed | Adult sees "No drivers linked" banner. Existing approvals are unaffected. |

---

## Settings (post-onboarding)

Fields the user can update after onboarding:

| Field | Teen | Adult |
|-------|------|-------|
| Legal name | ✅ (affects future records only) | ✅ (affects future approvals only) |
| Permit issue date | ✅ | — |
| Manage links (add/remove) | ✅ | ✅ |
| Sign out | ✅ | ✅ |

Role cannot be changed in Settings.
