# Release checklist (operator)

Use this after merging a release PR and before shipping to testers or stores.  
Technical details: [RELEASE.md](./RELEASE.md) · [COMPATIBILITY.md](./COMPATIBILITY.md) · [RPC_CONTRACT.md](./RPC_CONTRACT.md)

---

## Before merge (PR author)

- [ ] App semver bumped in `mobile/app.json` and `mobile/package.json` (if mobile changed)
- [ ] `CHANGELOG.md` has `## [x.y.z] - YYYY-MM-DD` with bullets (CI validates format)
- [ ] Supabase changes documented in `CHANGELOG.md` and/or `COMPATIBILITY.md`
- [ ] New migration filename matches `YYYYMMDDHHMMSS_description.sql`
- [ ] `MIN_BACKEND_REVISION` raised if this app build requires new migration
- [ ] `requiredBackendCapabilities.json` updated if capabilities changed
- [ ] `node scripts/check-version-bump.js --base origin/main --head HEAD` passes locally
- [ ] `cd mobile && npm test` passes
- [ ] Edge function changes will auto-deploy on merge (or plan manual deploy)

---

## After merge to `main`

### Supabase

- [ ] Open Supabase SQL Editor → run **new migrations in order** (never skip)
- [ ] Confirm `SELECT value FROM app_config WHERE key = 'backend_revision'` matches latest migration id
- [ ] Review `min_app_version` — bump if old app builds must not sync
- [ ] Review `latest_app_version` — bump for soft update nudge (optional)
- [ ] GitHub Actions → **Deploy Supabase Edge Functions** succeeded (if `supabase/functions/**` changed)

### Verify compatibility

- [ ] Open app (online) → Settings → App version → **Re-check compatibility**
- [ ] Expect **Up to date** (or expected state after intentional test config)
- [ ] Submit / approve smoke test on device if RPC or edge surface changed

### Mobile build

- [ ] EAS build from merged `main` when ready for TestFlight / Play internal
- [ ] Store listing version matches `mobile/app.json` `expo.version`

---

## Post-release cleanup (dev/staging)

- [ ] Reset `latest_app_version` test values if bumped for optional-update testing
- [ ] Remove `EXPO_PUBLIC_FORCE_COMPATIBILITY_BANNER` from local `.env` if used

---

## Branch protection reminder

Required PR checks on `main`:

- **App version** (when mobile paths change)
- **Backend revision** (when Supabase paths change)
- **Compatibility contract** (always)
- **Mobile tests** (always; skips quickly when no mobile changes)
