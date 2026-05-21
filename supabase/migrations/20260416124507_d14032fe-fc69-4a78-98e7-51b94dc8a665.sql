
DROP FUNCTION IF EXISTS public.suggest_job_titles(text, integer);

CREATE OR REPLACE FUNCTION public.suggest_job_titles(query_text text, max_results integer DEFAULT 10)
RETURNS TABLE(suggestion text, company_name text, match_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH params AS (
    SELECT lower(trim(query_text)) AS clean_query
  ),
  matched_jobs AS (
    SELECT j.title, j.company
    FROM public.jobs j
    CROSS JOIN params p
    WHERE p.clean_query IS NOT NULL
      AND p.clean_query <> ''
      AND j.is_published = true
      AND j.is_archived = false
      AND j.deleted_at IS NULL
      AND j.posted_date >= now() - interval '45 days'
      AND (
        lower(j.title) LIKE '%' || p.clean_query || '%'
        OR lower(j.company) LIKE '%' || p.clean_query || '%'
        OR lower(array_to_string(j.skills, ' ')) LIKE '%' || p.clean_query || '%'
      )
  ),
  grouped AS (
    SELECT
      mj.title AS suggestion,
      mj.company AS company_name,
      COUNT(*)::bigint AS match_count
    FROM matched_jobs mj
    CROSS JOIN params p
    GROUP BY mj.title, mj.company
  )
  SELECT
    g.suggestion,
    g.company_name,
    g.match_count
  FROM grouped g
  CROSS JOIN params p
  ORDER BY
    CASE WHEN lower(g.suggestion) LIKE p.clean_query || '%' THEN 0 ELSE 1 END,
    g.match_count DESC,
    g.suggestion
  LIMIT GREATEST(COALESCE(max_results, 10), 1);
$function$;
