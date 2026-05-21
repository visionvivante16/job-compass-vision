-- Table for admin-editable JSearch query seeds
CREATE TABLE public.jsearch_query_seeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'us',
  date_posted TEXT NOT NULL DEFAULT 'week',
  employment_types TEXT NOT NULL DEFAULT 'FULLTIME,INTERN',
  job_requirements TEXT DEFAULT 'under_3_years_experience,no_experience,no_degree',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_imported_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jsearch_query_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view seeds"
  ON public.jsearch_query_seeds FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert seeds"
  ON public.jsearch_query_seeds FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update seeds"
  ON public.jsearch_query_seeds FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete seeds"
  ON public.jsearch_query_seeds FOR DELETE
  USING (public.is_admin());

CREATE TRIGGER trg_jsearch_seeds_updated
  BEFORE UPDATE ON public.jsearch_query_seeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log for ingest runs
CREATE TABLE public.jsearch_ingest_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  triggered_by UUID,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  total_fetched INTEGER NOT NULL DEFAULT 0,
  total_imported INTEGER NOT NULL DEFAULT 0,
  total_skipped INTEGER NOT NULL DEFAULT 0,
  total_filtered INTEGER NOT NULL DEFAULT 0,
  duplicates_removed INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  details JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.jsearch_ingest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view runs"
  ON public.jsearch_ingest_runs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role can insert runs"
  ON public.jsearch_ingest_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update runs"
  ON public.jsearch_ingest_runs FOR UPDATE
  USING (true);

CREATE INDEX idx_jsearch_runs_started ON public.jsearch_ingest_runs(started_at DESC);

-- Seed initial 15 queries (sponsorship-heavy tech + business mix)
INSERT INTO public.jsearch_query_seeds (query, sort_order) VALUES
  ('software engineer entry level h1b sponsorship usa', 1),
  ('data analyst new grad visa sponsorship usa', 2),
  ('data scientist entry level h1b usa', 3),
  ('machine learning engineer new grad sponsorship usa', 4),
  ('frontend developer entry level h1b usa', 5),
  ('backend developer new grad sponsorship usa', 6),
  ('full stack developer entry level visa sponsorship usa', 7),
  ('devops engineer entry level h1b usa', 8),
  ('cloud engineer new grad sponsorship usa', 9),
  ('qa engineer entry level visa sponsorship usa', 10),
  ('product manager entry level h1b usa', 11),
  ('business analyst new grad sponsorship usa', 12),
  ('marketing analyst entry level usa', 13),
  ('sales development representative entry level usa', 14),
  ('ux designer entry level visa sponsorship usa', 15);