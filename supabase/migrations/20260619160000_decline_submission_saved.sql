-- Keep declined sessions saved (clear hash only) so teen dashboard still lists them.

CREATE OR REPLACE FUNCTION public.decline_submission(p_request_hash TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_teen_user_id UUID;
  v_has_approval BOOLEAN;
BEGIN
  SELECT s.id, s.teen_user_id
  INTO v_session_id, v_teen_user_id
  FROM public.submissions sub
  JOIN public.sessions s ON s.id = sub.session_id
  WHERE sub.request_hash = p_request_hash
    AND sub.superseded = false;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'submission_not_found';
  END IF;

  IF NOT public.is_linked_to_teen(v_teen_user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.approvals WHERE request_hash = p_request_hash
  ) INTO v_has_approval;

  IF v_has_approval THEN
    RAISE EXCEPTION 'already_approved';
  END IF;

  UPDATE public.submissions
  SET superseded = true
  WHERE request_hash = p_request_hash;

  UPDATE public.sessions
  SET request_hash = NULL,
      payload_json = NULL
  WHERE id = v_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_submission(TEXT) TO authenticated;
