# Supabase setup (Phase 2 foundation)

Apply the SQL in `supabase/migrations/` to a Supabase project, then point the mobile app at it with env vars. No app behavior changes until auth/sync are wired — Phase 1 mock auth and local SQLite stay the default.

Decisions: [BACKEND.md](./BACKEND.md) · [DATA_MODEL.md](./DATA_MODEL.md) · [AUTH.md](./AUTH.md)

---

## 1. Create a Supabase project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Pick org, name (e.g. `bound-for-the-road-dev`), strong DB password, region close to you
3. Wait for provisioning (~2 minutes)

---

## 2. Run migrations

**Option A — SQL Editor (simplest, no CLI)**

1. Dashboard → **SQL Editor** → **New query**
2. Paste contents of `supabase/migrations/20260618120000_initial_schema.sql` → **Run**
3. Paste contents of `supabase/migrations/20260618120001_rls_policies.sql` → **Run**
4. Paste contents of `supabase/migrations/20260619120000_link_invite_rpc.sql` → **Run** (required for teen/adult linking)
5. Paste contents of `supabase/migrations/20260619130000_users_insert_own.sql` → **Run** (recreate profile row after dev DB reset)
6. Paste contents of `supabase/migrations/20260619140000_submissions_teen_update.sql` → **Run** (teen withdraw before approval)
7. Continue through `20260619170000_approvals_adult_linked_select.sql` (decline RPC, send-back, linked adult approvals)
8. Paste `20260620120000_app_compatibility.sql` → **Run** (app ↔ backend version check RPC)

See [COMPATIBILITY.md](./COMPATIBILITY.md) for version bump workflow.

**Option B — Supabase CLI**

```powershell
# Install: npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

---

## 3. Verify schema

Dashboard → **Table Editor** — you should see:

| Table | Purpose |
|-------|---------|
| `users` | Profile row per auth user (auto-created on sign-up) |
| `links` | Teen ↔ adult relationships |
| `link_invites` | 6-digit invite codes |
| `sessions` | Sync / adult presence |
| `submissions` | Hash payloads for approval |
| `approvals` | Adult attestation records |
| `push_tokens` | Expo push tokens (Phase 2) |

Dashboard → **Authentication** → enable **Apple** and **Google** when you start real auth (dev build required for Apple).

---

## 4. Configure the mobile app

1. Project **home** (or **Project Settings → API**) — copy **Project URL** (e.g. `https://xxxxx.supabase.co`)
2. **Project Settings → API** — copy **Publishable key** (legacy dashboards label this `anon public`)
3. In `mobile/`:

```powershell
copy .env.example .env
# Edit .env with your URL and anon key
```

4. Restart Expo (`npm start`) so env vars load

`.env` is gitignored — never commit keys.

---

## 5. Test connectivity

From `mobile/`:

```powershell
node --env-file=.env -e "fetch(process.env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/users?select=id&limit=0', { headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY } }).then(r => console.log('HTTP', r.status)).catch(console.error)"
```

Expected: **`HTTP 200`**. (`HTTP 401` on `/rest/v1/` alone is normal — that path requires a secret key, not your publishable key.)

Or in the app (temporary dev check):

```javascript
import { checkSupabaseConnection } from './src/lib/supabase';
const result = await checkSupabaseConnection();
console.log(result); // { ok: true } when configured and reachable
```

Expected: `{ ok: true }`. `{ ok: false, reason: 'not_configured' }` means `.env` is missing or Expo wasn’t restarted.

---

## 6. Google sign-in (app)

### Supabase

1. **Authentication → Providers → Google** — enable, paste Google Web client ID + secret, **Skip nonce checks** on.
2. **Authentication → URL Configuration** — **both fields matter:**
   - **Site URL** — **not** `http://localhost:3000`. Set to the same `exp://…/--/auth/callback` URI from the app (or Supabase falls back here on OAuth errors → “can’t connect” on iPhone).
   - **Redirect URLs** — add the exact URI from the app sign-in screen (dev hint), e.g. `exp://192.168.68.175:8082/--/auth/callback`. Also add `exp://**` so IP/port changes do not break sign-in.

Run the app once in dev; copy the exact URI from the hint text under **Sign in with Google**.

### Google Cloud

- OAuth **Web application** client with redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- **Consent screen (Google Auth Platform → Audience / OAuth consent screen):**
  - **Testing** — listed **Test users** can sign in, **plus** any Google account that is **Owner, Editor, or Viewer** on the Google Cloud project (check **IAM & Admin → IAM**). A recovery/backup email on your profile does **not** grant access to a different Google account.
  - If a Gmail that is not on the test-user list signed in, it likely has a project IAM role, or you were already signed into that account in the OAuth browser sheet.
  - **Production** — any Google account can sign in.
- Supabase does **not** filter sign-ups by Google test users — anyone who completes OAuth gets a row in **Authentication → Users**.

### Dev build (app name in the iOS sign-in prompt)

Expo Go always shows **“Expo”** in the system OAuth dialog. A **development build** shows **Bound for the Road** instead. Redirect URI changes from `exp://…` to `boundfortheroad://auth/callback`.

1. Add to Supabase **Redirect URLs**: `boundfortheroad://**` (wildcard; covers `boundfortheroad://auth/callback`)
2. From `mobile/`: `npx eas-cli login` then `npx eas-cli init` (links project; writes `projectId` to `app.json`)
3. **Apple Developer** ($99/year) required to install on a physical iPhone from Windows via EAS
4. Register device: `npx eas-cli device:create`
5. Build: `npx eas-cli build --profile development --platform ios`
6. Install the build on your iPhone, then run `npm run start:dev-client` and open the dev client (not Expo Go)

See [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md#development-build-bound-for-the-road-branding).

### Test in the app

1. Restart Expo after `.env` changes.
2. Tap **Sign in with Google** on the sign-in screen.
3. Complete Google OAuth in the browser sheet.
4. **Authentication → Users** in Supabase should show your account; **Table Editor → users** should have a matching profile row.

---

## 7. RLS smoke test (optional)

After you enable Email or Google auth in Dashboard and create a test user:

1. **Table Editor** → `users` — one row with `id` = auth user UUID
2. Signed-in client can `select` own row only (policies in `20260618120001_rls_policies.sql`)

Full auth + sync testing comes in the next Phase 2 slices.

---

## What’s not in this slice

- Sign in with Apple (needs dev build)
- Outbox sync from local SQLite
- Edge Functions for push relay
- Invite accept RPC for adults

See [TODO.md](./TODO.md) Phase 2 checklist.

---

## Repo layout

```
supabase/
  config.toml
    migrations/
    20260618120000_initial_schema.sql
    20260618120001_rls_policies.sql
    20260619120000_link_invite_rpc.sql
mobile/
  src/lib/supabase.js      # client + health check
  src/lib/googleAuth.js    # Google OAuth via Supabase
  src/screens/SignInScreen.jsx
  .env.example
```
