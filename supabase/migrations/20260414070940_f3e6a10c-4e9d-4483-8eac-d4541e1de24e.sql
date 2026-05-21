
-- Create validation function for USA-only locations
CREATE OR REPLACE FUNCTION public.validate_usa_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  loc text;
BEGIN
  loc := lower(COALESCE(NEW.location, ''));
  
  -- Allow if location contains US state abbreviations or US markers
  IF loc ~ '\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b' THEN
    RETURN NEW;
  END IF;
  
  IF loc ~ '(united states|usa|\bus\b)' THEN
    RETURN NEW;
  END IF;
  
  -- Allow US city names
  IF loc ~ '(new york|los angeles|san francisco|chicago|houston|phoenix|philadelphia|san diego|dallas|san jose|austin|seattle|denver|nashville|boston|detroit|atlanta|miami|portland|minneapolis|tampa|orlando|raleigh|charlotte|pittsburgh|cincinnati|las vegas|sacramento|silicon valley|bay area)' THEN
    RETURN NEW;
  END IF;
  
  -- Allow remote if it mentions US
  IF loc ~ 'remote' AND loc ~ '(us|usa|united states)' THEN
    RETURN NEW;
  END IF;
  
  -- Allow "Remote - US" pattern set by our enrichment
  IF loc = 'remote - us' THEN
    RETURN NEW;
  END IF;

  -- Check full US state names
  IF loc ~ '(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)' THEN
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION 'Only USA-based jobs are allowed. Location "%" is not recognized as a US location.', NEW.location;
END;
$$;

-- Create trigger
CREATE TRIGGER enforce_usa_location
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_usa_location();

-- Delete existing non-USA jobs
DELETE FROM public.jobs
WHERE id IN (
  SELECT id FROM public.jobs
  WHERE NOT (
    location ~* '\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b'
    OR location ~* '(united states|usa|\bus\b)'
    OR location ~* '(new york|los angeles|san francisco|chicago|houston|phoenix|philadelphia|san diego|dallas|san jose|austin|seattle|denver|nashville|boston|detroit|atlanta|miami|portland|minneapolis|tampa|orlando|raleigh|charlotte|pittsburgh|cincinnati|las vegas|sacramento|silicon valley|bay area)'
    OR lower(location) = 'remote - us'
    OR location ~* '(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)'
  )
);
