
-- Table to track processed Stripe events for idempotency
CREATE TABLE public.processed_stripe_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS (only service role should access this)
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;

-- No public access - only service role key (used by edge functions) can read/write
CREATE POLICY "Service role only"
ON public.processed_stripe_events
FOR ALL
USING (false);
