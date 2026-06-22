-- Block supervisor approval while session is flagged invalid (e.g. overlapping times).
-- Submissions still sync so adults can see the issue; teen fixes locally and re-submits.

CREATE OR REPLACE FUNCTION public.trg_approvals_block_invalid_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sess RECORD;
BEGIN
  SELECT status, deleted_at, time_invalid
  INTO sess
  FROM public.sessions
  WHERE id = NEW.session_id;

  IF sess IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  IF sess.deleted_at IS NOT NULL OR sess.status <> 'saved' THEN
    RAISE EXCEPTION 'session_not_pending';
  END IF;

  IF sess.time_invalid THEN
    RAISE EXCEPTION 'session_invalid';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approvals_block_invalid_session ON public.approvals;

CREATE TRIGGER approvals_block_invalid_session
  BEFORE INSERT ON public.approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_approvals_block_invalid_session();

INSERT INTO public.app_config (key, value)
VALUES ('backend_revision', '20260627120000')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
