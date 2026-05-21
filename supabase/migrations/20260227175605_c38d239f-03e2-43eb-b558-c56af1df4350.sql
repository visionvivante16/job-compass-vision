
-- Create trigger to prevent users from self-granting premium
CREATE OR REPLACE FUNCTION public.protect_premium_field()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If is_premium is being changed and the user is not an admin, block it
  IF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
    IF NOT public.is_admin() THEN
      NEW.is_premium := OLD.is_premium;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profiles_premium
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_premium_field();
