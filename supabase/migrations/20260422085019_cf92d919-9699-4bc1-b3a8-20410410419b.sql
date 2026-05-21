-- Cleanup pass 2: remaining non-US locations using simpler ILIKE matching
UPDATE public.jobs
SET deleted_at = now(), is_published = false
WHERE created_at > now() - interval '2 hours'
  AND deleted_at IS NULL
  AND (
    location ILIKE '%india%' OR location ILIKE '%bengaluru%' OR location ILIKE '%bangalore%'
    OR location ILIKE '%brazil%' OR location ILIKE '%são paulo%' OR location ILIKE '%sao paulo%' OR location ILIKE '%rio de janeiro%'
    OR location ILIKE '%canada%' OR location ILIKE '%vancouver%' OR location ILIKE '%toronto%' OR location ILIKE '%british columbia%' OR location ILIKE '%ontario%' OR location ILIKE '%quebec%' OR location ILIKE '%alberta%'
    OR location ILIKE '%japan%' OR location ILIKE '%tokyo%'
    OR location ILIKE '%singapore%'
    OR location ILIKE '%australia%' OR location ILIKE '%sydney%' OR location ILIKE '%melbourne%'
    OR location ILIKE '%philippines%' OR location ILIKE '%manila%'
    OR location ILIKE '%mexico city%' OR location ILIKE '%remote - mexico%' OR location ILIKE '%remote mexico%'
    OR location ILIKE '%dublin%' OR location ILIKE '%ireland%'
    OR location ILIKE '%london%' OR location ILIKE '%united kingdom%' OR location ILIKE '%england%' OR location ILIKE '%scotland%' OR location ILIKE '%wales%' OR location ILIKE '%remote - uk%' OR location ILIKE '%remote uk%'
    OR location ILIKE '%germany%' OR location ILIKE '%berlin%' OR location ILIKE '%munich%'
    OR location ILIKE '%france%' OR location ILIKE '%paris%'
    OR location ILIKE '%netherlands%' OR location ILIKE '%amsterdam%'
    OR location ILIKE '%spain%' OR location ILIKE '%madrid%' OR location ILIKE '%barcelona%'
    OR location ILIKE '%italy%' OR location ILIKE '%rome%' OR location ILIKE '%milan%'
    OR location ILIKE '%poland%' OR location ILIKE '%warsaw%'
    OR location ILIKE '%sweden%' OR location ILIKE '%stockholm%'
    OR location ILIKE '%denmark%' OR location ILIKE '%copenhagen%'
    OR location ILIKE '%switzerland%' OR location ILIKE '%zurich%'
    OR location ILIKE '%israel%' OR location ILIKE '%tel aviv%'
    OR location ILIKE '%dubai%' OR location ILIKE '%uae%'
    OR location ILIKE '%hong kong%' OR location ILIKE '%taiwan%' OR location ILIKE '%korea%' OR location ILIKE '%china%'
    OR location ILIKE '%thailand%' OR location ILIKE '%vietnam%' OR location ILIKE '%indonesia%' OR location ILIKE '%malaysia%'
    OR location ILIKE '%argentina%' OR location ILIKE '%colombia%' OR location ILIKE '%chile%'
  )
  AND lower(location) NOT LIKE '%new mexico%'
  AND lower(location) NOT LIKE '%, us%'
  AND lower(location) NOT LIKE '%usa%'
  AND lower(location) NOT LIKE '%united states%';