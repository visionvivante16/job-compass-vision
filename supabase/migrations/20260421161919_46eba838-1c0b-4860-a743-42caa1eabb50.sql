CREATE TABLE IF NOT EXISTS public.arbeitnow_ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid,
  trigger_type text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'running',
  total_fetched integer NOT NULL DEFAULT 0,
  total_imported integer NOT NULL DEFAULT 0,
  total_skipped integer NOT NULL DEFAULT 0,
  total_filtered integer NOT NULL DEFAULT 0,
  duplicates_removed integer NOT NULL DEFAULT 0,
  duration_ms integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  errors jsonb DEFAULT '[]'::jsonb,
  details jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.arbeitnow_ingest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view arbeitnow runs"
  ON public.arbeitnow_ingest_runs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role can insert arbeitnow runs"
  ON public.arbeitnow_ingest_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update arbeitnow runs"
  ON public.arbeitnow_ingest_runs FOR UPDATE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_arbeitnow_runs_started_at
  ON public.arbeitnow_ingest_runs (started_at DESC);