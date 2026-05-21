
CREATE OR REPLACE FUNCTION public.count_search_jobs(
  search_query text DEFAULT NULL,
  expanded_terms text[] DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  clean_query text;
  has_query boolean;
  has_expanded boolean;
  result bigint;
BEGIN
  clean_query := trim(search_query);
  has_query := clean_query IS NOT NULL AND clean_query != '';
  has_expanded := expanded_terms IS NOT NULL AND array_length(expanded_terms, 1) > 0;

  SELECT COUNT(*) INTO result
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
        OR j.location ILIKE '%' || clean_query || '%'
      ))
      OR (has_expanded AND (
        EXISTS (SELECT 1 FROM unnest(expanded_terms) et WHERE j.title ILIKE '%' || et || '%')
        OR EXISTS (SELECT 1 FROM unnest(expanded_terms) et WHERE EXISTS (SELECT 1 FROM unnest(j.skills) sk WHERE sk ILIKE '%' || et || '%'))
        OR EXISTS (SELECT 1 FROM unnest(expanded_terms) et WHERE j.description ILIKE '%' || et || '%')
      ))
    );

  RETURN result;
END;
$$;
