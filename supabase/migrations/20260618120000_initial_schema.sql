-- Bound for the Road — Phase 2 Postgres schema (mirrors mobile/src/db/schema.js)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- users (profile extends Supabase Auth)
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'teen' CHECK (role IN ('teen', 'adult')),
  legal_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  date_of_birth DATE,
  state_code TEXT NOT NULL DEFAULT 'IL',
  permit_issue_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON public.users (role);

-- Auto-create profile row when auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, legal_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'legal_name', ''),
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- links (teen ↔ adult)
-- ---------------------------------------------------------------------------
CREATE TABLE public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  adult_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT links_distinct_users CHECK (teen_user_id <> adult_user_id),
  CONSTRAINT links_unique_pair UNIQUE (teen_user_id, adult_user_id)
);

CREATE INDEX idx_links_teen ON public.links (teen_user_id, status);
CREATE INDEX idx_links_adult ON public.links (adult_user_id, status);

-- ---------------------------------------------------------------------------
-- link_invites (6-digit codes, 24h TTL — BACKEND.md)
-- ---------------------------------------------------------------------------
CREATE TABLE public.link_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT link_invites_code_format CHECK (code ~ '^[0-9]{6}$')
);

CREATE INDEX idx_link_invites_code ON public.link_invites (code) WHERE used_at IS NULL;
CREATE INDEX idx_link_invites_teen ON public.link_invites (teen_user_id);

-- ---------------------------------------------------------------------------
-- sessions (sync + adult presence; device remains source of truth for drafts)
-- ---------------------------------------------------------------------------
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY,
  teen_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  state_code TEXT NOT NULL DEFAULT 'IL',
  status TEXT NOT NULL CHECK (status IN ('active', 'draft', 'saved', 'deleted')),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  day_night TEXT CHECK (day_night IN ('day', 'night')),
  notes TEXT,
  request_hash TEXT,
  payload_json TEXT,
  active_supervisor_id UUID REFERENCES public.users (id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_teen_status ON public.sessions (teen_user_id, status);
CREATE INDEX idx_sessions_teen_started ON public.sessions (teen_user_id, started_at DESC);

CREATE TRIGGER sessions_set_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- submissions & approvals
-- ---------------------------------------------------------------------------
CREATE TABLE public.submissions (
  request_hash TEXT PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  submitted_by_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  superseded BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_submissions_session ON public.submissions (session_id);

CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_hash TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  approved_by_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ NOT NULL,
  joined_session BOOLEAN,
  supervisor_in_vehicle_name TEXT,
  approver_present TEXT
);

CREATE INDEX idx_approvals_session ON public.approvals (session_id);
CREATE INDEX idx_approvals_hash ON public.approvals (request_hash);

-- ---------------------------------------------------------------------------
-- push_tokens (Phase 2 notifications)
-- ---------------------------------------------------------------------------
CREATE TABLE public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX idx_push_tokens_user ON public.push_tokens (user_id);
