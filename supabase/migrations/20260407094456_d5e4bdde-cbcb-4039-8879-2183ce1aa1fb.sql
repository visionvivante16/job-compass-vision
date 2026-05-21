
CREATE TABLE public.role_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  requested_role TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own requests
CREATE POLICY "Users can insert own role requests"
  ON public.role_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own role requests"
  ON public.role_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins/founders can view all requests
CREATE POLICY "Admins can view all role requests"
  ON public.role_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());
