# Driving schools & instructor role

**Status:** Specced — answers merged from [DRIVING_SCHOOLS_QUESTIONS.md](./DRIVING_SCHOOLS_QUESTIONS.md).  
**Last updated:** 2026-06-22

**Goal:** Symbiotic loop — instructors promote the app in classroom BTW programs; the app drives teens to **paying** registered schools (schools **pay** for subscription to appear in the nearby list — not a revenue share to schools).

Related: [ONBOARDING.md](./ONBOARDING.md) · [DATA_MODEL.md](./DATA_MODEL.md) · [DECISIONS.md](./DECISIONS.md) · [PROXIMITY.md](./PROXIMITY.md) · [TODO.md](./TODO.md) · **[Open questions →](./DRIVING_SCHOOLS_QUESTIONS.md)** (fill in before coding)

**Prerequisites (met):** Phase 2 auth, linking, and proximity Phase A (parent submit targeting).

---

## Decisions summary (landed)

| Area | Decision |
|------|----------|
| **Role selection** | Teen \| Supervising adult \| **Driving instructor** (subtitle optional) |
| **Instructor onboarding** | Name → **6-digit school code** (or auto if email matches owner) → dashboard |
| **Instructor ↔ teen link** | Same teen **6-digit code** as parents; instructor enters in **Settings** (not onboarding) |
| **Instructor ↔ school (v1)** | **1:1**; static 6-digit `onboarding_link_id` per school (POC); **auto-link** same email as owner; expiring per-invite codes later |
| **Account rules** | No limit on linked adults or instructors per teen; **no** adult+instructor on same account |
| **Linked accounts UI** | **Instructor** badge only (parents unlabeled); nicknames; teen can remove either |
| **Instructor approval** | Same as parent (approve / send back); **pending only** on dashboard — approved sessions drop off |
| **Instructor dashboard** | School name header (SQL seed / affiliation); student-grouped pending; **hide** students with no pending when sort = newest pending |
| **Proximity radius** | **30 m** shared — teen submits at end of drive while still together |
| **Push priority** | Closest in radius wins **unless** any **instructor** is in radius → instructor wins over parent regardless of distance; if **no** instructor in radius → closest **parent** in radius gets push |
| **Multiple instructors in radius** | Closest instructor only |
| **Parent backup** | Dashboard always; push only when instructor not in radius (see push priority) |
| **School picker placement** | After linking (or skip), before dashboard |
| **School list without ZIP** | **No list** until search area entered |
| **Other school** | Name required; contact optional; **log lead only** (no auto-email) |
| **Don’t know school** | Allowed forever; export **omits** school line |
| **School change / lapse** | Ratings stay on old school; lapsed subscription keeps teen’s selection (read-only OK); teen may change school anytime |
| **Export school** | No global school line; sessions **approved by instructor** show **instructor’s affiliated school** |
| **Ratings** | 1–5 stars; optional comment (**500 char** max); simple mean; report button (live, moderate later) |
| **School owner** | **Web-only** admin (no app dashboard); same Supabase auth OK — `school_admins` table, no fourth mobile role |
| **Geocoding** | Defer provider; distance sort when ready |
| **Grace / billing / referrals / download price** | **Deferred** |

---

## Implementation phases

Phases are **sequential themes**, not necessarily one PR each. Ship and test incrementally.

### Phase 1 — Instructor role + link + approval

- [ ] `users.role`: `instructor` (third role)
- [ ] Onboarding: **Driving instructor** → name → **6-digit school code** (or skip if auto-affiliated) → dashboard
- [ ] **Auto-affiliate:** instructor sign-up email matches school owner email → link `instructor_school` in DB; no email, no code entry
- [ ] Link to teens via **Settings** (teen’s 6-digit code — same flow as adult)
- [ ] **Instructor** badge on teen linked-accounts UI (parents unlabeled); nicknames; teen can remove
- [ ] Instructor uses **same approval UX** as adult (approve, send back); **pending only** on dashboard
- [ ] Instructor home: **school name header** + student-grouped pending list (sort alpha / newest pending)
- [ ] RLS: instructor sees linked teens for **approval context** only — **no** multi-teen progress dashboard
- [ ] POC: seed school with static **`onboarding_link_id`** + optional SQL instructor affiliation

**Test:** instructor can link, see student-grouped pending list, approve/decline like parent.

### Phase 2 — Push routing (instructor proximity + parent priority)

- [x] **`PROXIMITY_PUSH_RADIUS_METERS` = 30** (shared parents + instructors)
- [x] Same Realtime collection round; split recipients by role server-side (client role lookup + pick)
- [x] **Push rules:** any **instructor** in radius → closest instructor gets push (beats parents on distance); else closest **parent** in radius; else fallback all linked adults
- [x] Parent dashboard always shows pending; backup approve unchanged

**Test:** instructor in range gets push over closer parent; instructor out of range → parent in range gets push.

### Phase 3 — School registry + teen picker

- [ ] Table `driving_schools` + `school_subscriptions` (`subscribed`, `expires_at`)
- [ ] Listing gate: school appears in picker only when subscribed and not past grace (see grace config)
- [ ] Teen onboarding: school picker **after linking**, before dashboard; **no list without search area**
- [ ] **Settings → Driving schools** — **search area** field + radius **10 / 25 / 50** mi (default 25), sort distance / rating
- [ ] **Other** / **don’t know** paths per prior spec
- [ ] `teen_school_selection` — teen-owned row
- [ ] POC: **manual SQL** insert fake schools (e.g. “Northside Driving Academy”)

**Test:** teen picks school after entering search area; instructor-approved export lines show instructor school.

### Phase 4 — Ratings

- [ ] `school_ratings` — one row per `(user_id, school_id)`; editable; optional comment **max 500 chars**
- [ ] Unlock: teen after **≥1 session approved by a linked instructor**; linked adult after teen unlocks
- [ ] List: overall ★ + count (simple mean); detail: teen/adult breakdown; sort list by rating
- [ ] **Report** button — reviews go live; reports logged for later moderation

**Test:** cannot rate before unlock; edit updates average.

### Phase 5 — Web app (school owner + instructor invite)

- [ ] Web: school **self-serve create** — live when `subscribed=true` (manual at first)
- [ ] **Web-only** school admin — same Supabase auth; `school_admins` table (no fourth mobile role)
- [ ] **Solo operator:** owner email = instructor app email → **auto-link** to school (no invite email, no code)
- [ ] **Multi-instructor:** per-invite **expiring 6-digit codes** (replaces static school code); email optional with deep link + clipboard
- [ ] Until invite codes ship: each school has one static **`onboarding_link_id`** set at create (POC / small schools)

**Test:** create school in web UI; appears in app picker when subscribed.

### Phase 6 — Billing, grace UX, referrals, ROI (later)

- [ ] Payment integration (Stripe etc.)
- [ ] Grace-period warnings in app; delist rules
- [ ] Contact ROI stats (`school_contact_events`)
- [ ] Referral qualifying counts → subscription credits (N TBD)

---

## New role: Instructor

Third role alongside teen and adult, for **behind-the-wheel (BTW) driving instructors**.

| | Adult (parent/guardian) | Instructor |
|---|-------------------------|------------|
| Links with teen | Yes (teen code in onboarding or Settings) | Yes (**Settings** only — teen’s 6-digit code) |
| Multi-teen dashboard | Yes — teen switcher, progress, sessions per selected teen | **No** — pending-only queue grouped by student; school name header |
| Badge in teen linked list | *(none)* | **Instructor** (+ nickname) |
| Push on session submit | Proximity push; instructor in radius **wins** over parent | Proximity push when in radius (closest instructor) |
| School affiliation | N/A | Static **6-digit school code** at onboarding (POC); **auto** if email matches owner; expiring per-invite codes later |
| Approvals | Approve / send back | **Same**; approved sessions leave instructor dashboard |

**Onboarding:** Screen 1 **Driving instructor** → name → enter **6-digit school code** (skip if auto-affiliated to owner’s school) → dashboard. **Teen link** in Settings. Unaffiliated instructors prompted like unlinked adults.

---

## School ↔ instructor affiliation

Many schools are **solo operations** (owner is the instructor). Support that without friction.

### Auto-link (same email)

When an instructor completes mobile sign-up / onboarding:

1. Look up `school_admins` (or school create email) for the **same auth email**.
2. If exactly one matching school → create `instructor_school` row automatically.
3. **No** invite email, **no** code entry screen.

Owner can still use the mobile app as **instructor** only (not a separate “owner” app role).

### Static school code (POC → small schools)

When a school is created (SQL seed now, web later), assign a stable **6-digit `onboarding_link_id`** (same format as teen invite codes, but static per school for now).

- Instructor enters it once at onboarding to affiliate.
- Same code for all instructors at that school until per-invite expiring codes exist (Phase 5).
- POC: manual SQL inserts school + code; seed uses **`847291`** for Best Driving School.

### Per-invite codes (later)

Replace static code for multi-instructor schools:

- Owner generates invite → **expiring 6-digit code** (and optional email).
- Deep link to app; copy-to-clipboard for paste.
- Static `onboarding_link_id` can remain for owner auto-link or be retired per school.

## Two different “nearby” concepts

| | **School list (regional)** | **Approval (device-to-device)** |
|---|---------------------------|----------------------------------|
| **Purpose** | Teen picks a driving school | Instructor (or parent) gets push at submit |
| **Scale** | **10 / 25 / 50 mi** (teen setting, default 25); **no list without search area** | **30 m** — submit at end of drive while teen and supervisor still together |
| **Reference** | Optional **ZIP search term** + profile state | Teen + adult/instructor device GPS |
| **Sort** | Distance or average rating | Closest in radius wins |

---

## School subscription (minimal v1)

No payment integration in early phases.

| Field | Type | Notes |
|-------|------|--------|
| `subscribed` | boolean | When false, school hidden from picker |
| `expires_at` | date (nullable) | When past date, treat as lapsed subject to grace |

**Grace:** app config e.g. `SCHOOL_SUBSCRIPTION_GRACE_DAYS` — after `expires_at`, school stays listed / features work until grace ends (exact disabled features in Phase 6). Approvals for linked class teens should **continue during grace** (per prior product intent).

Price, renewal cadence, and Stripe **deferred**.

---

## School registry fields

| Field | Required | Notes |
|-------|----------|--------|
| Name | Yes | |
| Phone | Yes | Tap-to-call |
| Address | Yes | Geocoded for regional distance |
| Email | Yes | Tap-to-email |
| Website | No | |
| `subscribed` | Yes | |
| `expires_at` | No | |

---

## Teen onboarding — school selection

After profile basics:

1. **Optional ZIP** (if not already collected) — single field before or on school step:
   - Label/hint: **Optional.** Used to show driving schools near you. Not required to use the app.
   - Stored as search input for geocoding; **not** framed as home address or identity.
2. **Driving schools** list — only after search area entered; regional filter + sort (distance / rating).
3. Teen selects school, **Other** (name required), or **don’t know**.
4. Selection stored on teen profile; **editable only by teen** in Settings.

---

## Settings — Driving schools

Subsection for **teen** (read-only school display for linked adults as needed):

- **Search area** — text field framed as **search** (e.g. “ZIP or city to find schools”), not “your address.” Updates the regional filter when changed. Optional — clearing it falls back to state-wide browse + name search.
- Radius: **10 / 25 / 50** miles (default **25**)
- Sort: **distance** | **average rating**
- School detail: contact, ratings (when Phase 4 live)
- Change school (teen only)

**Copy principle:** ZIP is a **search term** for discovering schools, not personally identifying location data in the UI.

---

## Ratings & reviews

| Rule | Detail |
|------|--------|
| Who can rate | Teens and linked adults **independently** |
| Unlock | **≥1 session approved by a linked instructor** → teen may rate; then linked adult may rate **that school** |
| Scope | Registered schools only |
| Count | **One review per user per school**; **editable** |
| Teen vs adult | Separate averages + filtered lists on detail |
| Moderation | **Report** button; reviews live; moderation workflow later |
| School pick | **Teen only** |

---

## Approval proximity (instructors + parents)

When teen submits:

1. Resolve teen location (existing path).
2. Collect **linked instructor and parent** responses via Realtime (same round, **30 m** radius).
3. **Push recipient:**
   - If any **instructor** is in radius → **closest instructor** gets push (instructor **beats parent** even if parent is closer).
   - Else if any **parent** is in radius → **closest parent** gets push.
   - Else → fallback all linked adults (existing behavior).
4. All linked adults/instructors see pending on **dashboard** regardless of push.

Instructor dashboard shows **pending only** — no teen school name, no approved history.

---

## Instructor dashboard (v1 — decided)

**Different layout from parent dashboard** — no teen switcher, no per-teen progress summary.

### Header

- **School name** (affiliated school) as screen title / header when instructor is linked to a school.
- Before school affiliation (Phase 1 POC) or if unassigned: fallback title e.g. **Instructor dashboard**.
- Subscription grace banner under title when applicable (Phase 6).

### Body — students grouped with pending sessions

All **linked students** in one scrollable list. Each row group:

```
{Student name or nickname}
  └ pending session row(s) — date, duration, tap → Approve session
  └ (no pending) — optional “No sessions pending” or omit empty groups per sort mode
```

- **No** hour totals, progress bars, or eligibility widgets on this screen.
- Tap a pending row → same **Approve session** flow as adults (approve / send back).
- Students with **no** pending: shown in **alphabetical** sort; **hidden** in **newest pending** sort

### Sort (toolbar or header control)

**Always:** pending sessions **under each student** are ordered **newest first** (in both modes).

| Mode | Student order |
|------|----------------|
| **Alphabetical** | All linked students A→Z |
| **Newest pending** | Students with pending first, by **latest submit** among that student’s queue; then students with no pending, A→Z |

Default sort: **newest pending**.

### Out of scope for v1

- Referrals, ROI, contact stats (Phase 6)
- Quick actions (call teen) — approval queue only
- Multi-teen progress dashboard (same as parents — intentionally not shipped for instructors)

---

## Export

- No standalone “selected school” line on export when teen has no school / don’t know.
- Sessions **approved by an instructor** include that instructor’s **affiliated school name** on the export line.

---

## Technical sketch

- `users.role`: `teen` | `adult` | `instructor`
- `driving_schools`: `onboarding_link_id` (static per school until invite codes); owner contact email; `subscribed`, `expires_at`
- `instructor_school` (1:1 v1), `teen_school_selection`, `school_ratings`, `school_leads` (Other)
- `school_invite_codes` (later): expiring per-invite tokens
- `school_admins` (web): `school_id`, `user_id` — same Supabase auth; no mobile `school_owner` role
- `links`: existing table; `role` or derive instructor from `users.role`
- Push: extend `send-approval-push` + `proximitySubmit` recipient rules for instructor vs parent
- Web: new routes under `web/` for school owner (Phase 5)
- RLS: instructors ≠ full teen progress; school public fields for picker

---

## Privacy & legal (research summary)

**Not legal advice** — confirm with counsel before store launch and school contracts.

### COPPA (under 13)

- App already blocks under-13 in onboarding ([ONBOARDING.md](./ONBOARDING.md)).
- COPPA requires **verifiable parental consent** before collecting personal information (including **geolocation**) from children **under 13**.
- **Implication:** keep 13+ gate; do not market to under-13; if you ever allow under-13 with parent account, need COPPA consent flow and privacy policy updates.

### Teens 13–17

- Several **state privacy laws** impose extra limits on teen data (sale, targeted ads, sometimes broader processing). Illinois has teen provisions in its privacy law landscape — review before national expansion.
- **Implication:** no ads, no sale of personal data, **data minimization** (zip not full address for school list aligns well). Document what you collect and why in privacy policy.

### FERPA

- FERPA applies to institutions that receive **federal education funding** (typical K–12 districts), not most **private commercial driving schools**.
- If you later sell to **high school driver ed programs** through the district, FERPA **may** apply via school-official agreements — different from B2C teen/parent app.
- **Implication:** for **private BTW schools** (your primary model), FERPA is **unlikely** to bind you directly; still use clear **terms** on what schools/instructors may see (linked teens only). Revisit if pursuing **district** contracts.

### Location data

- Competitors (e.g. Moda) disclose session-start/end location with permission, not continuous tracking.
- Your app: foreground session samples + submit-time proximity; **no server persistence of proximity coordinates** for family push ([PROXIMITY.md](./PROXIMITY.md)).
- **Implication:** privacy policy should state: when location is collected, that it is used for session classification and optional proximity approval, not sold, not used for ads; retention on device vs server documented.

### School contact tracking & school search ZIP

- Logging **call/email/web taps** for school ROI is **business contact analytics** — disclose in privacy policy; avoid sharing teen PII with schools beyond what the teen/parent initiates.
- **ZIP search term:** optional, user-entered filter for school discovery — present in UI as **search**, not “home address.” Still disclose in privacy policy as location-related input used for geocoding; allow clear/delete in Settings.

### Illinois / DMV

- No specific statute found requiring app to **verify** instructor certification for MVP; **export** should show school association and supervisor names as today.
- State supervisor rules remain in [WISHLIST.md](./WISHLIST.md) (verification boolean later) — separate from school registry.

### Recommended before beta with schools

1. Privacy policy sections: teen data, location, school list (zip), contact events, instructor/school visibility.
2. Terms for **school accounts** (what data school staff see, subscription lapse).
3. Counsel review if targeting **school districts** or users under 16 in strict states.

---

## Open / TBD (deferred)

| Topic | Notes |
|-------|--------|
| Geocoding provider | Distance sort when chosen |
| Grace period days | Phase 6 |
| Billing provider | Phase 6 |
| Referral N / download price | May drop referrals; free download under consideration |
| Multi-school instructors | After 1:1 stable |
| Report moderation ops | Log now; process later |
