
-- Update search_jobs function: change 15 days to 10 days
CREATE OR REPLACE FUNCTION public.search_jobs(search_query text DEFAULT NULL::text, page_size integer DEFAULT 25, page_offset integer DEFAULT 0, filter_tab text DEFAULT 'all'::text, expanded_terms text[] DEFAULT NULL::text[])
 RETURNS TABLE(id uuid, title text, company text, company_logo text, location text, description text, skills text[], external_apply_link text, is_published boolean, is_reviewing boolean, salary_range text, employment_type text, experience_years text, posted_date timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, is_archived boolean, rank real)
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
      now()-interval '10 days' AS cutoff_date,
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
$function$;

-- Update count_search_jobs function: change 15 days to 10 days
CREATE OR REPLACE FUNCTION public.count_search_jobs(search_query text DEFAULT NULL::text, expanded_terms text[] DEFAULT NULL::text[])
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH search_scope AS (
    SELECT
      NULLIF(trim(search_query), '') AS clean_query,
      lower(NULLIF(trim(search_query), '')) AS normalized_query,
      COALESCE(
        ARRAY(
          SELECT DISTINCT lower(trim(term))
          FROM unnest(COALESCE(expanded_terms, ARRAY[]::text[])) AS term
          WHERE term IS NOT NULL AND btrim(term) <> '' AND length(btrim(term)) > 1
        ),
        ARRAY[]::text[]
      ) AS clean_expanded,
      now() - interval '10 days' AS cutoff_date
  ),
  flags AS (
    SELECT
      s.*,
      (s.clean_query IS NOT NULL) AS has_query,
      COALESCE(array_length(s.clean_expanded, 1), 0) > 0 AS has_expanded,
      CASE
        WHEN s.clean_query IS NOT NULL THEN websearch_to_tsquery('english', s.clean_query)
        ELSE NULL::tsquery
      END AS base_tsquery
    FROM search_scope s
  ),
  candidate_ids AS (
    SELECT j.id
    FROM public.jobs j CROSS JOIN flags f
    WHERE NOT f.has_query AND NOT f.has_expanded
      AND j.is_published = true AND j.is_archived = false
      AND j.posted_date >= f.cutoff_date

    UNION

    SELECT j.id
    FROM public.jobs j CROSS JOIN flags f
    WHERE f.has_query
      AND j.is_published = true AND j.is_archived = false
      AND j.posted_date >= f.cutoff_date
      AND j.search_vector @@ f.base_tsquery

    UNION

    SELECT j.id
    FROM public.jobs j CROSS JOIN flags f
    WHERE f.has_query
      AND j.is_published = true AND j.is_archived = false
      AND j.posted_date >= f.cutoff_date
      AND lower(j.title) LIKE '%' || f.normalized_query || '%'

    UNION

    SELECT j.id
    FROM public.jobs j CROSS JOIN flags f
    WHERE f.has_query
      AND j.is_published = true AND j.is_archived = false
      AND j.posted_date >= f.cutoff_date
      AND lower(j.company) LIKE '%' || f.normalized_query || '%'

    UNION

    SELECT j.id
    FROM public.jobs j CROSS JOIN flags f
    JOIN LATERAL unnest(f.clean_expanded) AS et(term) ON f.has_expanded
    WHERE j.is_published = true AND j.is_archived = false
      AND j.posted_date >= f.cutoff_date
      AND j.search_vector @@ plainto_tsquery('english', et.term)

    UNION

    SELECT j.id
    FROM public.jobs j CROSS JOIN flags f
    JOIN LATERAL unnest(f.clean_expanded) AS et(term) ON f.has_expanded
    WHERE j.is_published = true AND j.is_archived = false
      AND j.posted_date >= f.cutoff_date
      AND lower(j.title) LIKE '%' || et.term || '%'
  )
  SELECT COUNT(*)::bigint FROM candidate_ids;
$function$;

-- Update get_job_counts function: change 15 days to 10 days
CREATE OR REPLACE FUNCTION public.get_job_counts(search_query text DEFAULT NULL::text)
 RETURNS TABLE(total_count bigint, today_count bigint, yesterday_count bigint, week_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  today_start timestamptz := date_trunc('day', now());
  yesterday_start timestamptz := date_trunc('day', now() - interval '1 day');
  week_ago timestamptz := date_trunc('day', now() - interval '7 days');
  cutoff_date timestamptz := now() - interval '10 days';
  clean_query text;
BEGIN
  clean_query := trim(search_query);
  
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
    AND j.posted_date >= cutoff_date
    AND (
      clean_query IS NULL 
      OR clean_query = '' 
      OR j.search_vector @@ websearch_to_tsquery('english', clean_query)
      OR j.company ILIKE '%' || clean_query || '%'
      OR j.title ILIKE '%' || clean_query || '%'
      OR j.location ILIKE '%' || clean_query || '%'
    );
END;
$function$;

-- Update suggest_job_titles function: change 15 days to 10 days
CREATE OR REPLACE FUNCTION public.suggest_job_titles(query_text text, max_results integer DEFAULT 8)
 RETURNS TABLE(suggestion text, match_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH params AS (
    SELECT lower(trim(query_text)) AS clean_query
  ),
  matched_titles AS (
    SELECT j.title
    FROM public.jobs j
    CROSS JOIN params p
    WHERE p.clean_query IS NOT NULL
      AND p.clean_query <> ''
      AND j.is_published = true
      AND j.is_archived = false
      AND j.posted_date >= now() - interval '10 days'
      AND lower(j.title) LIKE '%' || p.clean_query || '%'
  ),
  normalized AS (
    SELECT
      CASE
        WHEN lower(mt.title) ~ '(software|full.?stack|backend|frontend|web) (engineer|developer)' THEN 'Software Engineer'
        WHEN lower(mt.title) ~ 'senior.*(software|full.?stack|backend|frontend)' THEN 'Senior Software Engineer'
        WHEN lower(mt.title) ~ 'data analyst' THEN 'Data Analyst'
        WHEN lower(mt.title) ~ 'data engineer' THEN 'Data Engineer'
        WHEN lower(mt.title) ~ '(data scientist|machine learning|ml engineer)' THEN 'Data Scientist'
        WHEN lower(mt.title) ~ 'ai engineer' THEN 'AI Engineer'
        WHEN lower(mt.title) ~ '(devops|sre|site reliability|platform engineer)' THEN 'DevOps Engineer'
        WHEN lower(mt.title) ~ '(product manager|program manager)' THEN 'Product Manager'
        WHEN lower(mt.title) ~ 'project manager' THEN 'Project Manager'
        WHEN lower(mt.title) ~ '(ui|ux|product design)' THEN 'UI/UX Designer'
        WHEN lower(mt.title) ~ '(qa|quality|test engineer|sdet)' THEN 'QA Engineer'
        WHEN lower(mt.title) ~ '(cloud|aws|azure|gcp).*(engineer|architect)' THEN 'Cloud Engineer'
        WHEN lower(mt.title) ~ '(security|cyber|infosec)' THEN 'Security Engineer'
        WHEN lower(mt.title) ~ '(mobile|ios|android|react native|flutter)' THEN 'Mobile Developer'
        WHEN lower(mt.title) ~ '(marketing|growth|seo)' THEN 'Marketing Manager'
        WHEN lower(mt.title) ~ '(business analyst|bi analyst|analytics)' THEN 'Business Analyst'
        WHEN lower(mt.title) ~ 'solutions architect' THEN 'Solutions Architect'
        WHEN lower(mt.title) ~ 'technical lead' THEN 'Technical Lead'
        WHEN lower(mt.title) ~ 'engineering manager' THEN 'Engineering Manager'
        WHEN lower(mt.title) ~ '(network|systems? admin)' THEN 'Network Administrator'
        WHEN lower(mt.title) ~ '(database|dba)' THEN 'Database Administrator'
        WHEN lower(mt.title) ~ 'scrum master' THEN 'Scrum Master'
        WHEN lower(mt.title) ~ 'blockchain' THEN 'Blockchain Developer'
        ELSE mt.title
      END AS normalized_title
    FROM matched_titles mt
  ),
  filtered AS (
    SELECT n.normalized_title
    FROM normalized n
    CROSS JOIN params p
    WHERE lower(n.normalized_title) LIKE '%' || p.clean_query || '%'
  )
  SELECT
    f.normalized_title AS suggestion,
    COUNT(*)::bigint AS match_count
  FROM filtered f
  CROSS JOIN params p
  GROUP BY f.normalized_title, p.clean_query
  ORDER BY
    CASE WHEN lower(f.normalized_title) LIKE p.clean_query || '%' THEN 0 ELSE 1 END,
    COUNT(*) DESC,
    f.normalized_title
  LIMIT GREATEST(COALESCE(max_results, 8), 1);
$function$;
