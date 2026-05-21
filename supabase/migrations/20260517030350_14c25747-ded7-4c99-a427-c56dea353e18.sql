ALTER TABLE public.saved_jobs ADD COLUMN IF NOT EXISTS folder text NOT NULL DEFAULT 'All';
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_folder ON public.saved_jobs(user_id, folder);

CREATE POLICY "Users can update their own saved jobs"
ON public.saved_jobs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);