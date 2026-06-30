# Driving schools — open questions (fill in)

**Purpose:** Capture remaining product decisions before/during implementation.  
**How to use:** Edit this file directly — add answers under each `**Your answer:**` line.  
**Landed decisions:** [DRIVING_SCHOOLS.md](./DRIVING_SCHOOLS.md) · **Screens:** [SCREENS.md](./SCREENS.md)

**Status:** Answered 2026-06-22 — merged into [DRIVING_SCHOOLS.md](./DRIVING_SCHOOLS.md)  
**Last updated:** 2026-06-22

---

## Quick picks (optional — answer any you already know)

| # | Topic | Your answer |
|---|--------|-------------|
| Q1 | Proximity radius (meters, shared parents + instructors) | |
| Q2 | Grace period after `expires_at` (days) | |
| Q3 | School picker in teen onboarding: before linking, after linking, or Settings-only at first? | |
| Q4 | Phase 1 instructor header when no school yet | |
| Q5 | Multiple linked instructors at submit: closest only gets push? (same as parents) | |

---

## Phase 1 — Instructor role, link, dashboard

### 1.1 Role selection screen

Screen 1 today: teen vs adult. Adding **Instructor**.

- Button order / labels? (e.g. Teen | Adult | Instructor)
yes
- Any subtitle explaining instructor vs adult?
maybe call it "driving instructor", that should be clear enough

**Your answer:**



### 1.2 Instructor onboarding flow

Planned: Role → Name → Enter teen invite code (like adult).

- Same **name-only** screen as adult, or extra fields (cert #, school name free text)?
name only for now.  Code is invite code from school, not link code from teen
- After entering code, go straight to **instructor dashboard** (like adult → adult home)?
yes

**Your answer:**



### 1.3 Linking rules

- Max linked **instructors** per teen? (unlimited / cap at N)
no limit, no limit for linked adults either
- Can the **same person** have both an adult account and an instructor account? (recommend: **no** — pick one role at signup)
no, they would need to use separate accounts for that
- Teen **Invite** screen: generate one code for anyone, or separate “Invite parent” vs “Invite instructor”?
same invite flow for both, instructors link to teens in the same spot in Settings

**Your answer:**



### 1.4 Instructor dashboard — empty / no-pending students

When sort = **Newest pending**, students with **no** pending sessions:

- [ ] Show at bottom (A→Z) — *current spec lean*
- [x] Hide entirely
- [ ] Show collapsed / “No pending” one-liner

**Your answer:**



### 1.5 Phase 1 school header (before web app / affiliation)

Instructor dashboard title when not yet linked to a school:

- [ ] “Instructor dashboard”
- [ ] Instructor’s display name
- [x] Placeholder school name from manual SQL seed only

**Your answer:**



### 1.6 What instructors must **not** see (confirm)

Phase 1 RLS intent: linked teens for approvals only — no progress bars, no full session history unless pending/approved queue.

- Can instructor open **approved** session detail from dashboard, or **pending only**?
pending only, once approved they are removed from the instructor dashboard

**Your answer:**



---

## Phase 2 — Push routing

### 2.1 Proximity radius

Single `PROXIMITY_PUSH_RADIUS_METERS` for parents and instructors. Current default: **400 m**.

- Proposed value (meters): 30m
- Or: keep 400 for v1 and tune after device testing?

**Your answer:**



### 2.2 Multiple instructors linked

At submit, two instructors both in radius:

- [x] Closest instructor only gets push — *same as parents*
- [ ] All in-radius instructors get push

**Your answer:**



### 2.3 Teen has instructor(s) + parent(s)

Confirmed: **no parent push** when any instructor linked; parent sees dashboard.

- If **no** instructor in radius but parent is: still **no parent push** (dashboard only)?

**Your answer:**
the same rules apply, the closest adult in radius gets the push notice.  If a normal adult and instructor are both in range, the instructor takes priority, regardless of which is closest.  If there is a linked instructor, but they aren't in range, the closest adult in range gets the push

### 2.4 Instructor in proximity collection

- [x] Same Realtime round as parents (one broadcast, split by role server-side)
- [ ] Separate instructor wait/collection (unlikely — only if you want different timing)

**Your answer:**



---

## Phase 3 — School registry & teen picker

### 3.1 Onboarding placement

When does school picker appear for new teens?

- [ ] After profile (permit etc.), **before** linking gate
- [x] After linking (or skip linking), before dashboard
- [ ] **Not** in onboarding v1 — Settings only first
- [ ] Other: ___

**Your answer:**



### 3.2 No ZIP / empty search area

School list when teen skips ZIP and hasn’t typed a search:

- [ ] All subscribed schools in **state** (IL first), sortable
- [ ] Empty list until they search or enter ZIP
- [x] Other: skip the list entirely if zip input is empty

**Your answer:**



### 3.3 “Other” school path

Teen picks school not in registry:

- Required fields: name only / name + phone / name + contact + optional address?
name only, all others are optional
- Do we **auto-email** the school outreach template, or only log a **lead** for you to contact manually?
log only, no auto email

**Your answer:**



### 3.4 “Don’t know / rather not say”

- Teen can use app with **no** school selected forever?
yes
- Export shows: blank / “Not specified” / omit line?
omit

**Your answer:**



### 3.5 Teen changes school later

Teen picks a different registered school in Settings:

- [x] Keep their old rating on old school; new school starts fresh
- [ ] Wipe ratings on change
- [ ] Other: ___

**Your answer:**
since rating require an approved session, ratings should stay.  If they changed schools because one was terrible, the rating should stick


### 3.6 School lapses subscription

Teen already selected a school that later **unsubscribes** or passes grace:

- [x] Keep showing school name on teen profile (read-only) + export
- [ ] Clear selection; prompt teen to pick again
- [ ] Other: ___

**Your answer:**
A school lapsing their subscription doesn't delete the school record, so the link is still valid.  Teens can select a new school at any time, regardless of the state of the subscription


### 3.7 Geocoding

Zip/city search → distance sort needs geocoding.

- [ ] Supabase edge function + external API (which? Mapbox / Google / other)
- [ ] Precomputed centroids table per ZIP (IL first)
- [ ] Defer distance sort until provider chosen; name sort only in v1

**Your answer:**
Let's look at options later, not important right now


### 3.8 Export — school line

Export includes teen’s selected school. If teen’s school ≠ instructor’s affiliated school:

- Export shows: **teen’s selection** / **instructor’s school** / **both**

**Your answer:**
no need to show the school itself, any records approved by instructors would have the school name associated with the instructor


---

## Phase 4 — Ratings

### 4.1 Review content

- Star scale: 1–5? yes
- Written comment: optional / required / max length?
optional, suggest a good max length, what is standard?

**Your answer:**



### 4.2 Unlock edge cases

Unlock requires ≥1 session **approved by a linked instructor**.

- Teen picked a school but has **no** linked instructor yet → cannot rate (OK?) 
correct
- Adult unlock follows teen — teen must unlock first (OK?) 
correct

**Your answer:**



### 4.3 Report button

When user reports a review:

- [ ] Log to DB only; you review manually
- [ ] Hide review pending moderation
- [ ] Skip for v1

**Your answer:**
let it go live, moderation will come via "Report" link/button


### 4.4 Overall average

Combined list rating:

- [x] Simple mean of all reviews
- [ ] Weighted by count per role
- [ ] Other: ___

**Your answer:**



---

## Phase 5 — Web app (school owner)

### 5.1 School owner account

- [ ] New role `school_owner` (fourth role)
- [ ] Same `instructor` user can own school (v1 1:1)
- [x] Separate auth — web-only login, no mobile app role

**Your answer:**
there is no "school owner" dsahboard in the app.  School owners can be instructors too (with the same email account), but don't have to be.  Can we do that without a separate role or DB/auth for the web?


### 5.2 Instructor invite

Owner invites instructor by email:

- Instructor must **already have** app account, or invite creates account + sets role?
invite email has a code similar to teen invite code.  Instructor could create a brand new account and enter code as part of onboarding, or already have created it and enter it later (should prompt on app load like unlinked "adult" or in Settings)
- Accept invite: deep link to app / web page / both?
app, copy code to clipboard if possible to allow easy paste or auto fill from link

**Your answer:**



### 5.3 School create approval

Self-serve school create:

- [x] Live immediately when `subscribed=true` (you set manually at first)
- [ ] Pending your approval before listed
- [ ] Other: ___

**Your answer:**



---

## Phase 6 — Grace, billing, referrals (can defer)

### 6.1 Grace period

Days after `expires_at` before delist: ______

During grace, disable (check all that apply):

- [ ] School hidden from picker
- [ ] ROI / contact stats on school dashboard
- [ ] Referral perks
- [ ] Keep: instructor approvals for linked teens
- [ ] Other: ___

**Your answer:**
defer


### 6.2 Referral (when implemented)

Qualifying signup = ≥1 instructor-approved session for linked teen.

- N signups per free/discounted month: ______
- Discount = one free month / % off / other: ___

**Your answer:**
defer, might decide to drop this and only charge for subscription, make it free to download and use.  Need to do estimate of cost per user for processing and storage for the effective life of getting their permit to nail down what prices should be


### 6.3 Billing (when implemented)

- Provider preference: Stripe / other / manual invoicing only for now

**Your answer:**
defer, need to investigate options


---

## Cross-cutting

### C.1 App Store download fee

- Paid download at launch, or free until schools revenue exists?

**Your answer:**
defer, see above answer on discounts


### C.2 Teen linked accounts UI

When teen views linked supervisors:

- Show badge: **Parent** | **Instructor** (and nickname)
only "instructor" gets badge, we don't know who the other adults are
- Can teen **remove** an instructor same as adult?
yes

**Your answer:**



### C.3 Instructor sees teen’s school?

On instructor dashboard or approve screen, show teen’s **selected driving school** name?
no, they ONLY see the pending sessions that happened when they were in range.

**Your answer:**



### C.4 POC fake data

Names OK for manual SQL seed? Any you want used (e.g. “Lakeside Driving School”, “Northside BTW”)?

**Your answer:**
don't care



### C.5 Anything else

Free-form — edge cases, worries, or “must have” before Phase 1 code:

**Your answer:**
no, we will adjust on the fly as it is implemented and tested


---

## After you fill this in

1. We merge answers into [DRIVING_SCHOOLS.md](./DRIVING_SCHOOLS.md) and close the Open / TBD table.
2. Phase 1 implementation can start on your branch.
