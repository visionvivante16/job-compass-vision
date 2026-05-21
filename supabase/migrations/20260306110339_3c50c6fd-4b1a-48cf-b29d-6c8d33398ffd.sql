
-- Create unique index on external_apply_link for non-empty values
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_unique_external_apply_link 
ON public.jobs (external_apply_link) 
WHERE external_apply_link IS NOT NULL AND external_apply_link != '';

-- Create a database function to remove duplicate jobs (keeps oldest record)
CREATE OR REPLACE FUNCTION public.remove_duplicate_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  link_removed integer := 0;
  combo_removed integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Remove duplicates by external_apply_link (keep oldest)
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY external_apply_link 
      ORDER BY created_at ASC
    ) as rn
    FROM public.jobs
    WHERE external_apply_link IS NOT NULL AND external_apply_link != ''
  ),
  deleted AS (
    DELETE FROM public.jobs WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    RETURNING id
  )
  SELECT count(*) INTO link_removed FROM deleted;

  -- Remove duplicates by title + company + location (keep oldest)
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY lower(trim(title)), lower(trim(company)), lower(trim(location))
      ORDER BY created_at ASC
    ) as rn
    FROM public.jobs
  ),
  deleted AS (
    DELETE FROM public.jobs WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    RETURNING id
  )
  SELECT count(*) INTO combo_removed FROM deleted;

  RETURN jsonb_build_object('removed', link_removed + combo_removed);
END;
$$;
