-- Fix the publish_hiring_graph function to use WHERE clause
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

  -- Delete all existing published data (with WHERE clause to satisfy RLS)
  DELETE FROM public.hiring_graph_published WHERE id IS NOT NULL;

  -- Copy active draft entries to published (max 5, ordered by sort_order)
  INSERT INTO public.hiring_graph_published (role_name, percentage, sort_order, published_by)
  SELECT role_name, percentage, sort_order, auth.uid()
  FROM public.hiring_graph_data
  WHERE is_active = true
  ORDER BY sort_order ASC, created_at ASC
  LIMIT 5;
END;
$$;