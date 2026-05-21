DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE command ILIKE '%ingest-muse%' OR jobname ILIKE '%muse%'
  LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.muse_ingest_runs CASCADE;
DROP TABLE IF EXISTS public.muse_query_seeds CASCADE;