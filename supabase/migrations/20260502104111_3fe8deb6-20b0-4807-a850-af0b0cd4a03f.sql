-- Fix: daily-job-digest was authenticating with the anon key, causing the
-- send-daily-digest edge function to reject it as Unauthorized. Switch to
-- service role key from vault, matching midday-job-digest.

SELECT cron.unschedule('daily-job-digest');

SELECT cron.schedule(
  'daily-job-digest',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dyguncqqjzuyiwxhgwcw.supabase.co/functions/v1/send-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.read_vault_secret_internal('SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{"window":"morning"}'::jsonb
  );
  $$
);