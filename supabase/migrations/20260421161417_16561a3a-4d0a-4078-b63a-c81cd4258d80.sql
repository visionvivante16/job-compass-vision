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
      now() - interval '45 days' AS cutoff_date
  ),
  flags AS (
    SELECT
      s.*,
      (s.clean_query IS NOT NULL) AS has_query,
      COALESCE(array_length(s.clean_expanded, 1), 0) > 0 AS has_expanded
    FROM search_scope s
  ),
  candidate_ids AS (
    -- No query: count all active jobs
    SELECT j.id FROM public.jobs j CROSS JOIN flags f
    WHERE NOT f.has_query AND NOT f.has_expanded
      AND j.is_published = true AND j.is_archived = false AND j.is_direct_apply = true
      AND j.deleted_at IS NULL AND j.posted_date >= f.cutoff_date
    UNION
    -- Title contains the raw query (covers exact / startswith / contains)
    SELECT j.id FROM public.jobs j CROSS JOIN flags f
    WHERE f.has_query AND j.is_published = true AND j.is_archived = false AND j.is_direct_apply = true
      AND j.deleted_at IS NULL AND j.posted_date >= f.cutoff_date
      AND lower(j.title) LIKE '%' || f.normalized_query || '%'
    UNION
    -- Company name matches the raw query
    SELECT j.id FROM public.jobs j CROSS JOIN flags f
    WHERE f.has_query AND j.is_published = true AND j.is_archived = false AND j.is_direct_apply = true
      AND j.deleted_at IS NULL AND j.posted_date >= f.cutoff_date
      AND lower(j.company) LIKE '%' || f.normalized_query || '%'
    UNION
    -- Title contains a closely-related role (expanded term)
    SELECT j.id FROM public.jobs j CROSS JOIN flags f
    JOIN LATERAL unnest(f.clean_expanded) AS et(term) ON f.has_expanded
    WHERE j.is_published = true AND j.is_archived = false AND j.is_direct_apply = true
      AND j.deleted_at IS NULL AND j.posted_date >= f.cutoff_date
      AND lower(j.title) LIKE '%' || et.term || '%'
  )
  SELECT COUNT(*)::bigint FROM candidate_ids;
$function$;