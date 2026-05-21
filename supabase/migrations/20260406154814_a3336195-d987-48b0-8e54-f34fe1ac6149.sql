CREATE OR REPLACE FUNCTION public.search_jobs(
  search_query text DEFAULT NULL,
  page_size integer DEFAULT 25,
  page_offset integer DEFAULT 0,
  filter_tab text DEFAULT 'all',
  expanded_terms text[] DEFAULT NULL
)
RETURNS TABLE(
  id uuid, title text, company text, company_logo text, location text,
  description text, skills text[], external_apply_link text,
  is_published boolean, is_reviewing boolean, salary_range text,
  employment_type text, experience_years text, posted_date timestamptz,
  created_at timestamptz, updated_at timestamptz, is_archived boolean,
  rank real
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH search_scope AS (
    SELECT
      NULLIF(trim(search_query),'') AS clean_query,
      lower(NULLIF(trim(search_query),'')) AS normalized_query,
      COALESCE(ARRAY(
        SELECT DISTINCT lower(trim(term))
        FROM unnest(COALESCE(expanded_terms, ARRAY[]::text[])) AS term
        WHERE term IS NOT NULL AND btrim(term)<>'' AND length(btrim(term))>1
      ), ARRAY[]::text[]) AS clean_expanded,
      now()-interval '15 days' AS cutoff_date,
      date_trunc('day',now()) AS today_start,
      date_trunc('day',now()-interval '1 day') AS yesterday_start,
      date_trunc('day',now()-interval '7 days') AS week_ago
  ),
  flags AS (
    SELECT s.*,
      (s.clean_query IS NOT NULL) AS has_query,
      COALESCE(array_length(s.clean_expanded,1),0)>0 AS has_expanded,
      CASE WHEN s.clean_query IS NOT NULL THEN websearch_to_tsquery('english',s.clean_query) ELSE NULL::tsquery END AS base_tsquery
    FROM search_scope s
  ),
  candidate_ids AS (
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    WHERE NOT f2.has_query AND NOT f2.has_expanded
      AND j2.is_published=true AND j2.is_archived=false AND j2.posted_date>=f2.cutoff_date
    UNION
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    WHERE f2.has_query AND j2.is_published=true AND j2.is_archived=false AND j2.posted_date>=f2.cutoff_date
      AND j2.search_vector@@f2.base_tsquery
    UNION
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    WHERE f2.has_query AND j2.is_published=true AND j2.is_archived=false AND j2.posted_date>=f2.cutoff_date
      AND lower(j2.title) LIKE '%'||f2.normalized_query||'%'
    UNION
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    WHERE f2.has_query AND j2.is_published=true AND j2.is_archived=false AND j2.posted_date>=f2.cutoff_date
      AND lower(j2.company) LIKE '%'||f2.normalized_query||'%'
    UNION
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    JOIN LATERAL unnest(f2.clean_expanded) AS et(term) ON f2.has_expanded
    WHERE j2.is_published=true AND j2.is_archived=false AND j2.posted_date>=f2.cutoff_date
      AND j2.search_vector@@plainto_tsquery('english',et.term)
    UNION
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    JOIN LATERAL unnest(f2.clean_expanded) AS et(term) ON f2.has_expanded
    WHERE j2.is_published=true AND j2.is_archived=false AND j2.posted_date>=f2.cutoff_date
      AND lower(j2.title) LIKE '%'||et.term||'%'
  )
  SELECT j.id, j.title, j.company, j.company_logo, j.location, j.description, j.skills,
    j.external_apply_link, j.is_published, j.is_reviewing, j.salary_range, j.employment_type,
    j.experience_years, j.posted_date, j.created_at, j.updated_at, j.is_archived,
    (CASE
      WHEN f.has_query AND lower(j.title)=f.normalized_query THEN 100.0
      WHEN f.has_query AND lower(j.title) LIKE f.normalized_query||'%' THEN 80.0
      WHEN f.has_query AND lower(j.title) LIKE '%'||f.normalized_query||'%' THEN 65.0
      WHEN f.has_query AND j.search_vector@@f.base_tsquery THEN (ts_rank_cd(j.search_vector,f.base_tsquery)*10.0)+40.0
      WHEN f.has_query AND lower(j.company) LIKE '%'||f.normalized_query||'%' THEN 20.0
      WHEN f.has_expanded AND EXISTS(SELECT 1 FROM unnest(f.clean_expanded) AS et(term) WHERE lower(j.title) LIKE '%'||et.term||'%') THEN 30.0
      WHEN f.has_expanded AND EXISTS(SELECT 1 FROM unnest(f.clean_expanded) AS et(term) WHERE j.search_vector@@plainto_tsquery('english',et.term)) THEN 10.0
      WHEN NOT f.has_query AND NOT f.has_expanded THEN 0.0
      ELSE -1.0
    END)::real AS rank
  FROM public.jobs j
  JOIN candidate_ids c ON c.id=j.id
  CROSS JOIN flags f
  WHERE CASE COALESCE(filter_tab,'all')
    WHEN 'today' THEN j.posted_date>=f.today_start
    WHEN 'yesterday' THEN j.posted_date>=f.yesterday_start AND j.posted_date<f.today_start
    WHEN 'week' THEN j.posted_date>=f.week_ago AND j.posted_date<f.yesterday_start
    ELSE true
  END
  ORDER BY
    CASE
      WHEN f.has_query AND lower(j.title)=f.normalized_query THEN 1
      WHEN f.has_query AND lower(j.title) LIKE f.normalized_query||'%' THEN 1
      WHEN f.has_query AND lower(j.title) LIKE '%'||f.normalized_query||'%' THEN 1
      WHEN f.has_query AND j.search_vector@@f.base_tsquery THEN 2
      WHEN f.has_expanded AND EXISTS(SELECT 1 FROM unnest(f.clean_expanded) AS et(term) WHERE lower(j.title) LIKE '%'||et.term||'%') THEN 3
      WHEN f.has_expanded AND EXISTS(SELECT 1 FROM unnest(f.clean_expanded) AS et(term) WHERE j.search_vector@@plainto_tsquery('english',et.term)) THEN 4
      ELSE 5
    END,
    j.posted_date DESC
  LIMIT GREATEST(COALESCE(page_size,25),1)
  OFFSET GREATEST(COALESCE(page_offset,0),0);
END;
$$;