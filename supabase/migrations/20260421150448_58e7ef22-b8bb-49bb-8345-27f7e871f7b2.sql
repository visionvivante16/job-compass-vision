CREATE OR REPLACE FUNCTION public.search_jobs(
  search_query text DEFAULT NULL::text,
  page_size integer DEFAULT 25,
  page_offset integer DEFAULT 0,
  filter_tab text DEFAULT 'all'::text,
  expanded_terms text[] DEFAULT NULL::text[]
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
  posted_date timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  is_archived boolean,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      now()-interval '45 days' AS cutoff_date,
      date_trunc('day',now()) AS today_start,
      date_trunc('day',now()-interval '1 day') AS yesterday_start,
      date_trunc('day',now()-interval '7 days') AS week_ago
  ),
  flags AS (
    SELECT s.*,
      (s.clean_query IS NOT NULL) AS has_query,
      COALESCE(array_length(s.clean_expanded,1),0)>0 AS has_expanded,
      (
        s.normalized_query LIKE '%data analyst%'
        OR EXISTS (
          SELECT 1
          FROM unnest(s.clean_expanded) AS et(term)
          WHERE et.term IN (
            'data analyst',
            'junior data analyst',
            'entry-level data analyst',
            'entry level data analyst',
            'data analytics',
            'analytics analyst',
            'business intelligence analyst',
            'bi analyst',
            'reporting analyst'
          )
        )
      ) AS is_data_analyst_search,
      CASE WHEN s.clean_query IS NOT NULL THEN websearch_to_tsquery('english',s.clean_query) ELSE NULL::tsquery END AS base_tsquery
    FROM search_scope s
  ),
  candidate_ids AS (
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    WHERE NOT f2.has_query AND NOT f2.has_expanded
      AND j2.is_published=true AND j2.is_archived=false AND j2.is_direct_apply=true AND j2.deleted_at IS NULL AND j2.posted_date>=f2.cutoff_date
    UNION
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    WHERE f2.has_query AND j2.is_published=true AND j2.is_archived=false AND j2.is_direct_apply=true AND j2.deleted_at IS NULL AND j2.posted_date>=f2.cutoff_date
      AND j2.search_vector@@f2.base_tsquery
    UNION
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    WHERE f2.has_query AND j2.is_published=true AND j2.is_archived=false AND j2.is_direct_apply=true AND j2.deleted_at IS NULL AND j2.posted_date>=f2.cutoff_date
      AND lower(j2.title) LIKE '%'||f2.normalized_query||'%'
    UNION
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    WHERE f2.has_query AND j2.is_published=true AND j2.is_archived=false AND j2.is_direct_apply=true AND j2.deleted_at IS NULL AND j2.posted_date>=f2.cutoff_date
      AND lower(j2.company) LIKE '%'||f2.normalized_query||'%'
    UNION
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    JOIN LATERAL unnest(f2.clean_expanded) AS et(term) ON f2.has_expanded
    WHERE j2.is_published=true AND j2.is_archived=false AND j2.is_direct_apply=true AND j2.deleted_at IS NULL AND j2.posted_date>=f2.cutoff_date
      AND j2.search_vector@@plainto_tsquery('english',et.term)
    UNION
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    JOIN LATERAL unnest(f2.clean_expanded) AS et(term) ON f2.has_expanded
    WHERE j2.is_published=true AND j2.is_archived=false AND j2.is_direct_apply=true AND j2.deleted_at IS NULL AND j2.posted_date>=f2.cutoff_date
      AND lower(j2.title) LIKE '%'||et.term||'%'
    UNION
    SELECT j2.id FROM public.jobs j2 CROSS JOIN flags f2
    WHERE f2.is_data_analyst_search AND j2.is_published=true AND j2.is_archived=false AND j2.is_direct_apply=true AND j2.deleted_at IS NULL AND j2.posted_date>=f2.cutoff_date
      AND lower(j2.title) ~ '(data[ -]?analytics|analytics analyst|data analyst|business data analyst|business intelligence analyst|bi analyst|reporting analyst)'
  ),
  ranked_jobs AS (
    SELECT j.id, j.title, j.company, j.company_logo, j.location, j.description, j.skills,
      j.external_apply_link, j.is_published, j.is_reviewing, j.salary_range, j.employment_type,
      j.experience_years, j.posted_date, j.created_at, j.updated_at, j.is_archived,
      CASE
        WHEN f.has_query AND lower(btrim(j.title))=f.normalized_query THEN 1
        WHEN f.is_data_analyst_search AND lower(j.title) ~ '\m(junior|jr\.?|entry[- ]?level|entry level)\M.*\mdata\s+analyst\M' THEN 2
        WHEN f.has_query AND lower(j.title) LIKE f.normalized_query||'%' THEN 3
        WHEN f.has_query AND lower(j.title) LIKE '%'||f.normalized_query||'%' THEN 4
        WHEN f.is_data_analyst_search AND lower(j.title) ~ '(data[ -]?analytics|analytics analyst|business data analyst|business intelligence analyst|bi analyst|reporting analyst)' THEN 5
        WHEN f.has_query AND j.search_vector@@f.base_tsquery THEN 6
        WHEN f.has_expanded AND EXISTS(SELECT 1 FROM unnest(f.clean_expanded) AS et(term) WHERE lower(j.title) LIKE '%'||et.term||'%') THEN 7
        WHEN f.has_expanded AND EXISTS(SELECT 1 FROM unnest(f.clean_expanded) AS et(term) WHERE j.search_vector@@plainto_tsquery('english',et.term)) THEN 8
        WHEN f.has_query AND lower(j.company) LIKE '%'||f.normalized_query||'%' THEN 9
        ELSE 10
      END AS relevance_bucket,
      (CASE
        WHEN f.has_query AND lower(btrim(j.title))=f.normalized_query THEN 100.0
        WHEN f.is_data_analyst_search AND lower(j.title) ~ '\m(junior|jr\.?|entry[- ]?level|entry level)\M.*\mdata\s+analyst\M' THEN 90.0
        WHEN f.has_query AND lower(j.title) LIKE f.normalized_query||'%' THEN 82.0
        WHEN f.has_query AND lower(j.title) LIKE '%'||f.normalized_query||'%' THEN 75.0
        WHEN f.is_data_analyst_search AND lower(j.title) ~ '(data[ -]?analytics|analytics analyst|business data analyst|business intelligence analyst|bi analyst|reporting analyst)' THEN 68.0
        WHEN f.has_query AND j.search_vector@@f.base_tsquery THEN (ts_rank_cd(j.search_vector,f.base_tsquery)*10.0)+45.0
        WHEN f.has_expanded AND EXISTS(SELECT 1 FROM unnest(f.clean_expanded) AS et(term) WHERE lower(j.title) LIKE '%'||et.term||'%') THEN 35.0
        WHEN f.has_expanded AND EXISTS(SELECT 1 FROM unnest(f.clean_expanded) AS et(term) WHERE j.search_vector@@plainto_tsquery('english',et.term)) THEN 15.0
        WHEN f.has_query AND lower(j.company) LIKE '%'||f.normalized_query||'%' THEN 10.0
        ELSE 0.0
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
  )
  SELECT r.id, r.title, r.company, r.company_logo, r.location, r.description, r.skills,
    r.external_apply_link, r.is_published, r.is_reviewing, r.salary_range, r.employment_type,
    r.experience_years, r.posted_date, r.created_at, r.updated_at, r.is_archived, r.rank
  FROM ranked_jobs r
  ORDER BY r.relevance_bucket ASC, r.posted_date DESC
  LIMIT GREATEST(COALESCE(page_size,25),1)
  OFFSET GREATEST(COALESCE(page_offset,0),0);
END;
$function$;