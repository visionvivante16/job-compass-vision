-- Remove the market alerts feature: drop scheduled job (if any) and table.
DO $$
DECLARE
  jid bigint;
BEGIN
  FOR jid IN
    SELECT jobid FROM cron.job
    WHERE command ILIKE '%generate-daily-market-alert%'
       OR jobname ILIKE '%market-alert%'
       OR jobname ILIKE '%market_alert%'
  LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

DROP TABLE IF EXISTS public.market_alerts CASCADE;