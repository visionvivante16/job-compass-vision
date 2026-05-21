
CREATE OR REPLACE FUNCTION public.search_jobs(
  search_query text DEFAULT NULL::text,
  page_size integer DEFAULT 25,
  page_offset integer DEFAULT 0,
  filter_tab text DEFAULT 'all'::text,
  expanded_terms text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
  id uuid, title text, company text, company_logo text, location text,
  description text, skills text[], external_apply_link text,
  is_published boolean, is_reviewing boolean, salary_range text,
  employment_type text, experience_years text,
  posted_date timestamp with time zone, created_at timestamp with time zone,
  updated_at timestamp with time zone, is_archived boolean, rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today_start timestamptz := date_trunc('day', now());
  yesterday_start timestamptz := date_trunc('day', now() - interval '1 day');
  week_ago timestamptz := date_trunc('day', now() - interval '7 days');
  clean_query text;
  has_query boolean;
  has_expanded boolean;
BEGIN
  clean_query := trim(search_query);
  has_query := clean_query IS NOT NULL AND clean_query != '';
  has_expanded := expanded_terms IS NOT NULL AND array_length(expanded_terms, 1) > 0;

  RETURN QUERY
  SELECT
    j.id, j.title, j.company, j.company_logo, j.location, j.description,
    j.skills, j.external_apply_link, j.is_published, j.is_reviewing,
    j.salary_range, j.employment_type, j.experience_years,
    j.posted_date, j.created_at, j.updated_at, j.is_archived,
    (CASE
      WHEN has_query AND j.title ILIKE '%' || clean_query || '%'
      THEN 2.0::real
      WHEN has_query AND j.search_vector @@ websearch_to_tsquery('english', clean_query)
      THEN ts_rank(j.search_vector, websearch_to_tsquery('english', clean_query))::real + 1.0::real
      WHEN has_query AND j.company ILIKE '%' || clean_query || '%'
      THEN 0.8::real
      WHEN has_expanded AND EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et WHERE j.title ILIKE '%' || et || '%'
      )
      THEN 0.4::real
      WHEN has_expanded AND EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et
        WHERE EXISTS (SELECT 1 FROM unnest(j.skills) sk WHERE sk ILIKE '%' || et || '%')
      )
      THEN 0.2::real
      WHEN NOT has_query AND NOT has_expanded THEN 0::real
      ELSE -1::real
    END) as rank
  FROM public.jobs j
  WHERE
    j.is_published = true
    AND j.is_archived = false
    AND (
      (NOT has_query AND NOT has_expanded)
      OR (has_query AND (
        j.search_vector @@ websearch_to_tsquery('english', clean_query)
        OR j.company ILIKE '%' || clean_query || '%'
        OR j.title ILIKE '%' || clean_query || '%'
      ))
      OR (has_expanded AND (
        EXISTS (SELECT 1 FROM unnest(expanded_terms) et WHERE j.title ILIKE '%' || et || '%')
        OR EXISTS (SELECT 1 FROM unnest(expanded_terms) et WHERE EXISTS (SELECT 1 FROM unnest(j.skills) sk WHERE sk ILIKE '%' || et || '%'))
      ))
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
    -- Source priority: Greenhouse first, Dice/Lensa last
    CASE
      WHEN lower(j.external_apply_link) LIKE '%greenhouse.io%' OR lower(j.external_apply_link) LIKE '%greenhouse.com%' THEN 0
      WHEN lower(j.external_apply_link) LIKE '%lever.co%' THEN 1
      WHEN lower(j.external_apply_link) LIKE '%workday%' OR lower(j.external_apply_link) LIKE '%icims%' OR lower(j.external_apply_link) LIKE '%taleo%' OR lower(j.external_apply_link) LIKE '%smartrecruiters%' OR lower(j.external_apply_link) LIKE '%jobvite%' THEN 2
      WHEN lower(j.external_apply_link) NOT LIKE '%dice.com%' AND lower(j.external_apply_link) NOT LIKE '%lensa.com%' AND lower(j.external_apply_link) NOT LIKE '%lensa.%' THEN 3
      ELSE 9
    END,
    rank DESC,
    j.posted_date DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;
