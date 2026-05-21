-- 1. user_streaks: daily activity streak per user
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  jobs_viewed_today integer NOT NULL DEFAULT 0,
  jobs_viewed_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streak"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
  ON public.user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
  ON public.user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. user_visits: track last visit for "new jobs since" badge
CREATE TABLE IF NOT EXISTS public.user_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  last_visit_at timestamptz NOT NULL DEFAULT now(),
  previous_visit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own visit"
  ON public.user_visits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own visit"
  ON public.user_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visit"
  ON public.user_visits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_visits_updated_at
  BEFORE UPDATE ON public.user_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. weekly_digest_log: idempotency for Sunday emails
CREATE TABLE IF NOT EXISTS public.weekly_digest_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  jobs_viewed integer NOT NULL DEFAULT 0,
  jobs_applied integer NOT NULL DEFAULT 0,
  matched_jobs_count integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_digest_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage weekly digest log"
  ON public.weekly_digest_log FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view weekly digest log"
  ON public.weekly_digest_log FOR SELECT
  USING (is_admin());

-- 4. RPC: atomic streak update (called when user views jobs)
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_streak record;
  v_new_count integer;
  v_new_jobs_today integer;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Upsert streak row
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_active_date, jobs_viewed_today, jobs_viewed_date)
  VALUES (p_user_id, 0, 0, NULL, 0, v_today)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_streak FROM public.user_streaks WHERE user_id = p_user_id FOR UPDATE;

  -- Reset daily counter if new day
  IF v_streak.jobs_viewed_date IS DISTINCT FROM v_today THEN
    v_new_jobs_today := 1;
  ELSE
    v_new_jobs_today := v_streak.jobs_viewed_today + 1;
  END IF;

  -- Streak logic: only count when user hits 2 jobs today
  IF v_new_jobs_today = 2 AND v_streak.last_active_date IS DISTINCT FROM v_today THEN
    IF v_streak.last_active_date = v_today - 1 THEN
      v_new_count := v_streak.current_streak + 1;
    ELSE
      v_new_count := 1;
    END IF;

    UPDATE public.user_streaks
    SET current_streak = v_new_count,
        longest_streak = GREATEST(longest_streak, v_new_count),
        last_active_date = v_today,
        jobs_viewed_today = v_new_jobs_today,
        jobs_viewed_date = v_today,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.user_streaks
    SET jobs_viewed_today = v_new_jobs_today,
        jobs_viewed_date = v_today,
        updated_at = now()
    WHERE user_id = p_user_id;
    v_new_count := v_streak.current_streak;
    -- Auto-reset if missed a day
    IF v_streak.last_active_date IS NOT NULL AND v_streak.last_active_date < v_today - 1 THEN
      UPDATE public.user_streaks
      SET current_streak = 0, updated_at = now()
      WHERE user_id = p_user_id;
      v_new_count := 0;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'current_streak', v_new_count,
    'jobs_viewed_today', v_new_jobs_today,
    'last_active_date', v_streak.last_active_date
  );
END;
$$;

-- 5. RPC: record a visit and return prior timestamp + new jobs count
CREATE OR REPLACE FUNCTION public.record_user_visit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev timestamptz;
  v_new_jobs integer;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT last_visit_at INTO v_prev FROM public.user_visits WHERE user_id = p_user_id;

  INSERT INTO public.user_visits (user_id, last_visit_at, previous_visit_at)
  VALUES (p_user_id, now(), v_prev)
  ON CONFLICT (user_id) DO UPDATE
    SET previous_visit_at = public.user_visits.last_visit_at,
        last_visit_at = now(),
        updated_at = now();

  -- Count published, non-archived jobs since previous visit
  IF v_prev IS NULL THEN
    v_new_jobs := 0;
  ELSE
    SELECT COUNT(*)::int INTO v_new_jobs
    FROM public.jobs
    WHERE is_published = true
      AND is_archived = false
      AND deleted_at IS NULL
      AND posted_date > v_prev;
  END IF;

  RETURN jsonb_build_object(
    'previous_visit_at', v_prev,
    'new_jobs_count', COALESCE(v_new_jobs, 0)
  );
END;
$$;

-- 6. Profile completeness helper (used by frontend banner)
CREATE OR REPLACE FUNCTION public.profile_completeness(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_score integer := 0;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT resume_url, skills, experience_years, work_authorization
    INTO v_profile FROM public.profiles WHERE user_id = p_user_id;

  IF v_profile.resume_url IS NOT NULL AND v_profile.resume_url <> '' THEN
    v_score := v_score + 25;
  ELSE
    v_missing := array_append(v_missing, 'resume');
  END IF;

  IF v_profile.skills IS NOT NULL AND array_length(v_profile.skills, 1) >= 3 THEN
    v_score := v_score + 25;
  ELSE
    v_missing := array_append(v_missing, 'skills');
  END IF;

  IF v_profile.experience_years IS NOT NULL THEN
    v_score := v_score + 25;
  ELSE
    v_missing := array_append(v_missing, 'experience_years');
  END IF;

  IF v_profile.work_authorization IS NOT NULL AND v_profile.work_authorization <> '' THEN
    v_score := v_score + 25;
  ELSE
    v_missing := array_append(v_missing, 'work_authorization');
  END IF;

  RETURN jsonb_build_object('percent', v_score, 'missing', v_missing);
END;
$$;

-- 7. Backfill email prefs for any existing user missing one
INSERT INTO public.email_notification_preferences (user_id)
SELECT p.user_id FROM public.profiles p
LEFT JOIN public.email_notification_preferences e ON e.user_id = p.user_id
WHERE e.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;