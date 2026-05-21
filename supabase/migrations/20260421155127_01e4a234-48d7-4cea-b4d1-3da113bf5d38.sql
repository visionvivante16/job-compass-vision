-- Remotive ingest runs
CREATE TABLE public.remotive_ingest_runs (
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

ALTER TABLE public.remotive_ingest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view remotive runs"
  ON public.remotive_ingest_runs FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role can insert remotive runs"
  ON public.remotive_ingest_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update remotive runs"
  ON public.remotive_ingest_runs FOR UPDATE
  USING (true);

-- Adzuna ingest runs
CREATE TABLE public.adzuna_ingest_runs (
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

ALTER TABLE public.adzuna_ingest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view adzuna runs"
  ON public.adzuna_ingest_runs FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role can insert adzuna runs"
  ON public.adzuna_ingest_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update adzuna runs"
  ON public.adzuna_ingest_runs FOR UPDATE
  USING (true);

CREATE INDEX remotive_ingest_runs_started_at_idx ON public.remotive_ingest_runs (started_at DESC);
CREATE INDEX adzuna_ingest_runs_started_at_idx ON public.adzuna_ingest_runs (started_at DESC);