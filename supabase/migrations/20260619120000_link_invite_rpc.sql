-- Adult accepts a teen's 6-digit invite code (RLS blocks direct invite reads for adults).

CREATE OR REPLACE FUNCTION public.accept_link_invite(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adult_id UUID := auth.uid();
  v_normalized TEXT;
  v_invite public.link_invites%ROWTYPE;
  v_link public.links%ROWTYPE;
BEGIN
  IF v_adult_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = v_adult_id AND role = 'adult'
  ) THEN
    RAISE EXCEPTION 'adult_role_required';
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
  VALUES (v_invite.teen_user_id, v_adult_id, 'active')
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

REVOKE ALL ON FUNCTION public.accept_link_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_link_invite(TEXT) TO authenticated;

-- Linked accounts can read each other's profile names (for confirmation UI).
CREATE POLICY users_select_linked ON public.users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.links l
      WHERE l.status = 'active'
        AND (
          (l.teen_user_id = auth.uid() AND l.adult_user_id = users.id)
          OR (l.adult_user_id = auth.uid() AND l.teen_user_id = users.id)
        )
    )
  );
