-- Reassign a device push token to the signed-in user (clears stale rows from account switching).
-- Client RLS only allows deleting own rows; this runs as SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.register_push_token(p_token TEXT, p_platform TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'invalid_platform';
  END IF;

  IF length(trim(coalesce(p_token, ''))) = 0 THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  DELETE FROM public.push_tokens WHERE token = p_token;

  INSERT INTO public.push_tokens (user_id, token, platform)
  VALUES (auth.uid(), p_token, p_platform);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_push_token(TEXT, TEXT) TO authenticated;

-- One-time dedupe: keep newest row per token (users should sign in again to re-register).
DELETE FROM public.push_tokens pt
WHERE pt.id NOT IN (
  SELECT DISTINCT ON (token) id
  FROM public.push_tokens
  ORDER BY token, created_at DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_token_unique ON public.push_tokens (token);

UPDATE public.app_config SET value = '20260621120000' WHERE key = 'backend_revision';
