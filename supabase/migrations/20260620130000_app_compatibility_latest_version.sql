-- Optional "latest" app version for soft update nudges in Settings (min_app_version still gates writes).

INSERT INTO public.app_config (key, value) VALUES
  ('latest_app_version', '1.0.0')
ON CONFLICT (key) DO NOTHING;

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
      'accept_link_invite'
    )
  );
$$;
