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

Apply **every** file in `supabase/migrations/` **in filename order** (timestamp prefix). Each file is idempotent where noted in SQL comments; never skip or reorder.

**Option A — SQL Editor (no CLI)**

1. Dashboard → **SQL Editor** → **New query**
2. For each `supabase/migrations/*.sql` (sorted by name): paste contents → **Run**
3. Confirm `app_config.backend_revision` matches the latest migration you applied (see [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md))

**Option B — Supabase CLI**

```powershell
# Install: npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Versioning and `MIN_BACKEND_REVISION`: [COMPATIBILITY.md](./COMPATIBILITY.md). Release steps: [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md).

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
   - **Site URL** — **not** `http://localhost:3000`. Copy **Email redirect** from the app sign-in screen (dev hint), e.g. `exp://192.168.68.121:8081?auth_callback=1`. Must match exactly (one `:PORT`, correct IP). Used when `emailRedirectTo` is missing or not on the allow list. Do **not** use `/--/auth/callback`.
   - **Redirect URLs** — add `exp://**` and `boundfortheroad://**`. Supabase only accepts `emailRedirectTo` from the app when it matches this list; otherwise it falls back to **Site URL**.

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

## 6b. Email sign-in (app)

### Supabase

1. **Authentication → Providers → Email** — enable.
2. On the same **Email** provider screen: **Confirm email** — ON (recommended for production).
3. **Authentication → URL Configuration** — add:
   - `exp://**` and `boundfortheroad://**` (OAuth and Expo Go email links)
   - Your hosted **email bridge** HTTPS URL when using `EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL` (see below)
4. **Authentication → Email Templates** — customize confirm and reset copy; keep `{{ .ConfirmationURL }}` in the body.
5. **Authentication → SMTP Settings** (or **Project Settings → Authentication → SMTP**) — optional for dev (Supabase built-in is fine). Configure custom SMTP before production; see [TODO.md](./TODO.md) backlog.

Optional hardening (location varies by dashboard version): minimum password length and rate limits may appear under **Authentication → Attack Protection** or on the **Email** provider panel — not required for initial testing.

### Email redirect bridge (recommended for Expo Go)

Email confirm links that jump straight to `exp://…/--/auth/callback` can make **Expo Go** show “Could not connect to the server” before the app loads — especially on a second tap (`otp_expired`) or when the link was opened on a laptop first.

1. Host [`web/auth-callback/index.html`](../web/auth-callback/index.html) at a stable HTTPS URL (GitHub Pages, Netlify, etc.).
2. Add that URL (and `https://your-host/**` if Supabase allows wildcards) under **Redirect URLs**.
3. In `mobile/.env` set:
   ```
   EXPO_PUBLIC_AUTH_WEB_REDIRECT_URL=https://your-host/auth-callback
   ```
4. Restart Expo. The sign-in screen (dev) shows **Email redirect** — confirm it matches what you added in Supabase.
5. **Resend confirmation** (or register again) so new emails use the bridge. Old emails still point at the previous redirect.

The bridge page shows “Email already confirmed” for used links instead of handing a broken `exp://` URL to Expo Go. Successful confirms redirect into the app.

Without the bridge, Expo Go uses `exp://YOUR_IP:PORT?auth_callback=1` (no `/--/` path). You must still **resend** after changing IP/port or redirect format.

### Test in the app

1. **Create account** — email, password, confirm password → “Check your email”.
2. Open the confirmation link on device (mail app → browser/app) → completes sign-in.
3. **Sign in** with email + password.
4. **Forgot password** — generic success message even for unknown emails.
5. Open reset link → **New password** screen → update → onboarding or dashboard.

Unconfirmed sign-in shows a **Resend confirmation** option.

**`otp_expired` on confirm link:** Usually the link was already used — e.g. first tap on a laptop (blank page is normal; `exp://` links do not open in a desktop browser) still confirms the account on Supabase. A second tap on the phone then shows `otp_expired`. With the HTTPS bridge or updated app, you should see “Email already confirmed” (web) or the sign-in screen with a green notice (app) instead of an Expo error. Sign in with your password to continue.

---

## 7. RLS smoke test (optional)

After you enable Email or Google auth in Dashboard and create a test user:

1. **Table Editor** → `users` — one row with `id` = auth user UUID
2. Signed-in client can `select` own row only (RLS policies from the migrations under `supabase/migrations/`)

Full auth + sync testing comes in the next Phase 2 slices.

---

## What’s not covered here

- Outbox sync from local SQLite — see [TODO.md](./TODO.md)
- Sign in with Apple (needs dev build) — [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md)

Edge functions deploy automatically on merge to `main` when `supabase/functions/**` changes. See [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md).

---

## Repo layout

```
supabase/
  migrations/          # *.sql — apply in filename order
  functions/           # edge functions (e.g. send-approval-push)
mobile/
  src/lib/supabase.js  # client + health check
  src/lib/googleAuth.js
  src/lib/emailAuth.js
  src/lib/authCallback.js
  .env.example
```
