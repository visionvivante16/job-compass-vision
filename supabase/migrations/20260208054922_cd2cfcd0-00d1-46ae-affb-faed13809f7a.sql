-- Fix archive_old_jobs() to require admin authorization
CREATE OR REPLACE FUNCTION public.archive_old_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Require admin role to execute this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  UPDATE public.jobs
  SET is_archived = true
  WHERE is_archived = false
    AND posted_date < now() - interval '45 days';
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;