
CREATE OR REPLACE FUNCTION public.get_top_hiring_roles(max_roles integer DEFAULT 5)
RETURNS TABLE(role_name text, job_count bigint, percentage numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_jobs bigint;
BEGIN
  -- Count total published, non-archived jobs
  SELECT COUNT(*) INTO total_jobs
  FROM public.jobs
  WHERE is_published = true AND is_archived = false;

  IF total_jobs = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH normalized_titles AS (
    SELECT 
      CASE
        WHEN lower(j.title) ~ '(software|full.?stack|backend|frontend|web) (engineer|developer)' THEN 'Software Engineer'
        WHEN lower(j.title) ~ '(data analyst|business analyst|data analytics)' THEN 'Data Analyst'
        WHEN lower(j.title) ~ '(data scientist|machine learning|ml engineer|ai engineer)' THEN 'Data Scientist / ML'
        WHEN lower(j.title) ~ '(devops|sre|site reliability|platform engineer|infrastructure)' THEN 'DevOps / SRE'
        WHEN lower(j.title) ~ '(product manager|program manager|project manager)' THEN 'Product / Project Manager'
        WHEN lower(j.title) ~ '(ui|ux|design|graphic)' THEN 'UI/UX Designer'
        WHEN lower(j.title) ~ '(qa|quality|test engineer|sdet)' THEN 'QA Engineer'
        WHEN lower(j.title) ~ '(cloud|aws|azure|gcp)' THEN 'Cloud Engineer'
        WHEN lower(j.title) ~ '(security|cyber|infosec)' THEN 'Security Engineer'
        WHEN lower(j.title) ~ '(mobile|ios|android|react native|flutter)' THEN 'Mobile Developer'
        WHEN lower(j.title) ~ '(sales|account executive|business development)' THEN 'Sales / BizDev'
        WHEN lower(j.title) ~ '(marketing|growth|seo|content)' THEN 'Marketing'
        WHEN lower(j.title) ~ '(support|customer success|help desk)' THEN 'Customer Support'
        WHEN lower(j.title) ~ '(civil|structural|mechanical|electrical) engineer' THEN 'Civil / Mechanical Engineer'
        WHEN lower(j.title) ~ '(network|systems? admin|it support)' THEN 'IT / Network Admin'
        WHEN lower(j.title) ~ '(database|dba|sql)' THEN 'Database Admin'
        WHEN lower(j.title) ~ '(consultant|advisor)' THEN 'Consultant'
        ELSE 'Other'
      END as category
    FROM public.jobs j
    WHERE j.is_published = true AND j.is_archived = false
  )
  SELECT 
    nt.category as role_name,
    COUNT(*) as job_count,
    ROUND((COUNT(*)::numeric / total_jobs) * 100, 0) as percentage
  FROM normalized_titles nt
  WHERE nt.category != 'Other'
  GROUP BY nt.category
  ORDER BY COUNT(*) DESC
  LIMIT max_roles;
END;
$$;
