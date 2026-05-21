-- Add search_vector column for full-text search with weighted fields
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add is_archived column for archiving old jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Create function to update search vector with weighted fields
CREATE OR REPLACE FUNCTION public.jobs_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.skills, ' '), '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.company, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS jobs_search_vector_trigger ON public.jobs;
CREATE TRIGGER jobs_search_vector_trigger
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.jobs_search_vector_update();

-- Update existing rows to populate search_vector
UPDATE public.jobs SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(skills, ' '), '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(company, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C');

-- Create GIN index for full-text search (extremely fast lookups)
CREATE INDEX IF NOT EXISTS idx_jobs_search_vector ON public.jobs USING GIN(search_vector);

-- Jobs table indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_is_published ON public.jobs(is_published);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON public.jobs(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON public.jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_title ON public.jobs(title);
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON public.jobs(employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_is_archived ON public.jobs(is_archived);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_jobs_published_posted ON public.jobs(is_published, is_archived, posted_date DESC);

-- Applications table indexes
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_job ON public.applications(user_id, job_id);

-- Saved jobs table indexes
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_job ON public.saved_jobs(user_id, job_id);

-- Create function to search jobs with full-text search
CREATE OR REPLACE FUNCTION public.search_jobs(
  search_query text,
  page_size int DEFAULT 25,
  page_offset int DEFAULT 0,
  filter_tab text DEFAULT 'all'
)
RETURNS TABLE(
  id uuid,
  title text,
  company text,
  company_logo text,
  location text,
  description text,
  skills text[],
  external_apply_link text,
  is_published boolean,
  is_reviewing boolean,
  salary_range text,
  employment_type text,
  experience_years text,
  posted_date timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  is_archived boolean,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_start timestamptz := date_trunc('day', now());
  yesterday_start timestamptz := date_trunc('day', now() - interval '1 day');
  week_ago timestamptz := date_trunc('day', now() - interval '7 days');
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.company,
    j.company_logo,
    j.location,
    j.description,
    j.skills,
    j.external_apply_link,
    j.is_published,
    j.is_reviewing,
    j.salary_range,
    j.employment_type,
    j.experience_years,
    j.posted_date,
    j.created_at,
    j.updated_at,
    j.is_archived,
    CASE 
      WHEN search_query IS NOT NULL AND search_query != '' 
      THEN ts_rank(j.search_vector, websearch_to_tsquery('english', search_query))
      ELSE 0
    END as rank
  FROM public.jobs j
  WHERE 
    j.is_published = true 
    AND j.is_archived = false
    AND (
      search_query IS NULL 
      OR search_query = '' 
      OR j.search_vector @@ websearch_to_tsquery('english', search_query)
    )
    AND (
      CASE filter_tab
        WHEN 'today' THEN j.posted_date >= today_start
        WHEN 'yesterday' THEN j.posted_date >= yesterday_start AND j.posted_date < today_start
        WHEN 'week' THEN j.posted_date >= week_ago AND j.posted_date < yesterday_start
        ELSE true
      END
    )
  ORDER BY 
    CASE 
      WHEN search_query IS NOT NULL AND search_query != '' 
      THEN ts_rank(j.search_vector, websearch_to_tsquery('english', search_query))
      ELSE 0
    END DESC,
    j.posted_date DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Create function to get job counts by tab
CREATE OR REPLACE FUNCTION public.get_job_counts(search_query text DEFAULT NULL)
RETURNS TABLE(
  total_count bigint,
  today_count bigint,
  yesterday_count bigint,
  week_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_start timestamptz := date_trunc('day', now());
  yesterday_start timestamptz := date_trunc('day', now() - interval '1 day');
  week_ago timestamptz := date_trunc('day', now() - interval '7 days');
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE true) as total_count,
    COUNT(*) FILTER (WHERE j.posted_date >= today_start) as today_count,
    COUNT(*) FILTER (WHERE j.posted_date >= yesterday_start AND j.posted_date < today_start) as yesterday_count,
    COUNT(*) FILTER (WHERE j.posted_date >= week_ago AND j.posted_date < yesterday_start) as week_count
  FROM public.jobs j
  WHERE 
    j.is_published = true 
    AND j.is_archived = false
    AND (
      search_query IS NULL 
      OR search_query = '' 
      OR j.search_vector @@ websearch_to_tsquery('english', search_query)
    );
END;
$$;

-- Create function to auto-archive old jobs (can be called by a cron job)
CREATE OR REPLACE FUNCTION public.archive_old_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count integer;
BEGIN
  UPDATE public.jobs
  SET is_archived = true
  WHERE is_archived = false
    AND posted_date < now() - interval '45 days';
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;