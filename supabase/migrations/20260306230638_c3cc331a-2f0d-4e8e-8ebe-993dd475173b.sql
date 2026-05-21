
-- Email notification preferences table
CREATE TABLE public.email_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  daily_digest_enabled boolean NOT NULL DEFAULT true,
  new_jobs_enabled boolean NOT NULL DEFAULT true,
  matched_jobs_enabled boolean NOT NULL DEFAULT true,
  sponsorship_jobs_enabled boolean NOT NULL DEFAULT true,
  unsubscribed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own email prefs"
  ON public.email_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own preferences (for unsubscribe)
CREATE POLICY "Users can update own email prefs"
  ON public.email_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own email prefs"
  ON public.email_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Founders can view all preferences
CREATE POLICY "Founders can view all email prefs"
  ON public.email_notification_preferences FOR SELECT
  USING (is_founder());

-- Founders can update all preferences
CREATE POLICY "Founders can update all email prefs"
  ON public.email_notification_preferences FOR UPDATE
  USING (is_founder());

-- Auto-create preferences for new users via trigger
CREATE OR REPLACE FUNCTION public.create_email_prefs_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.email_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_email_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_email_prefs_for_new_user();
