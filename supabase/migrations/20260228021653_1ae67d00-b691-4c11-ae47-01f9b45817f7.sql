
CREATE OR REPLACE FUNCTION public.protect_premium_field()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If is_premium is being changed
  IF NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN
    -- Allow if the caller is an admin OR if there's no auth context (service role)
    IF auth.uid() IS NULL OR public.is_admin() THEN
      -- Allow the change (service role or admin)
      RETURN NEW;
    ELSE
      -- Block: revert is_premium for non-admin authenticated users
      NEW.is_premium := OLD.is_premium;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
