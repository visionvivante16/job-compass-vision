
-- Table to track manual premium grants by founder/admin
CREATE TABLE public.manual_premium_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  granted_by UUID NOT NULL,
  duration_type TEXT NOT NULL DEFAULT 'lifetime',
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_manual_premium_grants_user ON public.manual_premium_grants(user_id);
CREATE INDEX idx_manual_premium_grants_active ON public.manual_premium_grants(is_active, expires_at);

-- Enable RLS
ALTER TABLE public.manual_premium_grants ENABLE ROW LEVEL SECURITY;

-- Founders can do everything
CREATE POLICY "Founders can manage all grants"
ON public.manual_premium_grants
FOR ALL
USING (public.is_founder())
WITH CHECK (public.is_founder());

-- Users can view their own grants
CREATE POLICY "Users can view own grants"
ON public.manual_premium_grants
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_manual_premium_grants_updated_at
BEFORE UPDATE ON public.manual_premium_grants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
