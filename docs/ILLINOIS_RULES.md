# Illinois Rules (MVP)

Source: [IL SOS GDL](https://www.ilsos.gov/departments/drivers/teen_driver_safety/gdl.html), [DSD X152 PDF](https://www.ilsos.gov/content/dam/publications/pdf_publications/dsd_x152.pdf).

**Disclaimer in app:** Requirements summarized for convenience; confirm with Illinois Secretary of State.

## Permit phase (age 15)

| Rule | Value | App behavior |
|------|-------|--------------|
| Minimum supervised practice | **50 hours** | Progress bar: total hours |
| Night practice included | **10 hours** of the 50 | Separate night counter |
| Permit holding period | **9 months** minimum | Dashboard: eligibility date from permit issue date |
| Supervisor | Parent or adult **21+** with valid license | Collect supervisor name on session; wishlist: eligibility flags |
| Parent certification | Parent certifies 50 + 10 on official log | Export supports parent signature line |

## Night driving (two different concepts)

1. **Practice hours at night** — 10 hours toward the 50 (what we track).
2. **Permit curfew restrictions** — Sun–Thu 10 p.m.–6 a.m., Fri–Sat 11 p.m.–6 a.m. (informational only in MVP; optional warning if session overlaps curfew).

## Day vs night classification (app)

- MVP: sunset/sunrise based on date + location (or time-only fallback).
- Split session minutes into day/night if session spans boundary.

## Export (MVP)

- **IL-close** PDF: date, start/end, duration, day/night, conditions, supervisor, signature block.
- **End goal:** pixel-perfect **DSD X152** layout.

## Fields to map from DSD X152 (validate against PDF)

When implementing export, line-item check PDF:

- [ ] Date of practice
- [ ] Start time / end time
- [ ] Total time or duration
- [ ] Day vs night indication
- [ ] Weather / conditions (if required on form)
- [ ] Supervisor name / signature
- [ ] Parent/guardian certification statement

## Driver education

- 50 hours are **in addition to** driver ed behind-the-wheel where applicable—app copy should not imply replacement.

## References

- [Teen Driver Safety](https://www.ilsos.gov/departments/drivers/teen-driver-safety.html)
- [Parent-Teen Driving Guide](https://www.ilsos.gov/content/dam/publications/pdf_publications/dsd_a217.pdf)
