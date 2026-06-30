-- Phase 1: instructor role, driving schools, instructor affiliation

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('teen', 'adult', 'instructor'));

-- ---------------------------------------------------------------------------
-- driving_schools (minimal v1 — full registry in Phase 3)
-- ---------------------------------------------------------------------------
CREATE TABLE public.driving_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  onboarding_link_id TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  email TEXT,
  website TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT driving_schools_onboarding_link_id_unique UNIQUE (onboarding_link_id),
  CONSTRAINT driving_schools_onboarding_link_id_format CHECK (onboarding_link_id ~ '^[0-9]{6}$')
);

CREATE INDEX idx_driving_schools_owner_email ON public.driving_schools (lower(owner_email));

CREATE TRIGGER driving_schools_set_updated_at
  BEFORE UPDATE ON public.driving_schools
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- school_admins (web Phase 5 — seeded now for owner auto-link)
-- ---------------------------------------------------------------------------
CREATE TABLE public.school_admins (
  school_id UUID NOT NULL REFERENCES public.driving_schools (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, user_id)
);

CREATE INDEX idx_school_admins_user ON public.school_admins (user_id);

-- ---------------------------------------------------------------------------
-- instructor_school (1:1 instructor ↔ school in v1)
-- ---------------------------------------------------------------------------
CREATE TABLE public.instructor_school (
  instructor_user_id UUID PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.driving_schools (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instructor_school_school ON public.instructor_school (school_id);

-- ---------------------------------------------------------------------------
-- accept_link_invite: allow instructors (same links table, adult_user_id column)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_link_invite(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supervisor_id UUID := auth.uid();
  v_normalized TEXT;
  v_invite public.link_invites%ROWTYPE;
  v_link public.links%ROWTYPE;
BEGIN
  IF v_supervisor_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = v_supervisor_id
      AND role IN ('adult', 'instructor')
  ) THEN
    RAISE EXCEPTION 'supervisor_role_required';
  END IF;

  v_normalized := regexp_replace(COALESCE(p_code, ''), '[^0-9]', '', 'g');

  IF length(v_normalized) <> 6 THEN
    RAISE EXCEPTION 'invalid_or_expired_code';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.link_invites
  WHERE code = v_normalized
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_code';
  END IF;

  UPDATE public.link_invites
  SET used_at = now()
  WHERE id = v_invite.id;

  INSERT INTO public.links (teen_user_id, adult_user_id, status)
  VALUES (v_invite.teen_user_id, v_supervisor_id, 'active')
  ON CONFLICT (teen_user_id, adult_user_id)
  DO UPDATE SET status = 'active'
  RETURNING * INTO v_link;

  RETURN json_build_object(
    'id', v_link.id,
    'teen_user_id', v_link.teen_user_id,
    'adult_user_id', v_link.adult_user_id,
    'status', v_link.status,
    'created_at', v_link.created_at
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Instructor school affiliation RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_instructor_school()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT ds.id, ds.name, ds.onboarding_link_id
  INTO v_row
  FROM public.instructor_school ins
  JOIN public.driving_schools ds ON ds.id = ins.school_id
  WHERE ins.instructor_user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'school_id', v_row.id,
    'school_name', v_row.name,
    'onboarding_link_id', v_row.onboarding_link_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.try_auto_affiliate_instructor()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_school_id UUID;
  v_school_name TEXT;
  v_onboarding_link_id TEXT;
  v_match_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = v_user_id AND role = 'instructor'
  ) THEN
    RAISE EXCEPTION 'instructor_role_required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.instructor_school WHERE instructor_user_id = v_user_id
  ) THEN
    RETURN public.get_instructor_school();
  END IF;

  SELECT lower(email)
  INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT count(*)::INTEGER
  INTO v_match_count
  FROM public.driving_schools ds
  WHERE lower(ds.owner_email) = v_email
     OR EXISTS (
       SELECT 1
       FROM public.school_admins sa
       WHERE sa.school_id = ds.id
         AND sa.user_id = v_user_id
     );

  IF v_match_count <> 1 THEN
    RETURN NULL;
  END IF;

  SELECT ds.id, ds.name, ds.onboarding_link_id
  INTO v_school_id, v_school_name, v_onboarding_link_id
  FROM public.driving_schools ds
  WHERE lower(ds.owner_email) = v_email
     OR EXISTS (
       SELECT 1
       FROM public.school_admins sa
       WHERE sa.school_id = ds.id
         AND sa.user_id = v_user_id
     )
  LIMIT 1;

  INSERT INTO public.instructor_school (instructor_user_id, school_id)
  VALUES (v_user_id, v_school_id);

  RETURN json_build_object(
    'school_id', v_school_id,
    'school_name', v_school_name,
    'onboarding_link_id', v_onboarding_link_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_instructor_with_link_id(p_link_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_normalized TEXT;
  v_school_id UUID;
  v_school_name TEXT;
  v_onboarding_link_id TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = v_user_id AND role = 'instructor'
  ) THEN
    RAISE EXCEPTION 'instructor_role_required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.instructor_school WHERE instructor_user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'already_affiliated';
  END IF;

  v_normalized := regexp_replace(COALESCE(p_link_id, ''), '[^0-9]', '', 'g');

  IF length(v_normalized) <> 6 THEN
    RAISE EXCEPTION 'invalid_link_id';
  END IF;

  SELECT ds.id, ds.name, ds.onboarding_link_id
  INTO v_school_id, v_school_name, v_onboarding_link_id
  FROM public.driving_schools ds
  WHERE ds.onboarding_link_id = v_normalized;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_link_id';
  END IF;

  INSERT INTO public.instructor_school (instructor_user_id, school_id)
  VALUES (v_user_id, v_school_id);

  RETURN json_build_object(
    'school_id', v_school_id,
    'school_name', v_school_name,
    'onboarding_link_id', v_onboarding_link_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_instructor_school() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_instructor_school() TO authenticated;

REVOKE ALL ON FUNCTION public.try_auto_affiliate_instructor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_auto_affiliate_instructor() TO authenticated;

REVOKE ALL ON FUNCTION public.affiliate_instructor_with_link_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.affiliate_instructor_with_link_id(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.driving_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_school ENABLE ROW LEVEL SECURITY;

CREATE POLICY instructor_school_select_own ON public.instructor_school
  FOR SELECT TO authenticated
  USING (instructor_user_id = auth.uid());

CREATE POLICY driving_schools_select_affiliated ON public.driving_schools
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.instructor_school ins
      WHERE ins.school_id = driving_schools.id
        AND ins.instructor_user_id = auth.uid()
    )
  );

CREATE POLICY school_admins_select_own ON public.school_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
