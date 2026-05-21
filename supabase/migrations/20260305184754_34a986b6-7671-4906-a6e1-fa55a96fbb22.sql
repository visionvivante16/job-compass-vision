
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
