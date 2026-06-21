-- Session night-minute split for IL 10-hour progress (day = duration - night).

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS night_minutes INTEGER;

UPDATE public.sessions
SET night_minutes = duration_minutes
WHERE day_night = 'night' AND night_minutes IS NULL;

UPDATE public.sessions
SET night_minutes = 0
WHERE (day_night = 'day' OR day_night IS NULL) AND night_minutes IS NULL;

UPDATE public.sessions
SET night_minutes = 0
WHERE night_minutes IS NULL AND duration_minutes IS NOT NULL;

INSERT INTO public.app_config (key, value)
VALUES ('backend_revision', '20260625120000')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

UPDATE public.app_config SET value = '2' WHERE key = 'payload_schema_version';
