-- 1) Mark current stuck running ingest row as failed
UPDATE public.ats_ingest_runs
SET status = 'failed',
    completed_at = now(),
    duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::int * 1000,
    errors = '[{"slug":"runtime","platform":"edge","error":"Edge function exceeded 400s wall-time limit; partial import. Function refactored to batch-dedup for next run."}]'::jsonb
WHERE status = 'running'
  AND started_at < now() - interval '15 minutes';

UPDATE public.ats_discovery_runs
SET status = 'failed',
    completed_at = now(),
    duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::int * 1000,
    errors = '[{"error":"Run exceeded edge wall-time limit"}]'::jsonb
WHERE status = 'running'
  AND started_at < now() - interval '15 minutes';

-- 2) Self-healing function: auto-fail any stuck run on a schedule
CREATE OR REPLACE FUNCTION public.mark_stuck_ats_runs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ats_ingest_runs
  SET status = 'failed',
      completed_at = now(),
      duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::int * 1000,
      errors = COALESCE(errors, '[]'::jsonb) || '[{"error":"Auto-failed: run exceeded edge function wall-time"}]'::jsonb
  WHERE status = 'running'
    AND started_at < now() - interval '15 minutes';

  UPDATE public.ats_discovery_runs
  SET status = 'failed',
      completed_at = now(),
      duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::int * 1000,
      errors = COALESCE(errors, '[]'::jsonb) || '[{"error":"Auto-failed: run exceeded edge function wall-time"}]'::jsonb
  WHERE status = 'running'
    AND started_at < now() - interval '15 minutes';
END;
$$;

-- 3) Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 4) Unschedule any pre-existing copies (idempotent re-runs)
DO $$
BEGIN
  PERFORM cron.unschedule('ats-discovery-weekly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('ats-ingest-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('ats-mark-stuck-runs');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5) Weekly discovery — Sunday 00:00 UTC
SELECT cron.schedule(
  'ats-discovery-weekly',
  '0 0 * * 0',
  $cron$
  SELECT net.http_post(
    url := 'https://dyguncqqjzuyiwxhgwcw.supabase.co/functions/v1/cron-trigger-ats-discovery',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT public.read_vault_secret('SUPABASE_SERVICE_ROLE_KEY'))
    ),
    body := jsonb_build_object('trigger_type', 'scheduled')
  );
  $cron$
);

-- 6) Daily ingest — 02:30 UTC
SELECT cron.schedule(
  'ats-ingest-daily',
  '30 2 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://dyguncqqjzuyiwxhgwcw.supabase.co/functions/v1/cron-trigger-ats-ingest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT public.read_vault_secret('SUPABASE_SERVICE_ROLE_KEY'))
    ),
    body := jsonb_build_object('trigger_type', 'scheduled')
  );
  $cron$
);

-- 7) Janitor — every 10 minutes, mark stuck runs as failed
SELECT cron.schedule(
  'ats-mark-stuck-runs',
  '*/10 * * * *',
  $cron$ SELECT public.mark_stuck_ats_runs(); $cron$
);