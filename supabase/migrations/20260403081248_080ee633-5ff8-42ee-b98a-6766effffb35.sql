
-- Add soft delete column to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Update RLS: hide soft-deleted jobs from public view
DROP POLICY IF EXISTS "Anyone can view published jobs" ON public.jobs;
CREATE POLICY "Anyone can view published jobs"
  ON public.jobs FOR SELECT TO public
  USING (is_published = true AND deleted_at IS NULL);

-- Update managed jobs policy to also exclude soft-deleted (unless founder)
DROP POLICY IF EXISTS "Authorized users can view managed jobs" ON public.jobs;
CREATE POLICY "Authorized users can view managed jobs"
  ON public.jobs FOR SELECT TO public
  USING (
    ((is_published = true AND deleted_at IS NULL)
    OR is_founder()
    OR ((has_employer_permission('can_post_jobs') OR has_employer_permission('can_edit_jobs') OR has_employer_permission('can_delete_jobs')) AND can_access_job(id)))
  );
