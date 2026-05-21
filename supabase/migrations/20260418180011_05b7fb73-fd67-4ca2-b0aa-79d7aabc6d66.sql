
-- Muse query seeds (categories + levels + locations to fetch)
CREATE TABLE public.muse_query_seeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Entry Level',
  location TEXT NOT NULL DEFAULT 'Flexible / Remote',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_imported_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.muse_query_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view muse seeds" ON public.muse_query_seeds
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert muse seeds" ON public.muse_query_seeds
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update muse seeds" ON public.muse_query_seeds
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete muse seeds" ON public.muse_query_seeds
  FOR DELETE USING (is_admin());

CREATE TRIGGER update_muse_seeds_updated_at
  BEFORE UPDATE ON public.muse_query_seeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Muse ingest runs log
CREATE TABLE public.muse_ingest_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  triggered_by UUID,
  total_fetched INTEGER NOT NULL DEFAULT 0,
  total_imported INTEGER NOT NULL DEFAULT 0,
  total_skipped INTEGER NOT NULL DEFAULT 0,
  total_filtered INTEGER NOT NULL DEFAULT 0,
  duplicates_removed INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  errors JSONB DEFAULT '[]'::jsonb,
  details JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.muse_ingest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view muse runs" ON public.muse_ingest_runs
  FOR SELECT USING (is_admin());
CREATE POLICY "Service role can insert muse runs" ON public.muse_ingest_runs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update muse runs" ON public.muse_ingest_runs
  FOR UPDATE USING (true);

-- Seed initial US-tech queries
INSERT INTO public.muse_query_seeds (category, level, location, sort_order) VALUES
  ('Software Engineering', 'Entry Level', 'Flexible / Remote', 1),
  ('Software Engineering', 'Internship', 'Flexible / Remote', 2),
  ('Data Science', 'Entry Level', 'Flexible / Remote', 3),
  ('Data Science', 'Internship', 'Flexible / Remote', 4),
  ('Design and UX', 'Entry Level', 'Flexible / Remote', 5),
  ('Product', 'Entry Level', 'Flexible / Remote', 6),
  ('Marketing', 'Entry Level', 'Flexible / Remote', 7),
  ('Software Engineering', 'Entry Level', 'New York, NY', 8),
  ('Software Engineering', 'Entry Level', 'San Francisco, CA', 9),
  ('Data Science', 'Entry Level', 'New York, NY', 10);
