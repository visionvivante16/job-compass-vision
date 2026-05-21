-- Soft-delete remaining Arbeitnow-sourced jobs
UPDATE public.jobs
SET deleted_at = now(), is_published = false
WHERE description_source = 'arbeitnow'
  AND deleted_at IS NULL;

-- Drop the runs table (cascades any policies)
DROP TABLE IF EXISTS public.arbeitnow_ingest_runs CASCADE;