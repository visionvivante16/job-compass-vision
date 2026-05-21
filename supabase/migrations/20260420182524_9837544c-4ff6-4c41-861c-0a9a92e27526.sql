ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS description_enriched boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description_source text NOT NULL DEFAULT 'original';

CREATE INDEX IF NOT EXISTS idx_jobs_needs_enrichment
  ON public.jobs (id)
  WHERE description_enriched = false AND char_length(description) < 200;

COMMENT ON COLUMN public.jobs.description_enriched IS 'true once we attempted to scrape and got a usable description, OR original was already long enough';
COMMENT ON COLUMN public.jobs.description_source IS 'where the current description came from: original | jsearch | scraped | csv | firecrawl';