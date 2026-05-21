-- Create table for founder-managed hiring graph data
CREATE TABLE public.hiring_graph_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL,
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.hiring_graph_data ENABLE ROW LEVEL SECURITY;

-- Everyone can view active graph data (public display on dashboard)
CREATE POLICY "Anyone can view active hiring graph data"
ON public.hiring_graph_data
FOR SELECT
USING (is_active = true);

-- Only founders can view all data (including inactive)
CREATE POLICY "Founders can view all hiring graph data"
ON public.hiring_graph_data
FOR SELECT
USING (public.is_founder());

-- Only founders can insert
CREATE POLICY "Founders can insert hiring graph data"
ON public.hiring_graph_data
FOR INSERT
WITH CHECK (public.is_founder());

-- Only founders can update
CREATE POLICY "Founders can update hiring graph data"
ON public.hiring_graph_data
FOR UPDATE
USING (public.is_founder());

-- Only founders can delete
CREATE POLICY "Founders can delete hiring graph data"
ON public.hiring_graph_data
FOR DELETE
USING (public.is_founder());

-- Add trigger for updated_at
CREATE TRIGGER update_hiring_graph_data_updated_at
BEFORE UPDATE ON public.hiring_graph_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for sorting
CREATE INDEX idx_hiring_graph_data_sort ON public.hiring_graph_data(sort_order, is_active);