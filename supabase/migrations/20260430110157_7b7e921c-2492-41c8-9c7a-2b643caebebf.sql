-- Tiered ATS ingest: add tier + tracking columns to ats_companies
ALTER TABLE public.ats_companies
  ADD COLUMN IF NOT EXISTS tier integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS jobs_last_run integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jobs_last_7days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_empty_runs integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ingested_via text NOT NULL DEFAULT 'ats_polling';

ALTER TABLE public.ats_companies
  ADD CONSTRAINT ats_companies_tier_check CHECK (tier IN (1, 2, 3));

CREATE INDEX IF NOT EXISTS idx_ats_companies_tier_status
  ON public.ats_companies (tier, status);

-- Tag every job with the source pipeline so we can analyze ingestion mix
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS ingested_via text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS ats_company_slug text;

CREATE INDEX IF NOT EXISTS idx_jobs_ingested_via ON public.jobs (ingested_via);
