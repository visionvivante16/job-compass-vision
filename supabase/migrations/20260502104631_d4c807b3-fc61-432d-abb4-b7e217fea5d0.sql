-- 1) Backfill: insert default-on preferences for any auth user missing a row
INSERT INTO public.email_notification_preferences (
  user_id, daily_digest_enabled, new_jobs_enabled, matched_jobs_enabled, sponsorship_jobs_enabled
)
SELECT u.id, true, true, true, true
FROM auth.users u
LEFT JOIN public.email_notification_preferences p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 2) Trigger function: auto-create default-on preferences on new signup
CREATE OR REPLACE FUNCTION public.create_default_email_prefs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.email_notification_preferences (
    user_id, daily_digest_enabled, new_jobs_enabled, matched_jobs_enabled, sponsorship_jobs_enabled
  )
  VALUES (NEW.id, true, true, true, true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3) Attach trigger to auth.users (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created_email_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_email_prefs
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_email_prefs();