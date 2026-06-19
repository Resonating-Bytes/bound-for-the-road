# Illinois Rules (MVP)

Sources: [IL SOS GDL](https://www.ilsos.gov/departments/drivers/teen_driver_safety/gdl.html), [DSD X152](https://www.ilsos.gov/content/dam/publications/pdf_publications/dsd_x152.pdf), [Parent-Teen Driving Guide (DSD A217)](https://www.ilsos.gov/content/dam/publications/pdf_publications/dsd_a217.pdf).

**Disclaimer in app:** Summarized for convenience; confirm with Illinois Secretary of State.

---

## Permit phase requirements

| Rule | Value | App behavior |
|------|-------|--------------|
| Supervised practice | **50 hours** | Progress bar: total |
| Night practice | **10 hours** of 50 | Separate night counter |
| Holding period | **9 months** min | Eligibility date from permit issue date |
| Supervisor | Parent or adult 21+ licensed | Phase 2: linked adult; MVP: notes only |

---

## Night driving — two separate concepts

1. **Practice hours at night** — the 10 hours tracked toward the 50-hour requirement. This is what the app counts.
2. **Permit curfew restrictions** — Sun–Thu 10 p.m.–6 a.m., Fri–Sat 11 p.m.–6 a.m. These restrict *unsupervised* driving, not supervised practice. Informational only in MVP.

---

## Day vs night (MVP)

**Whole session** classified by **start time** vs sunrise/sunset for that calendar date.

```
function classifyDayNight(startedAt):
  tz = deviceTimezone()
  coords = timezoneCentroid(tz)   // see mobile/src/config/timezoneCentroids.js
  { sunrise, sunset } = SunCalc.getTimes(startedAt, coords.lat, coords.lon)
  startLocal = toLocal(startedAt, tz)
  if startLocal >= sunset OR startLocal < sunrise:
    return 'night'
  return 'day'
```

Entire `durationMinutes` counts toward that bucket. Minute-level splits → post-MVP.

---

## Curfew (informational)

Permit holders: Sun–Thu 10 p.m.–6 a.m.; Fri–Sat 11 p.m.–6 a.m. Show **warning on Review** if session overlaps.

> This session overlaps Illinois permit curfew hours (informational only).

Supervised practice during curfew is permitted — the warning is a reminder only, not a block.

---

## Text export fields (MVP)

Each session row should include:

- Date of practice
- Start time / end time
- Duration (minutes or h:mm)
- Day or night
- Optional notes
- Driver legal name
- Permit issue date / eligibility date (header)

Phase 2 export also adds:

- Supervisor name (from approval record)
- Approval date
- Parent/guardian certification statement + signature line

PDF / pixel-perfect DSD X152 layout → [WISHLIST.md](./WISHLIST.md).

---

## Driver education

50 hours are **in addition to** driver ed behind-the-wheel where applicable.
