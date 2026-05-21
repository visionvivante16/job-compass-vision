
-- Table to track daily LinkedIn message usage per user
CREATE TABLE public.linkedin_message_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

ALTER TABLE public.linkedin_message_usage ENABLE ROW LEVEL SECURITY;

-- Users can only read their own usage
CREATE POLICY "Users can view own usage"
  ON public.linkedin_message_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Server-side function to check and increment usage (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.check_and_increment_linkedin_usage(p_user_id UUID, p_daily_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_premium BOOLEAN;
  v_current_count INTEGER;
BEGIN
  -- Check premium status from profiles
  SELECT is_premium INTO v_is_premium
  FROM public.profiles
  WHERE user_id = p_user_id;

  -- Premium users always allowed
  IF v_is_premium = true THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', -1, 'is_premium', true);
  END IF;

  -- Get or create today's usage row
  INSERT INTO public.linkedin_message_usage (user_id, usage_date, usage_count)
  VALUES (p_user_id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  -- Lock and check current count
  SELECT usage_count INTO v_current_count
  FROM public.linkedin_message_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
  FOR UPDATE;

  IF v_current_count >= p_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'is_premium', false);
  END IF;

  -- Increment
  UPDATE public.linkedin_message_usage
  SET usage_count = usage_count + 1, updated_at = now()
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_daily_limit - v_current_count - 1,
    'is_premium', false
  );
END;
$$;
