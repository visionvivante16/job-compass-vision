-- 1. Drop the old role check constraint and add expanded roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'founder'::text, 'employer'::text]));

-- 2. Update existing 'admin' role to 'founder'
UPDATE public.user_roles 
SET role = 'founder' 
WHERE role = 'admin';

-- 3. Add employer_id and is_active to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employer_id uuid,
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 4. Add created_by_user_id and employer_id to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
ADD COLUMN IF NOT EXISTS employer_id uuid;

-- 5. Create employer_permissions table
CREATE TABLE public.employer_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_post_jobs boolean NOT NULL DEFAULT false,
  can_edit_jobs boolean NOT NULL DEFAULT false,
  can_delete_jobs boolean NOT NULL DEFAULT false,
  can_view_graphs boolean NOT NULL DEFAULT false,
  can_import_google_sheet boolean NOT NULL DEFAULT false,
  can_manage_team boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 6. Enable RLS on employer_permissions
ALTER TABLE public.employer_permissions ENABLE ROW LEVEL SECURITY;

-- 7. Create helper function to check if user is founder
CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'founder'
  )
$$;

-- 8. Create helper function to check employer permission
CREATE OR REPLACE FUNCTION public.has_employer_permission(permission_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  -- Founder always has all permissions
  IF public.is_founder() THEN
    RETURN true;
  END IF;
  
  -- Check specific permission
  EXECUTE format(
    'SELECT COALESCE((SELECT %I FROM public.employer_permissions WHERE user_id = $1), false)',
    permission_name
  ) INTO result USING auth.uid();
  
  RETURN COALESCE(result, false);
END;
$$;

-- 9. Create function to check if user can access job
CREATE OR REPLACE FUNCTION public.can_access_job(job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_record RECORD;
  user_employer_id uuid;
BEGIN
  -- Founder can access all jobs
  IF public.is_founder() THEN
    RETURN true;
  END IF;
  
  -- Get the job's ownership info
  SELECT j.created_by_user_id, j.employer_id INTO job_record FROM public.jobs j WHERE j.id = can_access_job.job_id;
  
  -- Check if user created the job
  IF job_record.created_by_user_id = auth.uid() THEN
    RETURN true;
  END IF;
  
  -- Check if user belongs to same employer
  SELECT p.employer_id INTO user_employer_id FROM public.profiles p WHERE p.user_id = auth.uid();
  IF user_employer_id IS NOT NULL AND user_employer_id = job_record.employer_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 10. RLS policies for employer_permissions
CREATE POLICY "Founders can manage all permissions"
ON public.employer_permissions
FOR ALL
USING (public.is_founder())
WITH CHECK (public.is_founder());

CREATE POLICY "Users can view their own permissions"
ON public.employer_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- 11. Update is_admin function to include founder role and employer permissions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'founder')
  ) OR EXISTS (
    SELECT 1 FROM public.employer_permissions
    WHERE user_id = auth.uid()
    AND (can_post_jobs = true OR can_edit_jobs = true OR can_delete_jobs = true)
  )
$$;

-- 12. Update jobs RLS policies for employer access
DROP POLICY IF EXISTS "Admins can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;

CREATE POLICY "Authorized users can insert jobs"
ON public.jobs
FOR INSERT
WITH CHECK (
  public.is_founder() OR public.has_employer_permission('can_post_jobs')
);

CREATE POLICY "Authorized users can update jobs"
ON public.jobs
FOR UPDATE
USING (
  public.is_founder() OR (public.has_employer_permission('can_edit_jobs') AND public.can_access_job(id))
);

CREATE POLICY "Authorized users can delete jobs"
ON public.jobs
FOR DELETE
USING (
  public.is_founder() OR (public.has_employer_permission('can_delete_jobs') AND public.can_access_job(id))
);

CREATE POLICY "Authorized users can view managed jobs"
ON public.jobs
FOR SELECT
USING (
  is_published = true 
  OR public.is_founder() 
  OR (public.is_admin() AND public.can_access_job(id))
);

-- 13. Add trigger for employer_permissions updated_at
CREATE TRIGGER update_employer_permissions_updated_at
BEFORE UPDATE ON public.employer_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();