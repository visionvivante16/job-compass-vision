-- ATS Companies table for auto-discovery system
CREATE TABLE public.ats_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  company_name text NOT NULL,
  ats_platform text NOT NULL CHECK (ats_platform IN ('greenhouse', 'lever', 'ashby')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  last_checked timestamptz,
  jobs_found_last_run integer NOT NULL DEFAULT 0,
  auto_discovered boolean NOT NULL DEFAULT false,
  date_added timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ats_platform, slug)
);

CREATE INDEX idx_ats_companies_status ON public.ats_companies (status);
CREATE INDEX idx_ats_companies_platform ON public.ats_companies (ats_platform);
CREATE INDEX idx_ats_companies_date_added ON public.ats_companies (date_added DESC);

ALTER TABLE public.ats_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ats companies"
  ON public.ats_companies FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert ats companies"
  ON public.ats_companies FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update ats companies"
  ON public.ats_companies FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete ats companies"
  ON public.ats_companies FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Service role can manage ats companies"
  ON public.ats_companies FOR ALL
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_ats_companies_updated_at
  BEFORE UPDATE ON public.ats_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ATS Discovery Runs (audit log for weekly discovery)
CREATE TABLE public.ats_discovery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL DEFAULT 'manual',
  triggered_by uuid,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  total_candidates integer NOT NULL DEFAULT 0,
  total_validated integer NOT NULL DEFAULT 0,
  total_added integer NOT NULL DEFAULT 0,
  total_activated integer NOT NULL DEFAULT 0,
  total_deactivated integer NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  errors jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE public.ats_discovery_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view discovery runs"
  ON public.ats_discovery_runs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role can insert discovery runs"
  ON public.ats_discovery_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update discovery runs"
  ON public.ats_discovery_runs FOR UPDATE
  USING (true);

-- ATS Ingest Runs (audit log for daily ATS ingest)
CREATE TABLE public.ats_ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL DEFAULT 'manual',
  triggered_by uuid,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  companies_processed integer NOT NULL DEFAULT 0,
  total_fetched integer NOT NULL DEFAULT 0,
  total_filtered integer NOT NULL DEFAULT 0,
  total_imported integer NOT NULL DEFAULT 0,
  total_skipped integer NOT NULL DEFAULT 0,
  duplicates_removed integer NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  errors jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE public.ats_ingest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ats ingest runs"
  ON public.ats_ingest_runs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role can insert ats ingest runs"
  ON public.ats_ingest_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update ats ingest runs"
  ON public.ats_ingest_runs FOR UPDATE
  USING (true);