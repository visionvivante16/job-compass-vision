-- Add dedupe column on profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS feedback_given_at TIMESTAMPTZ;

-- Create feature_feedback table
CREATE TABLE IF NOT EXISTS public.feature_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trigger_source TEXT NOT NULL CHECK (trigger_source IN ('apply', 'ats', 'cover_letter')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.feature_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON public.feature_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON public.feature_feedback
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_feature_feedback_user ON public.feature_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_feedback_created ON public.feature_feedback(created_at DESC);