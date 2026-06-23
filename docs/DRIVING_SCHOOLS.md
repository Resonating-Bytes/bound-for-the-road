# Driving schools & instructor role (backlog)

**Status:** Backlog — design captured; not scoped for implementation yet.  
**Last updated:** 2026-06-22

**Goal:** Symbiotic loop — instructors promote the app in classroom BTW programs; the app drives teens to **paying** registered schools (schools **pay** for subscription to appear in the nearby list — not a revenue share to schools).

Related: [ONBOARDING.md](./ONBOARDING.md) · [DATA_MODEL.md](./DATA_MODEL.md) · [DECISIONS.md](./DECISIONS.md) · [TODO.md](./TODO.md)

---

## Decisions summary (landed)

Use this section as the single checklist of what we agreed. Details below.

| Area | Decision |
|------|----------|
| **Instructor role** | Third role alongside teen and adult; BTW instructor at a driving school |
| **Linking** | Same **6-digit code** as parents; instructor is still an **approving adult** |
| **Instructor dashboard** | **No** multi-teen progress dashboard; minimal home: proximity approvals, referral counts, **contact ROI stats**, billing/grace alerts |
| **Instructor push** | **Device-to-device proximity** at submit — teen ↔ instructor GPS, tight radius (parking lot / BTW route); **not** the same as school list distance |
| **School list “nearby”** | **Regional browse** — ~10–20 mile default (configurable); N closest and/or search; teen **zip only** (no home address); no device GPS for picker |
| **Parent push** | If teen has linked **instructor(s):** **no push** on submit; session **visible on adult dashboard**; parent **can approve** if instructor doesn’t |
| **Parent push (no instructor)** | Normal linked-adult approval push (unchanged) |
| **School registry** | Schools **pay subscription** to appear in nearby picker — they are the **customer** |
| **App monetization** | Small **paid App Store download** (consumer) **plus** school subscription (B2B) — amounts TBD |
| **Subscription lapse** | **Grace period** + dashboard warning before delist; **approvals still work** during grace; listing, leads, ROI metrics, referral perks **disabled** until payment updated |
| **Teen school pick** | Teen **owns** selection; visible to linked adults for rating; regional sort uses teen **zip** only (no home address) |
| **Onboarding picker** | Nearby registered schools; **Other** (optional contact + outreach lead); **“Don’t know / rather not say”** skips contact |
| **Ratings** | Overall ★ + total count on list; teen (n) and adult (n) breakdown; tap role → filtered reviews |
| **Contact tracking** | Log call/email/web taps; show on **instructor/school dashboard** so subscribers see ROI |
| **Qualifying signup (referral)** | ≥1 **approved session** by that instructor for a **linked teen** → counts toward subscription discount / free month (N TBD) |
| **Referral reward** | Every **N** qualifying signups → discount or free month of **school subscription** (not tied to App Store download revenue) |

**Still TBD:** grace period length, referral N, subscription price, download price, billing provider, moderation, instructor onboarding screens, exact disabled-features list during lapse.

---

## New role: Instructor

Third role alongside teen and adult, for **behind-the-wheel (BTW) driving instructors**.

| | Adult (parent/guardian) | Instructor |
|---|-------------------------|------------|
| Links with teen | Yes | Yes |
| Multi-teen dashboard | Yes — progress, sessions, approvals for selected teen | **No** — no dashboard of all linked teens |
| Session visibility | Full dashboard for linked teen | Pending approvals only when proximity applies (not all linked teens’ progress) |
| Push on session submit | Normal push if teen has **no** linked instructor; **no push** if teen has linked instructor(s) — see proximity | **Proximity push only** when near submitting teen |
| Driving school | N/A | Associated with a registered **Driving school** |
| Approvals | Standard linked-adult approval | Same approval mechanics as adults; **push/UI differ** — see proximity below |

Instructors are **approving adults** with a different role flag — same **6-digit link flow** as parents ([DECISIONS.md](./DECISIONS.md) linking model). No separate school-scoped invite for MVP of this feature.

**Role selection (onboarding):** extend Screen 1 beyond teen / adult → add **Instructor** (or equivalent copy). Instructor onboarding adds **school affiliation** step (TBD).

Instructors still need auth, linking, and a minimal home surface — see [Instructor / school dashboard](#instructor--school-dashboard).

---

## Two different “nearby” concepts

Do **not** conflate these — different purpose, precision, and likely different data sources.

| | **School list (regional)** | **Approval (device-to-device)** |
|---|---------------------------|----------------------------------|
| **Purpose** | Help teen pick a driving school from the registry | Decide whether an **instructor** gets a push / sees pending approval for a submitted session |
| **Scale** | **Broad / regional** — default ~**10–20 miles** (configurable) | **Tight** — same parking lot, BTW route, classroom block (meters, not miles) |
| **Who / what** | Teen ↔ **school address** (static registry) | **Teen device ↔ instructor device** (both moving) |
| **Location permission** | **Not required** for school picker — teen **zip** (+ state already on profile) geocoded to centroid; no teen home address | **Required** (at least on teen at submit; instructor device likely too — TBD) for meaningful device-to-device distance |
| **UI** | Sort/filter: distance, **N closest**, text **search**; expand radius if list is empty | No user-facing “nearby schools” — backend rule only |
| **When** | Onboarding + Settings school picker | On session **submit for approval** |

---

## School list — regional nearby

Registered schools shown in onboarding and **Settings → Driving schools**.

**Default:** schools within ~**10–20 miles** of the teen’s reference point (exact default TBD).

**Reference point (minimal PII — decided):**

- Teen **zip code only** — no home street address collected for school discovery (keep personal data minimal).
- **State** from existing onboarding profile (IL first) scopes search and geocode.
- Zip → geocode to centroid server-side; distance vs each school’s registered business address.
- **No device GPS** for the school picker; optional coarse GPS deliberately **not** used here.

If teen chose **Other / don’t know** for school before zip is collected, collect zip on the school-picker step (or during onboarding before picker — placement TBD).

**School registry** still stores the school’s **business address** (public listing contact info — not teen PII).

**Discovery controls:**

- List sorted by distance (N **closest** schools)
- **Search** by name / city when teen knows the school
- **Expand radius** or “show all in state” if nothing in default band (configurable)

School subscription listing is **not** gated on teen GPS — only on school paying + address on file.

---

## Approval proximity (device-to-device)

**High precision.** When a teen submits a session for approval:

- Compute distance **teen device ↔ each linked instructor device** (not teen ↔ school address).
- **Instructor push** only if within a **small radius** (meters — e.g. same lot / route; exact value TBD).
- **Instructor pending queue** (if shown): same rule — closest linked instructor at submit time (or during session — TBD).
- **Parent (linked adult), teen has instructor(s):** pending session **always visible** on adult dashboard (full session/approval UI). **No push** on submit — instructor gets proximity push instead. Parent **can still approve** if instructor does not (backup approver).
- **Parent, teen has no instructor:** normal linked-adult **approval push** (existing Phase 2 behavior).

If location permission is denied at submit, instructor proximity push may not fire; parent still sees the session on dashboard and can approve so class is not blocked.

Builds on [TODO.md](./TODO.md) “Nearby linked adults” / [WISHLIST.md](./WISHLIST.md) for the **approval** path only — not the school registry picker.

---

## Driving school entity

Registered schools (paid subscription required to remain listed — pricing/billing TBD).

| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | |
| Phone | Yes | Tap-to-call from app |
| Address | Yes | Geocoded for **regional** school list distance (~10–20 mi); not used for approval proximity |
| Email | Yes | Tap-to-email |
| Website | No | Optional URL |

**Subscription (school pays us):** Schools **pay** to stay registered and listed in the app’s nearby-school picker. Pricing and billing frequency TBD.

**Lapsed payment (grace, not instant delist):**

- Dashboard **warns before delist** (payment failed / renewal overdue — buffer period TBD).
- During grace: instructor can **still approve** linked teen sessions for class (core BTW value).
- **Disabled until payment updated:** nearby listing, contact lead metrics prominence, referral incentives, other premium school/instructor surfaces (exact list TBD).
- After grace expires: delist from picker; existing teen selections read-only / contact-only (TBD).

---

## Monetization (product)

Two revenue lines (see also [DECISIONS.md](./DECISIONS.md) pricing):

| Stream | Who pays | Notes |
|--------|----------|--------|
| **App Store download** | Teen/family | Small **one-time paid download** fee (amount TBD) — primary consumer monetization |
| **School subscription** | Driving school | Paid listing in nearby picker + instructor/school dashboard value |

Instructor referral credits (free/discounted subscription months) are separate from App Store download revenue — tied to **qualifying signups** below, not per download.

---

## Teen onboarding — school selection

After profile basics (or as part of onboarding — placement TBD):

1. Show **registered driving schools** in **regional nearby** order (~10–20 mi from teen **zip**; N closest; searchable — see [School list — regional nearby](#school-list--regional-nearby)). Collect **zip** if not already on profile. Does **not** use instructor approval GPS.
2. Teen picks the school they are signed up with.
3. **Other** — school not in registry:
   - No school-level ratings from this path.
   - **“I’d rather not say / don’t know”** checkbox — skips name and contact fields; teen continues without a school selection (same as no rating target).
   - Otherwise teen may **enter school name + contact info** (phone, email, address optional).
   - App offers to **contact that school** (email template or tracked link) encouraging them to **register** (paid listing) + instructor features — counts as a **school lead** for outreach/sales.
4. **Haven’t picked yet** — browse list, contact registered schools directly.

**Ownership:** School selection is **owned by the teen**; **visible to linked adults** (so they can rate the same place).

Contact actions (call, email, open website) should support **attribution tracking** so schools know the lead came from the app (mechanism TBD: tracked links, UTM, referral query param, or in-app event logged server-side).

**School / instructor dashboard (subscription ROI):** surface **contact interaction stats** so paying schools can judge whether the subscription is worth it:

- Counts by type: **calls**, **emails**, **website taps**, **“Other” outreach leads** sent from the app
- Time ranges (e.g. this month / last 30 days)
- Attribution: all in-app contact actions log to `school_contact_events` server-side
- Example copy: “12 app-driven contacts this month”

Disabled during subscription grace/lapse (see lapsed payment above) until payment is updated.

---

## Settings — Driving schools

New Settings subsection (teen and adult as appropriate):

- Same searchable/nearby list as onboarding.
- School detail: contact info, ratings (overall + breakdown), filtered review list.
- Teen can change school selection (with same rules as onboarding).

---

## Ratings & reviews

| Rule | Detail |
|------|--------|
| Who can rate | Teens and linked adults **independently** |
| School scope | Registered schools only — **not** for **Other** or **don’t know** |
| List row | **Overall average** + **total review count** (standard pattern, e.g. ★ 4.6 · 128 reviews). Below or beside: **teen average (n)** and **adult average (n)** — dual perspectives, each with count |
| Detail page | Overall at top; **teen / adult breakdown** under. **Tap teen or adult rating** → reviews list **filtered to that role** (teens often care only about peer reviews) |
| Overall average | Combined mean of all reviews (or weighted by count — TBD). Shown on list for quick scan; breakdown on detail |
| Linked adult | Sees teen’s selected school; can submit own rating for that school |

Moderation, one-review-per-user, edit/delete policy — TBD.

---

## Instructor referral & school subscription incentives

Track how many student accounts sign up **via an instructor** (or under a school’s referral — exact attribution TBD):

- Possible reward: **discount or free month** of school subscription for every **N** qualifying sign-ups.
- Needs: referral code or deep link, instructor ↔ school association, anti-abuse rules, dashboard for schools/instructors to see counts.

**Qualifying signup (decided):** counts when a **linked teen has at least one session approved by that instructor** — proves real BTW use, not just install or link. Referral tallies and subscription discounts use this threshold.

---

## Instructor / school dashboard

Core surfaces (exact layout TBD):

- [ ] **Instructor home** — proximity-gated pending approvals (closest instructor at submit); no multi-teen progress view
- [ ] **Subscription ROI** — contact interaction stats (calls, emails, web, leads) — primary “is this worth paying for?” metric
- [ ] **Referral / qualifying signups** — count of linked teens with ≥1 session approved by this instructor; progress toward next free/discounted month
- [ ] **Billing status** — grace-period **warning before delist**; CTA to update payment; clear list of what is disabled during lapse
- [ ] **During grace:** approvals for linked class teens **still work**; listing, ROI dashboard, referral perks **off** until paid
- [ ] Class/session context (scheduled BTW block, roster) — future
- [ ] School admin portal (manage listing, subscription, full analytics) — may merge with instructor view for small schools

---

## Suggested implementation phases (when prioritized)

1. **Role + link** — `instructor` role, same link flow, no school registry yet; instructor uses adult approval mechanics
2. **Proximity push** — teen GPS radius; suppress parent push when instructor linked; parent dashboard backup approve
3. **School registry + teen picker** — subscription stub, onboarding/Settings list, Other / don’t know, contact tracking
4. **Ratings** — dual teen/adult reviews, overall + filtered detail
5. **Billing + grace** — paid listing, lapse rules, dashboard ROI + billing alerts
6. **Referral credits** — qualifying signup tally, N → discount

Do **not** start until Phase 2 auth/linking and proximity foundations are stable.

---

## Technical notes (when implemented)

- `users.role`: extend beyond `teen` | `adult` → `instructor`
- New tables (sketch): `driving_schools`, `school_subscriptions`, `teen_school_selection`, `school_ratings`, `school_contact_events`, `school_leads` (Other outreach), `instructor_school`, referral attribution
- RLS: instructors see linked teens only in approval/proximity context, not full progress dashboards
- Proximity: builds on [TODO.md](./TODO.md) “Nearby linked adults” / [WISHLIST.md](./WISHLIST.md) — instructor variant with stricter gating
- Push routing: instructor proximity approval push; **suppress parent push** when teen has linked instructor(s); parent sees pending on dashboard only
- Onboarding + Settings screens: [SCREENS.md](./SCREENS.md) update when specced

---

## Open / TBD

| Topic | Notes |
|-------|--------|
| Grace period length | Days/weeks before delist after failed payment |
| Referral N | Qualifying signups per free/discounted subscription month |
| Download + subscription price | App Store tier + school subscription amount/frequency |
| Billing provider | Stripe, RevenueCat, manual invoicing |
| Instructor onboarding UI | School affiliation step, role selection copy |
| Review moderation | One review per user, edit/delete policy |
| Lapsed teen selections | Read-only vs contact-only after delist |
| School list radius | Default 10–20 mi; N closest vs fixed radius; search + expand radius UX |
| School list geocode source | **Decided:** teen **zip** + profile state only; no teen address; no GPS for picker |
| Approval proximity radius | Meters; teen-only vs teen + instructor device positions |
