-- Fix privilege escalation: admin must mean role-based admin only
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'founder')
  );
$$;

-- Employer permissions must require current employer role (founder bypass)
CREATE OR REPLACE FUNCTION public.has_employer_permission(permission_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result boolean;
  is_employer boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Founder always has all permissions
  IF public.is_founder() THEN
    RETURN true;
  END IF;

  -- Must currently be an employer to have employer permissions
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'employer'
  ) INTO is_employer;

  IF NOT is_employer THEN
    RETURN false;
  END IF;

  -- Check specific permission column on employer_permissions
  EXECUTE format(
    'SELECT COALESCE((SELECT %I FROM public.employer_permissions WHERE user_id = $1), false)',
    permission_name
  ) INTO result USING auth.uid();

  RETURN COALESCE(result, false);
END;
$$;

-- Employers can only access jobs they created (founder can access all)
CREATE OR REPLACE FUNCTION public.can_access_job(job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_founder()
  OR EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = job_id
      AND j.created_by_user_id = auth.uid()
  );
$$;

-- Jobs: allow employers to see/manage ONLY their own jobs; users see only published jobs
DROP POLICY IF EXISTS "Authorized users can view managed jobs" ON public.jobs;
CREATE POLICY "Authorized users can view managed jobs"
ON public.jobs
FOR SELECT
USING (
  (is_published = true)
  OR public.is_founder()
  OR (
    (
      public.has_employer_permission('can_post_jobs')
      OR public.has_employer_permission('can_edit_jobs')
      OR public.has_employer_permission('can_delete_jobs')
    )
    AND public.can_access_job(id)
  )
);

-- Jobs: employers must set created_by_user_id to themselves on insert
DROP POLICY IF EXISTS "Authorized users can insert jobs" ON public.jobs;
CREATE POLICY "Authorized users can insert jobs"
ON public.jobs
FOR INSERT
WITH CHECK (
  public.is_founder()
  OR (
    public.has_employer_permission('can_post_jobs')
    AND created_by_user_id = auth.uid()
  )
);

-- Jobs: prevent employers from changing created_by_user_id
DROP POLICY IF EXISTS "Authorized users can update jobs" ON public.jobs;
CREATE POLICY "Authorized users can update jobs"
ON public.jobs
FOR UPDATE
USING (
  public.is_founder()
  OR (
    public.has_employer_permission('can_edit_jobs')
    AND public.can_access_job(id)
  )
)
WITH CHECK (
  public.is_founder()
  OR created_by_user_id = auth.uid()
);
