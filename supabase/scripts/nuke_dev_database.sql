-- Bound for the Road — DEV ONLY: wipe all data (schema + RPCs + RLS stay intact).
--
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- Requires project owner access (runs as postgres).
--
-- After this:
--   1. Sign out on both phones (or clear Expo Go app data / reinstall).
--   2. Sign in again with Google — new auth users + fresh public.users rows.
--   3. Re-link teen ↔ adult with a new invite code.
--
-- You do NOT need to re-run migrations unless you dropped the schema.

-- Application tables (order handled by CASCADE)
TRUNCATE TABLE
  public.push_tokens,
  public.approvals,
  public.submissions,
  public.sessions,
  public.link_invites,
  public.links,
  public.users
RESTART IDENTITY CASCADE;

-- Auth users (Google/Apple identities, sessions, refresh tokens)
DELETE FROM auth.users;
