-- One-time cleanup: soft-delete non-US jobs imported in the last 2 hours by ATS ingest
UPDATE public.jobs
SET deleted_at = now(), is_published = false
WHERE created_at > now() - interval '2 hours'
  AND deleted_at IS NULL
  AND (
    location ~* '\b(india|mexico|brazil|bengaluru|bangalore|são paulo|sao paulo|tokyo|japan|dublin|ireland|london|united kingdom|canada|vancouver|toronto|singapore|australia|germany|france|spain|netherlands|china|korea|philippines|indonesia|thailand|vietnam|taiwan|hong kong|dubai|uae|israel|rio de janeiro|mexico city)\b'
    OR location ~ ',\s*(IE|UK|GB|DE|FR|JP|CN|KR|SG|AU|NZ|BR|MX|CA|IN|IT|NL|SE|NO|DK|FI|CH|AT|BE|PT|PL|IL|TR|AE|HK|TW|MY|TH|VN|ID|PH|AR|CL|CO|ES)\s*$'
    OR lower(location) IN ('united kingdom', 'bangalore', 'singapore', 'remote canada', 'remote - uk', 'remote - mexico', 'remote - canada', 'bengaluru - blr1')
  )
  AND lower(location) !~ 'new mexico';