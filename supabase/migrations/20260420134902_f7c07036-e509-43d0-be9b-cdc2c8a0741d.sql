-- Soft-delete all jobs whose apply link points to LinkedIn
UPDATE public.jobs
SET deleted_at = now(),
    is_published = false,
    updated_at = now()
WHERE external_apply_link ILIKE '%linkedin.com%'
  AND deleted_at IS NULL;