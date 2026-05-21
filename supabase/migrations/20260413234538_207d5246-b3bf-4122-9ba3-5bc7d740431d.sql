-- Step 1: Delete existing non-USA jobs
DELETE FROM jobs
WHERE (
  -- Explicit non-US country/city indicators in location
  location ~* '\m(india|uk|united kingdom|england|scotland|wales|germany|france|canada|mexico|japan|china|korea|singapore|australia|new zealand|ireland|netherlands|sweden|norway|denmark|finland|switzerland|austria|belgium|spain|italy|portugal|poland|czech|romania|hungary|greece|turkey|israel|brazil|argentina|colombia|chile|philippines|indonesia|malaysia|thailand|vietnam|taiwan|hong kong|dubai|uae|saudi|qatar|egypt|nigeria|kenya|south africa|ukraine|russia|slovenia|croatia|serbia|estonia|latvia|lithuania|luxembourg|iceland|bulgaria|slovakia|british columbia|alberta|ontario|quebec|europe|asia|africa|latin america|apac|emea|global|manchester|bangalore|hyderabad|mumbai|pune|delhi|chennai|noida|gurugram|kolkata|london|edinburgh|cambridge|oxford|bristol|berlin|munich|hamburg|frankfurt|stuttgart|paris|lyon|marseille|amsterdam|rotterdam|dublin|stockholm|copenhagen|oslo|helsinki|zurich|geneva|vienna|brussels|lisbon|madrid|barcelona|milan|rome|prague|warsaw|budapest|bucharest|tokyo|osaka|seoul|shanghai|beijing|sydney|melbourne|brisbane|auckland|tel aviv|toronto|vancouver|montreal|ottawa|calgary|são paulo|mexico city|buenos aires|bogota|santiago|cape town|johannesburg|nairobi|lagos|taipei|bangkok|jakarta|kuala lumpur|manila)\M'
  AND location !~* '\m(new mexico)\M'
)
OR (
  -- Remote without US context
  location ~* '\bremote\b'
  AND location !~* '\m(US|USA|United States)\M'
  AND location !~* ',\s*[A-Z]{2}\s*$'
  AND location !~* '\m(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\M'
);

-- Step 2: Attach the existing validate_usa_location function as a trigger
-- This will reject any INSERT or UPDATE with a non-US location
CREATE TRIGGER enforce_usa_location
  BEFORE INSERT OR UPDATE OF location ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_usa_location();