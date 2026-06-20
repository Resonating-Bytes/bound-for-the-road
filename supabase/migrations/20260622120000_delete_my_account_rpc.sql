-- Hard-delete the signed-in auth user; cascades public.users, links, sessions, push tokens, etc.
-- Clears active_supervisor_id first (no ON DELETE on that FK).

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.sessions
  SET active_supervisor_id = NULL
  WHERE active_supervisor_id = uid;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

UPDATE public.app_config SET value = '20260622120000' WHERE key = 'backend_revision';
