-- Create market_alerts table for founder announcements
CREATE TABLE public.market_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.market_alerts ENABLE ROW LEVEL SECURITY;

-- Anyone can view active alerts
CREATE POLICY "Anyone can view active alerts"
  ON public.market_alerts
  FOR SELECT
  USING (is_active = true);

-- Founders can view all alerts
CREATE POLICY "Founders can view all alerts"
  ON public.market_alerts
  FOR SELECT
  USING (is_founder());

-- Founders can insert alerts
CREATE POLICY "Founders can insert alerts"
  ON public.market_alerts
  FOR INSERT
  WITH CHECK (is_founder());

-- Founders can update alerts
CREATE POLICY "Founders can update alerts"
  ON public.market_alerts
  FOR UPDATE
  USING (is_founder());

-- Founders can delete alerts
CREATE POLICY "Founders can delete alerts"
  ON public.market_alerts
  FOR DELETE
  USING (is_founder());

-- Index for quick active alert lookup
CREATE INDEX idx_market_alerts_active ON public.market_alerts(is_active, created_at DESC);