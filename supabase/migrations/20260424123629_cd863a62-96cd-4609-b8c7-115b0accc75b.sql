-- Backfill: replace LinkedIn/blocked logos with Google favicons derived from the apply link domain.
-- LinkedIn CDN blocks hotlinking, so these URLs render as broken images and the UI hides them.
UPDATE public.jobs
SET company_logo = 'https://www.google.com/s2/favicons?domain=' ||
  regexp_replace(
    regexp_replace(external_apply_link, '^https?://(www\.)?', ''),
    '/.*$', ''
  ) || '&sz=128'
WHERE (company_logo ILIKE '%licdn%' OR company_logo ILIKE '%linkedin.com%')
  AND external_apply_link IS NOT NULL
  AND external_apply_link <> ''
  AND external_apply_link !~* '(linkedin\.com|indeed\.com|glassdoor\.com|ziprecruiter\.com|monster\.com|dice\.com|greenhouse\.io|lever\.co|workday\.com|icims\.com|smartrecruiters\.com|jobvite\.com|myworkdayjobs\.com)';

-- For jobs whose apply link IS a generic job board, fall back to a favicon based on the company slug.
UPDATE public.jobs
SET company_logo = 'https://www.google.com/s2/favicons?domain=' ||
  regexp_replace(lower(company), '[^a-z0-9]', '', 'g') || '.com&sz=128'
WHERE (company_logo ILIKE '%licdn%' OR company_logo ILIKE '%linkedin.com%')
  AND length(regexp_replace(lower(company), '[^a-z0-9]', '', 'g')) >= 3;

-- Anything left (no usable derivation) → null so the UI shows clean initials instead of a broken image.
UPDATE public.jobs
SET company_logo = NULL
WHERE company_logo ILIKE '%licdn%' OR company_logo ILIKE '%linkedin.com%';