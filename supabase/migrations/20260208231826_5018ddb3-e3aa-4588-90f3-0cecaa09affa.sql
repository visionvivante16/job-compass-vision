-- Create table for published hiring graph data (what users see)
CREATE TABLE public.hiring_graph_published (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL,
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.hiring_graph_published ENABLE ROW LEVEL SECURITY;

-- Anyone can view published data
CREATE POLICY "Anyone can view published hiring graph"
ON public.hiring_graph_published
FOR SELECT
USING (true);

-- Only founders can manage published data
CREATE POLICY "Founders can insert published data"
ON public.hiring_graph_published
FOR INSERT
WITH CHECK (is_founder());

CREATE POLICY "Founders can update published data"
ON public.hiring_graph_published
FOR UPDATE
USING (is_founder());

CREATE POLICY "Founders can delete published data"
ON public.hiring_graph_published
FOR DELETE
USING (is_founder());

-- Create function to publish graph (atomic replace)
CREATE OR REPLACE FUNCTION public.publish_hiring_graph()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Must be founder
  IF NOT is_founder() THEN
    RAISE EXCEPTION 'Only founders can publish the hiring graph';
  END IF;

  -- Delete all existing published data
  DELETE FROM public.hiring_graph_published;

  -- Copy active draft entries to published (max 5, ordered by sort_order)
  INSERT INTO public.hiring_graph_published (role_name, percentage, sort_order, published_by)
  SELECT role_name, percentage, sort_order, auth.uid()
  FROM public.hiring_graph_data
  WHERE is_active = true
  ORDER BY sort_order ASC, created_at ASC
  LIMIT 5;
END;
$$;