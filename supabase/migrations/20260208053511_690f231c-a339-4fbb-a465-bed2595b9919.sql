-- Create import_history table to track all Google Sheet imports
CREATE TABLE public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sheet_url TEXT NOT NULL,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view and create import history
CREATE POLICY "Admins can view import history"
  ON public.import_history
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can create import history"
  ON public.import_history
  FOR INSERT
  WITH CHECK (is_admin());

-- Create index for faster queries
CREATE INDEX idx_import_history_user_id ON public.import_history(user_id);
CREATE INDEX idx_import_history_created_at ON public.import_history(created_at DESC);