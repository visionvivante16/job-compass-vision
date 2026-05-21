-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old job if present
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-weekly-digest-sunday';

-- Sundays at 14:00 UTC (mid-morning US eastern, late afternoon Europe)
SELECT cron.schedule(
  'send-weekly-digest-sunday',
  '0 14 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://dyguncqqjzuyiwxhgwcw.supabase.co/functions/v1/send-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.read_vault_secret_internal('service_role_key')
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  );
  $$
);