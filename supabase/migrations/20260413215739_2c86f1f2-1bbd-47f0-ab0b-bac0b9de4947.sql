
-- Disable the trigger temporarily
ALTER TABLE public.jobs DISABLE TRIGGER validate_job_usa_location;

-- Soft-delete non-USA jobs
UPDATE public.jobs 
SET deleted_at = now(), is_published = false
WHERE deleted_at IS NULL
  AND NOT (
    location ~ '\mUS\M'
    OR lower(location) ~ '\m(usa|united states)\M'
    OR (
      location ~ ',\s*[A-Z]{2}\s*(,\s*US)?\s*(\(.*\))?\s*$'
      AND (regexp_match(location, ',\s*([A-Z]{2})\s*(?:,\s*US)?\s*(?:\(.*\))?\s*$'))[1] IN (
        'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
        'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
        'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
        'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
        'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
      )
    )
    OR lower(location) ~* '\m(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia)\M'
    OR lower(location) ~* '\m(los angeles|san francisco|chicago|houston|phoenix|philadelphia|san diego|dallas|san jose|austin|seattle|denver|nashville|las vegas|portland|atlanta|boston|detroit|miami|minneapolis|tampa|orlando|raleigh|pittsburgh|cincinnati|baltimore|milwaukee|sacramento|charlotte|indianapolis|columbus|oklahoma city|kansas city|silicon valley|bay area)\M'
  );

-- Re-enable the trigger
ALTER TABLE public.jobs ENABLE TRIGGER validate_job_usa_location;
