ALTER TABLE public.ats_companies DROP CONSTRAINT ats_companies_status_check;
ALTER TABLE public.ats_companies ADD CONSTRAINT ats_companies_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text, 'failed'::text]));
UPDATE public.ats_companies SET status='failed', updated_at=now() WHERE slug='chess' AND ats_platform='lever';