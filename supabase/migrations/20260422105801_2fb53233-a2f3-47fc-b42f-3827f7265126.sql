-- Tracks when each user was last notified about new jobs (throttling)
CREATE TABLE IF NOT EXISTS public.new_jobs_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  last_notified_at timestamptz NOT NULL DEFAULT now(),
  jobs_count_last_notification integer NOT NULL DEFAULT 0,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_new_jobs_notification_log_user
  ON public.new_jobs_notification_log(user_id);

ALTER TABLE public.new_jobs_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification log"
  ON public.new_jobs_notification_log
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role can manage notification log"
  ON public.new_jobs_notification_log
  FOR ALL
  USING (true)
  WITH CHECK (true);