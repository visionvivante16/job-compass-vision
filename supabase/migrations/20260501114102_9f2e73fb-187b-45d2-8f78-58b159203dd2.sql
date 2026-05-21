-- Track when we last nudged a user for inactivity (cooldown enforcement)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_inactivity_nudge_at TIMESTAMPTZ;

-- Schedule midday digest (12:00 UTC) — reuses send-daily-digest with window=midday
SELECT cron.schedule(
  'midday-job-digest',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dyguncqqjzuyiwxhgwcw.supabase.co/functions/v1/send-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.read_vault_secret_internal('SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{"window":"midday"}'::jsonb
  );
  $$
);

-- Schedule inactivity nudge (09:00 UTC daily)
SELECT cron.schedule(
  'inactivity-nudge-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dyguncqqjzuyiwxhgwcw.supabase.co/functions/v1/send-inactivity-nudge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.read_vault_secret_internal('SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  );
  $$
);