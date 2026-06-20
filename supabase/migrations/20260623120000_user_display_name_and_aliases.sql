-- Display names for in-app labels; per-viewer nicknames for linked accounts.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';

UPDATE public.users
SET display_name = CASE
  WHEN trim(legal_name) = '' THEN ''
  WHEN position(' ' IN trim(legal_name)) = 0 THEN trim(legal_name)
  ELSE split_part(trim(legal_name), ' ', 1)
END
WHERE display_name = '' AND trim(legal_name) <> '';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_legal_name_length;
ALTER TABLE public.users
  ADD CONSTRAINT users_legal_name_length CHECK (char_length(legal_name) <= 128);

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_display_name_length;
ALTER TABLE public.users
  ADD CONSTRAINT users_display_name_length CHECK (char_length(display_name) <= 64);

CREATE TABLE IF NOT EXISTS public.user_aliases (
  owner_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_user_id, target_user_id),
  CONSTRAINT user_aliases_distinct_users CHECK (owner_user_id <> target_user_id),
  CONSTRAINT user_aliases_nickname_length CHECK (char_length(nickname) <= 64)
);

CREATE INDEX IF NOT EXISTS idx_user_aliases_owner ON public.user_aliases (owner_user_id);

ALTER TABLE public.user_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_aliases_select_own ON public.user_aliases
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY user_aliases_delete_own ON public.user_aliases
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_linked_to_user(p_other_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.links l
    WHERE l.status = 'active'
      AND (
        (l.teen_user_id = auth.uid() AND l.adult_user_id = p_other_user_id)
        OR (l.adult_user_id = auth.uid() AND l.teen_user_id = p_other_user_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.upsert_user_alias(p_target_user_id UUID, p_nickname TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  trimmed TEXT := trim(p_nickname);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.is_linked_to_user(p_target_user_id) THEN
    RAISE EXCEPTION 'not_linked';
  END IF;

  IF trimmed = '' THEN
    RAISE EXCEPTION 'nickname_required';
  END IF;

  IF char_length(trimmed) > 64 THEN
    RAISE EXCEPTION 'nickname_too_long';
  END IF;

  INSERT INTO public.user_aliases (owner_user_id, target_user_id, nickname, updated_at)
  VALUES (uid, p_target_user_id, trimmed, now())
  ON CONFLICT (owner_user_id, target_user_id)
  DO UPDATE SET nickname = EXCLUDED.nickname, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_alias(p_target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  DELETE FROM public.user_aliases
  WHERE owner_user_id = uid AND target_user_id = p_target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_user_alias(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_user_alias(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_user_alias(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_alias(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oauth_name TEXT;
  v_legal_name TEXT;
  v_display_name TEXT;
BEGIN
  v_oauth_name := trim(
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'legal_name',
      ''
    )
  );
  v_legal_name := v_oauth_name;
  IF v_oauth_name = '' OR position(' ' IN v_oauth_name) = 0 THEN
    v_display_name := v_oauth_name;
  ELSE
    v_display_name := split_part(v_oauth_name, ' ', 1);
  END IF;

  INSERT INTO public.users (
    id,
    email,
    legal_name,
    display_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_legal_name,
    v_display_name,
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

UPDATE public.app_config SET value = '20260623120000' WHERE key = 'backend_revision';
