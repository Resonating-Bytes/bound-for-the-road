-- Expand get_app_compatibility capabilities to match app 1.5.x RPC surface.

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
      'delete_user_alias'
    )
  );
$$;

UPDATE public.app_config SET value = '20260624120000' WHERE key = 'backend_revision';
