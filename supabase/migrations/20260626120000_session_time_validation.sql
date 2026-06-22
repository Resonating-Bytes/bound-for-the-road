-- Flag saved sessions whose times overlap another saved session for the same teen.
-- Oldest session (earliest started_at, then created_at) in each overlap group stays valid.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS time_invalid BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.recompute_teen_session_time_validation(p_teen_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  keeper_id UUID;
BEGIN
  UPDATE public.sessions
  SET time_invalid = false
  WHERE teen_user_id = p_teen_id
    AND status = 'saved'
    AND deleted_at IS NULL;

  FOR rec IN
    WITH eligible AS (
      SELECT id, started_at, ended_at, created_at
      FROM public.sessions
      WHERE teen_user_id = p_teen_id
        AND status = 'saved'
        AND deleted_at IS NULL
        AND ended_at IS NOT NULL
        AND ended_at > started_at
    ),
    pairs AS (
      SELECT DISTINCT
        CASE
          WHEN a.started_at < b.started_at
            OR (a.started_at = b.started_at AND a.created_at <= b.created_at)
          THEN b.id
          ELSE a.id
        END AS invalid_id
      FROM eligible a
      JOIN eligible b ON a.id <> b.id
      WHERE a.started_at < b.ended_at
        AND b.started_at < a.ended_at
    )
    SELECT invalid_id FROM pairs
  LOOP
    UPDATE public.sessions
    SET time_invalid = true
    WHERE id = rec.invalid_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sessions_time_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teen UUID;
BEGIN
  teen := COALESCE(NEW.teen_user_id, OLD.teen_user_id);
  IF teen IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_teen_session_time_validation(teen);
    RETURN OLD;
  END IF;

  IF NEW.status = 'saved'
    OR (TG_OP = 'UPDATE' AND OLD.status = 'saved') THEN
    PERFORM public.recompute_teen_session_time_validation(teen);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sessions_recompute_time_validation ON public.sessions;

CREATE TRIGGER sessions_recompute_time_validation
  AFTER INSERT OR UPDATE OF started_at, ended_at, status, deleted_at OR DELETE
  ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sessions_time_validation();

INSERT INTO public.app_config (key, value)
VALUES ('backend_revision', '20260626120000')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
