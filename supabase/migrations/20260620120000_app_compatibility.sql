-- Backend compatibility metadata for mobile startup checks.

CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- No direct reads; clients use get_app_compatibility().

INSERT INTO public.app_config (key, value) VALUES
  ('backend_revision', '20260620120000'),
  ('min_app_version', '1.0.0'),
  ('payload_schema_version', '1');

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
    'payload_schema_version', (SELECT value FROM public.app_config WHERE key = 'payload_schema_version'),
    'capabilities', json_build_array(
      'decline_submission',
      'send_approval_push_session_submitted',
      'send_approval_push_session_approved',
      'send_approval_push_session_declined',
      'send_approval_push_session_withdrawn',
      'accept_link_invite'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_app_compatibility() TO anon, authenticated;
