ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_resume_template text;

ALTER TABLE public.feature_feedback ADD COLUMN IF NOT EXISTS feature text;
ALTER TABLE public.feature_feedback ADD COLUMN IF NOT EXISTS feedback_text text;
ALTER TABLE public.feature_feedback ADD COLUMN IF NOT EXISTS template_used text;
ALTER TABLE public.feature_feedback ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.feature_feedback ADD COLUMN IF NOT EXISTS company_name text;

ALTER TABLE public.feature_feedback ALTER COLUMN rating DROP NOT NULL;