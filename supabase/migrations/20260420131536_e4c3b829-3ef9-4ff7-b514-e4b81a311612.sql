
-- 1) Grant 1 month free premium to ALL existing users (skip those who already have an active grant)
INSERT INTO public.manual_premium_grants (user_id, granted_by, duration_type, expires_at, is_active, notes)
SELECT 
  p.user_id,
  p.user_id,
  'monthly',
  now() + interval '1 month',
  true,
  'Promo: free 1 month for all users'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.manual_premium_grants g
  WHERE g.user_id = p.user_id
    AND g.is_active = true
    AND (g.expires_at IS NULL OR g.expires_at > now())
);

-- Flip is_premium for everyone (trigger allows this from admin/service role context)
UPDATE public.profiles SET is_premium = true WHERE is_premium = false;

-- 2) Update handle_new_user to also create a 1-month grant for every new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, is_premium)
  VALUES (NEW.id, NEW.email, true);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  INSERT INTO public.manual_premium_grants (user_id, granted_by, duration_type, expires_at, is_active, notes)
  VALUES (NEW.id, NEW.id, 'monthly', now() + interval '1 month', true, 'Promo: free 1 month for new signup');
  
  RETURN NEW;
END;
$function$;
