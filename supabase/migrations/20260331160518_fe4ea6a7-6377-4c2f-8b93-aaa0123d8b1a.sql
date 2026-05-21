
-- Create error_logs table
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type text NOT NULL DEFAULT 'runtime',
  message text NOT NULL,
  stack text,
  page_url text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can insert error logs
CREATE POLICY "Anyone can insert error logs"
  ON public.error_logs FOR INSERT
  TO public
  WITH CHECK (true);

-- Only founders/admins can view error logs
CREATE POLICY "Admins can view error logs"
  ON public.error_logs FOR SELECT
  TO public
  USING (public.is_admin());

-- Only founders can delete error logs
CREATE POLICY "Admins can delete error logs"
  ON public.error_logs FOR DELETE
  TO public
  USING (public.is_founder());

-- Index for fast lookups
CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_user_id ON public.error_logs (user_id);
CREATE INDEX idx_error_logs_error_type ON public.error_logs (error_type);
