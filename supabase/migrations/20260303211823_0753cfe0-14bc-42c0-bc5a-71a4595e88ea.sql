
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS work_experience jsonb DEFAULT '[]'::jsonb;

-- Convert education from single object to array format
-- Existing data will be migrated: if it's a non-empty object, wrap it in an array
UPDATE public.profiles
SET education = CASE
  WHEN education IS NULL OR education = '{}'::jsonb THEN '[]'::jsonb
  WHEN jsonb_typeof(education) = 'object' THEN jsonb_build_array(education)
  WHEN jsonb_typeof(education) = 'array' THEN education
  ELSE '[]'::jsonb
END;
