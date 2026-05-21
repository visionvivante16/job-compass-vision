-- Soft-delete all non-US Arbeitnow jobs that were imported before the US-only filter was added
UPDATE public.jobs
SET deleted_at = now(), is_published = false
WHERE description_source = 'arbeitnow'
  AND deleted_at IS NULL;