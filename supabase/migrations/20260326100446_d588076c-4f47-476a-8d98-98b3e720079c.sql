
-- Trigger: auto-set is_premium = true for profiles when total profiles <= 100
CREATE OR REPLACE FUNCTION public.auto_premium_first_100()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_count bigint;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  IF profile_count <= 100 THEN
    NEW.is_premium := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Fire BEFORE INSERT so it sets is_premium on the new row
CREATE TRIGGER trg_auto_premium_first_100
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_premium_first_100();
