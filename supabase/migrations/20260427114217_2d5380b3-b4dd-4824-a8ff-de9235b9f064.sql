CREATE OR REPLACE FUNCTION public.get_landing_company_count(days_back integer DEFAULT 45)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT lower(trim(company)))::int
  FROM public.jobs
  WHERE is_published = true
    AND is_archived = false
    AND is_direct_apply = true
    AND deleted_at IS NULL
    AND posted_date >= (now() - (days_back || ' days')::interval);
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_company_count(integer) TO anon, authenticated;