
CREATE OR REPLACE FUNCTION public.validate_usa_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  loc text;
  lower_loc text;
BEGIN
  loc := COALESCE(NEW.location, '');
  lower_loc := lower(trim(loc));

  -- Empty location → reject
  IF lower_loc = '' THEN
    RAISE EXCEPTION 'Job location is required and must be in the United States';
  END IF;

  -- Quick accept: explicit US markers
  IF loc ~ '\mUS\M' OR lower_loc ~ '\m(usa|united states)\M' THEN
    RETURN NEW;
  END IF;

  -- Accept: US state abbreviation pattern (City, ST or City, ST, US)
  IF loc ~ ',\s*[A-Z]{2}\s*(,\s*US)?\s*(\(.*\))?\s*$' THEN
    -- Verify it's an actual US state
    IF (regexp_match(loc, ',\s*([A-Z]{2})\s*(?:,\s*US)?\s*(?:\(.*\))?\s*$'))[1] IN (
      'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
      'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
      'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
      'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
      'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Accept: full US state names
  IF lower_loc ~* '\m(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia)\M' THEN
    -- But reject if also contains non-US indicators
    IF lower_loc ~* '\m(canada|mexico|india|united kingdom|england|ireland|germany|france|spain|italy|netherlands|japan|china|korea|singapore|australia|brazil|israel|europe|asia|global|emea|apac)\M' THEN
      -- exception: "new mexico" contains "mexico"
      IF NOT (lower_loc ~ 'new mexico') THEN
        RAISE EXCEPTION 'Only USA-based jobs are allowed. Location "%" appears non-US.', NEW.location;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Accept: known major US cities
  IF lower_loc ~* '\m(new york|nyc|los angeles|san francisco|chicago|houston|phoenix|philadelphia|san diego|dallas|san jose|austin|seattle|denver|nashville|las vegas|portland|atlanta|boston|detroit|miami|minneapolis|tampa|orlando|raleigh|pittsburgh|cincinnati|st\.? louis|baltimore|milwaukee|sacramento|charlotte|indianapolis|columbus|oklahoma city|kansas city|silicon valley|bay area)\M' THEN
    RETURN NEW;
  END IF;

  -- Reject: contains non-US country indicators
  IF lower_loc ~* '\m(canada|mexico|india|uk|united kingdom|england|scotland|wales|ireland|germany|france|spain|italy|netherlands|sweden|norway|denmark|finland|switzerland|austria|belgium|portugal|poland|czech|romania|hungary|greece|turkey|israel|japan|china|korea|singapore|australia|new zealand|brazil|argentina|colombia|chile|philippines|indonesia|malaysia|thailand|vietnam|taiwan|hong kong|dubai|uae|saudi|qatar|egypt|nigeria|kenya|south africa|ukraine|russia|slovenia|croatia|serbia|estonia|latvia|lithuania|luxembourg|iceland|bulgaria|slovakia|british columbia|alberta|ontario|quebec|europe|asia|africa|latin america|apac|emea|global)\M' THEN
    -- exception for new mexico
    IF lower_loc ~ 'new mexico' AND NOT lower_loc ~* '\m(canada|india|united kingdom|england|germany|france|japan|china|korea|singapore|australia|europe|asia|global)\M' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only USA-based jobs are allowed. Location "%" appears non-US.', NEW.location;
  END IF;

  -- Remote without US context → reject
  IF lower_loc ~* '\mremote\M' THEN
    RAISE EXCEPTION 'Remote jobs must specify US-based (e.g., "Remote - US"). Location "%" rejected.', NEW.location;
  END IF;

  -- If we can't determine it's US, still allow (could be a US city we don't recognize)
  -- This is permissive for edge cases
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_job_usa_location
  BEFORE INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_usa_location();
