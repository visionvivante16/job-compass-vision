
CREATE OR REPLACE FUNCTION public.suggest_job_titles(query_text text, max_results integer DEFAULT 8)
RETURNS TABLE(suggestion text, match_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  clean_query text;
BEGIN
  clean_query := lower(trim(query_text));
  
  IF clean_query = '' OR clean_query IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH normalized AS (
    SELECT 
      CASE
        WHEN lower(j.title) ~ '(software|full.?stack|backend|frontend|web) (engineer|developer)' THEN 'Software Engineer'
        WHEN lower(j.title) ~ 'senior.*(software|full.?stack|backend|frontend)' THEN 'Senior Software Engineer'
        WHEN lower(j.title) ~ 'data analyst' THEN 'Data Analyst'
        WHEN lower(j.title) ~ 'data engineer' THEN 'Data Engineer'
        WHEN lower(j.title) ~ '(data scientist|machine learning|ml engineer)' THEN 'Data Scientist'
        WHEN lower(j.title) ~ 'ai engineer' THEN 'AI Engineer'
        WHEN lower(j.title) ~ '(devops|sre|site reliability|platform engineer)' THEN 'DevOps Engineer'
        WHEN lower(j.title) ~ '(product manager|program manager)' THEN 'Product Manager'
        WHEN lower(j.title) ~ 'project manager' THEN 'Project Manager'
        WHEN lower(j.title) ~ '(ui|ux|product design)' THEN 'UI/UX Designer'
        WHEN lower(j.title) ~ '(qa|quality|test engineer|sdet)' THEN 'QA Engineer'
        WHEN lower(j.title) ~ '(cloud|aws|azure|gcp).*(engineer|architect)' THEN 'Cloud Engineer'
        WHEN lower(j.title) ~ '(security|cyber|infosec)' THEN 'Security Engineer'
        WHEN lower(j.title) ~ '(mobile|ios|android|react native|flutter)' THEN 'Mobile Developer'
        WHEN lower(j.title) ~ '(marketing|growth|seo)' THEN 'Marketing Manager'
        WHEN lower(j.title) ~ '(business analyst|bi analyst|analytics)' THEN 'Business Analyst'
        WHEN lower(j.title) ~ 'solutions architect' THEN 'Solutions Architect'
        WHEN lower(j.title) ~ 'technical lead' THEN 'Technical Lead'
        WHEN lower(j.title) ~ 'engineering manager' THEN 'Engineering Manager'
        WHEN lower(j.title) ~ '(network|systems? admin)' THEN 'Network Administrator'
        WHEN lower(j.title) ~ '(database|dba)' THEN 'Database Administrator'
        WHEN lower(j.title) ~ 'scrum master' THEN 'Scrum Master'
        WHEN lower(j.title) ~ 'blockchain' THEN 'Blockchain Developer'
        ELSE j.title
      END as normalized_title
    FROM public.jobs j
    WHERE j.is_published = true AND j.is_archived = false
  )
  SELECT 
    n.normalized_title as suggestion,
    COUNT(*) as match_count
  FROM normalized n
  WHERE lower(n.normalized_title) LIKE '%' || clean_query || '%'
  GROUP BY n.normalized_title
  ORDER BY 
    CASE WHEN lower(n.normalized_title) LIKE clean_query || '%' THEN 0 ELSE 1 END,
    COUNT(*) DESC,
    n.normalized_title
  LIMIT max_results;
END;
$$;
