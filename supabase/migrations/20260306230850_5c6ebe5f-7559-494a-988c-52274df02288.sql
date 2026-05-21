
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Seed email preferences for all existing users who don't have them yet
INSERT INTO public.email_notification_preferences (user_id)
SELECT u.id FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_notification_preferences e WHERE e.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;
