-- Server-side sync watermark: reject writes when the client has not merged newer teen data.

CREATE OR REPLACE FUNCTION public.teen_sync_watermark(p_teen_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_watermark TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF auth.uid() <> p_teen_id AND NOT public.is_linked_to_teen(p_teen_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT GREATEST(
    COALESCE(
      (SELECT MAX(s.updated_at) FROM public.sessions s WHERE s.teen_user_id = p_teen_id),
      TIMESTAMPTZ '-infinity'
    ),
    COALESCE(
      (
        SELECT MAX(sub.submitted_at)
        FROM public.submissions sub
        INNER JOIN public.sessions s ON s.id = sub.session_id
        WHERE s.teen_user_id = p_teen_id
      ),
      TIMESTAMPTZ '-infinity'
    ),
    COALESCE(
      (
        SELECT MAX(a.approved_at)
        FROM public.approvals a
        INNER JOIN public.sessions s ON s.id = a.session_id
        WHERE s.teen_user_id = p_teen_id
      ),
      TIMESTAMPTZ '-infinity'
    )
  )
  INTO v_watermark;

  RETURN v_watermark;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_teen_sync_current(p_teen_id UUID, p_client_sync_at TIMESTAMPTZ)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_client_sync_at IS NULL THEN
    RAISE EXCEPTION 'sync_stale';
  END IF;

  IF public.teen_sync_watermark(p_teen_id) > p_client_sync_at THEN
    RAISE EXCEPTION 'sync_stale';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_session_for_approval(
  p_client_sync_at TIMESTAMPTZ,
  p_session JSONB,
  p_request_hash TEXT,
  p_payload_json TEXT,
  p_submitted_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teen_id UUID := auth.uid();
  v_session_id UUID := (p_session->>'id')::UUID;
BEGIN
  IF v_teen_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_session_id IS NULL OR p_request_hash IS NULL OR p_payload_json IS NULL OR p_submitted_at IS NULL THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  PERFORM public.assert_teen_sync_current(v_teen_id, p_client_sync_at);

  IF EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = v_session_id
      AND s.teen_user_id <> v_teen_id
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.submissions
  SET superseded = true
  WHERE session_id = v_session_id;

  INSERT INTO public.sessions (
    id,
    teen_user_id,
    state_code,
    status,
    started_at,
    ended_at,
    duration_minutes,
    night_minutes,
    notes,
    request_hash,
    payload_json,
    active_supervisor_id,
    deleted_at
  )
  VALUES (
    v_session_id,
    v_teen_id,
    COALESCE(p_session->>'state_code', 'IL'),
    COALESCE(p_session->>'status', 'saved'),
    (p_session->>'started_at')::TIMESTAMPTZ,
    NULLIF(p_session->>'ended_at', '')::TIMESTAMPTZ,
    NULLIF(p_session->>'duration_minutes', '')::INTEGER,
    NULLIF(p_session->>'night_minutes', '')::INTEGER,
    NULLIF(p_session->>'notes', ''),
    p_request_hash,
    p_payload_json,
    NULLIF(p_session->>'active_supervisor_id', '')::UUID,
    NULLIF(p_session->>'deleted_at', '')::TIMESTAMPTZ
  )
  ON CONFLICT (id) DO UPDATE SET
    state_code = EXCLUDED.state_code,
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    ended_at = EXCLUDED.ended_at,
    duration_minutes = EXCLUDED.duration_minutes,
    night_minutes = EXCLUDED.night_minutes,
    notes = EXCLUDED.notes,
    request_hash = EXCLUDED.request_hash,
    payload_json = EXCLUDED.payload_json,
    active_supervisor_id = EXCLUDED.active_supervisor_id,
    deleted_at = EXCLUDED.deleted_at,
    updated_at = now();

  INSERT INTO public.submissions (
    request_hash,
    session_id,
    payload_json,
    submitted_at,
    submitted_by_user_id,
    superseded
  )
  VALUES (
    p_request_hash,
    v_session_id,
    p_payload_json,
    p_submitted_at,
    v_teen_id,
    false
  )
  ON CONFLICT (request_hash) DO UPDATE SET
    session_id = EXCLUDED.session_id,
    payload_json = EXCLUDED.payload_json,
    submitted_at = EXCLUDED.submitted_at,
    submitted_by_user_id = EXCLUDED.submitted_by_user_id,
    superseded = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_submission_synced(
  p_client_sync_at TIMESTAMPTZ,
  p_request_hash TEXT,
  p_session_id UUID,
  p_approval_id UUID,
  p_approved_at TIMESTAMPTZ,
  p_joined_session BOOLEAN,
  p_supervisor_in_vehicle_name TEXT,
  p_approver_present TEXT
)
RETURNS public.approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teen_user_id UUID;
  v_row public.approvals;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT s.teen_user_id
  INTO v_teen_user_id
  FROM public.sessions s
  WHERE s.id = p_session_id;

  IF v_teen_user_id IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  IF NOT public.is_linked_to_teen(v_teen_user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM public.assert_teen_sync_current(v_teen_user_id, p_client_sync_at);

  IF NOT EXISTS (
    SELECT 1
    FROM public.submissions sub
    WHERE sub.request_hash = p_request_hash
      AND sub.session_id = p_session_id
      AND sub.superseded = false
  ) THEN
    RAISE EXCEPTION 'submission_not_pending';
  END IF;

  IF EXISTS (SELECT 1 FROM public.approvals WHERE request_hash = p_request_hash) THEN
    RAISE EXCEPTION 'already_approved';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = p_session_id
      AND (s.status <> 'saved' OR s.deleted_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'session_not_pending';
  END IF;

  INSERT INTO public.approvals (
    id,
    request_hash,
    session_id,
    approved_by_user_id,
    approved_at,
    joined_session,
    supervisor_in_vehicle_name,
    approver_present
  )
  VALUES (
    COALESCE(p_approval_id, gen_random_uuid()),
    p_request_hash,
    p_session_id,
    auth.uid(),
    COALESCE(p_approved_at, now()),
    p_joined_session,
    p_supervisor_in_vehicle_name,
    p_approver_present
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_submission_synced(
  p_client_sync_at TIMESTAMPTZ,
  p_request_hash TEXT,
  p_session JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teen_id UUID := auth.uid();
  v_session_id UUID := (p_session->>'id')::UUID;
BEGIN
  IF v_teen_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_session_id IS NULL OR p_request_hash IS NULL THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  PERFORM public.assert_teen_sync_current(v_teen_id, p_client_sync_at);

  IF EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = v_session_id
      AND s.teen_user_id <> v_teen_id
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.submissions
  SET superseded = true
  WHERE request_hash = p_request_hash
    AND session_id = v_session_id
    AND submitted_by_user_id = v_teen_id;

  INSERT INTO public.sessions (
    id,
    teen_user_id,
    state_code,
    status,
    started_at,
    ended_at,
    duration_minutes,
    night_minutes,
    notes,
    request_hash,
    payload_json,
    active_supervisor_id,
    deleted_at
  )
  VALUES (
    v_session_id,
    v_teen_id,
    COALESCE(p_session->>'state_code', 'IL'),
    COALESCE(p_session->>'status', 'saved'),
    (p_session->>'started_at')::TIMESTAMPTZ,
    NULLIF(p_session->>'ended_at', '')::TIMESTAMPTZ,
    NULLIF(p_session->>'duration_minutes', '')::INTEGER,
    NULLIF(p_session->>'night_minutes', '')::INTEGER,
    NULLIF(p_session->>'notes', ''),
    NULLIF(p_session->>'request_hash', ''),
    NULLIF(p_session->>'payload_json', ''),
    NULLIF(p_session->>'active_supervisor_id', '')::UUID,
    NULLIF(p_session->>'deleted_at', '')::TIMESTAMPTZ
  )
  ON CONFLICT (id) DO UPDATE SET
    state_code = EXCLUDED.state_code,
    status = EXCLUDED.status,
    started_at = EXCLUDED.started_at,
    ended_at = EXCLUDED.ended_at,
    duration_minutes = EXCLUDED.duration_minutes,
    night_minutes = EXCLUDED.night_minutes,
    notes = EXCLUDED.notes,
    request_hash = EXCLUDED.request_hash,
    payload_json = EXCLUDED.payload_json,
    active_supervisor_id = EXCLUDED.active_supervisor_id,
    deleted_at = EXCLUDED.deleted_at,
    updated_at = now();
END;
$$;

DROP FUNCTION IF EXISTS public.decline_submission(TEXT);

CREATE OR REPLACE FUNCTION public.decline_submission(
  p_request_hash TEXT,
  p_client_sync_at TIMESTAMPTZ
)
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

  PERFORM public.assert_teen_sync_current(v_teen_user_id, p_client_sync_at);

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

GRANT EXECUTE ON FUNCTION public.teen_sync_watermark(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_session_for_approval(TIMESTAMPTZ, JSONB, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_submission_synced(TIMESTAMPTZ, TEXT, UUID, UUID, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_submission_synced(TIMESTAMPTZ, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_submission(TEXT, TIMESTAMPTZ) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_app_compatibility()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'backend_revision', (SELECT value FROM public.app_config WHERE key = 'backend_revision'),
    'min_app_version', (SELECT value FROM public.app_config WHERE key = 'min_app_version'),
    'latest_app_version', (SELECT value FROM public.app_config WHERE key = 'latest_app_version'),
    'payload_schema_version', (SELECT value FROM public.app_config WHERE key = 'payload_schema_version'),
    'capabilities', json_build_array(
      'decline_submission',
      'send_approval_push_session_submitted',
      'send_approval_push_session_approved',
      'send_approval_push_session_declined',
      'send_approval_push_session_withdrawn',
      'accept_link_invite',
      'register_push_token',
      'delete_my_account',
      'upsert_user_alias',
      'delete_user_alias',
      'teen_sync_watermark',
      'submit_session_for_approval',
      'approve_submission_synced',
      'withdraw_submission_synced'
    )
  );
$$;

INSERT INTO public.app_config (key, value)
VALUES ('backend_revision', '20260629120000')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
