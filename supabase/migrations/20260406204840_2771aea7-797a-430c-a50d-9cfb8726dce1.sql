
CREATE TABLE public.failed_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  customer_name TEXT,
  stripe_event_id TEXT,
  event_type TEXT NOT NULL,
  amount INTEGER,
  currency TEXT DEFAULT 'usd',
  failure_reason TEXT,
  retry_link TEXT,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.failed_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view failed payments" ON public.failed_payments
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Service role can insert failed payments" ON public.failed_payments
  FOR INSERT WITH CHECK (true);
