
CREATE TABLE public.checkout_recovery_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_checkout_recovery_email ON public.checkout_recovery_emails (email) WHERE payment_completed = false;

ALTER TABLE public.checkout_recovery_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view recovery emails" ON public.checkout_recovery_emails FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Service can insert recovery emails" ON public.checkout_recovery_emails FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update recovery emails" ON public.checkout_recovery_emails FOR UPDATE USING (true);
