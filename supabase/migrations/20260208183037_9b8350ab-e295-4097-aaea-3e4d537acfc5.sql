-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  screenshot_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  admin_reply text,
  replied_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can create their own tickets
CREATE POLICY "Users can create their own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
USING (public.is_admin());

-- Admins can update tickets (reply, change status)
CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
USING (public.is_admin());

-- Create storage bucket for support screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-screenshots', 'support-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for support screenshots
CREATE POLICY "Users can upload support screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'support-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own support screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all support screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-screenshots' 
  AND public.is_admin()
);

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();