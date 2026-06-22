-- Remove server-side session time overlap validation (client-only after inbound sync).

DROP TRIGGER IF EXISTS approvals_block_invalid_session ON public.approvals;
DROP FUNCTION IF EXISTS public.trg_approvals_block_invalid_session();

DROP TRIGGER IF EXISTS sessions_recompute_time_validation ON public.sessions;
DROP FUNCTION IF EXISTS public.trg_sessions_time_validation();
DROP FUNCTION IF EXISTS public.recompute_teen_session_time_validation(UUID);

ALTER TABLE public.sessions DROP COLUMN IF EXISTS time_invalid;

INSERT INTO public.app_config (key, value)
VALUES ('backend_revision', '20260628120000')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
