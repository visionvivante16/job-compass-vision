CREATE OR REPLACE FUNCTION public.count_search_jobs(
  search_query text DEFAULT NULL::text,
  expanded_terms text[] DEFAULT NULL::text[],
  filter_tab text DEFAULT 'all'::text
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
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
      now() - interval '45 days' AS cutoff_date,
      date_trunc('day', now()) AS today_start,
      date_trunc('day', now() - interval '1 day') AS yesterday_start,
      date_trunc('day', now() - interval '7 days') AS week_ago
  ),
  flags AS (
    SELECT s.*,
      (s.clean_query IS NOT NULL) AS has_query,
      COALESCE(array_length(s.clean_expanded, 1), 0) > 0 AS has_expanded,
      CASE WHEN s.clean_query IS NOT NULL
        THEN websearch_to_tsquery('english', s.clean_query)
        ELSE NULL::tsquery
      END AS base_tsquery
    FROM search_scope s
  ),
  candidate_ids AS (
    -- No query: all jobs in 45-day window
    SELECT j.id FROM public.jobs j CROSS JOIN flags f
    WHERE NOT f.has_query AND NOT f.has_expanded
      AND j.is_published = true AND j.is_archived = false AND j.is_direct_apply = true
      AND j.deleted_at IS NULL AND j.posted_date >= f.cutoff_date
      AND j.external_apply_link NOT ILIKE '%linkedin.com%'
    UNION
    -- Full-text match on title/description/etc via search_vector
    SELECT j.id FROM public.jobs j CROSS JOIN flags f
    WHERE f.has_query AND j.is_published = true AND j.is_archived = false AND j.is_direct_apply = true
      AND j.deleted_at IS NULL AND j.posted_date >= f.cutoff_date
      AND j.external_apply_link NOT ILIKE '%linkedin.com%'
      AND j.search_vector @@ f.base_tsquery
    UNION
    -- Title substring match
    SELECT j.id FROM public.jobs j CROSS JOIN flags f
    WHERE f.has_query AND j.is_published = true AND j.is_archived = false AND j.is_direct_apply = true
      AND j.deleted_at IS NULL AND j.posted_date >= f.cutoff_date
      AND j.external_apply_link NOT ILIKE '%linkedin.com%'
      AND lower(j.title) LIKE '%' || f.normalized_query || '%'
    UNION
    -- Company substring match
    SELECT j.id FROM public.jobs j CROSS JOIN flags f
    WHERE f.has_query AND j.is_published = true AND j.is_archived = false AND j.is_direct_apply = true
      AND j.deleted_at IS NULL AND j.posted_date >= f.cutoff_date
      AND j.external_apply_link NOT ILIKE '%linkedin.com%'
      AND lower(j.company) LIKE '%' || f.normalized_query || '%'
    UNION
    -- Expanded terms title match
    SELECT j.id FROM public.jobs j CROSS JOIN flags f
    JOIN LATERAL unnest(f.clean_expanded) AS et(term) ON f.has_expanded
    WHERE j.is_published = true AND j.is_archived = false AND j.is_direct_apply = true
      AND j.deleted_at IS NULL AND j.posted_date >= f.cutoff_date
      AND j.external_apply_link NOT ILIKE '%linkedin.com%'
      AND lower(j.title) LIKE '%' || et.term || '%'
    UNION
    -- Expanded terms full-text match
    SELECT j.id FROM public.jobs j CROSS JOIN flags f
    JOIN LATERAL unnest(f.clean_expanded) AS et(term) ON f.has_expanded
    WHERE j.is_published = true AND j.is_archived = false AND j.is_direct_apply = true
      AND j.deleted_at IS NULL AND j.posted_date >= f.cutoff_date
      AND j.external_apply_link NOT ILIKE '%linkedin.com%'
      AND j.search_vector @@ plainto_tsquery('english', et.term)
  )
  SELECT COUNT(*)::bigint
  FROM public.jobs j
  JOIN candidate_ids c ON c.id = j.id
  CROSS JOIN flags f
  WHERE CASE COALESCE(filter_tab, 'all')
    WHEN 'today' THEN j.posted_date >= f.today_start
    WHEN 'yesterday' THEN j.posted_date >= f.yesterday_start AND j.posted_date < f.today_start
    WHEN 'week' THEN j.posted_date >= f.week_ago AND j.posted_date < f.yesterday_start
    ELSE true
  END;
$function$;