CREATE OR REPLACE FUNCTION public.profile_completeness(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_missing text[] := ARRAY[]::text[];
  v_total int := 4;
  v_done int := 0;
  v_has_location boolean;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('percent', 0, 'missing', to_jsonb(ARRAY['full_name','phone','location','resume']::text[]));
  END IF;

  -- Full name
  IF v_profile.full_name IS NOT NULL AND length(trim(v_profile.full_name)) > 0 THEN
    v_done := v_done + 1;
  ELSE
    v_missing := array_append(v_missing, 'full_name');
  END IF;

  -- Phone
  IF v_profile.phone IS NOT NULL AND length(trim(v_profile.phone)) > 0 THEN
    v_done := v_done + 1;
  ELSE
    v_missing := array_append(v_missing, 'phone');
  END IF;

  -- Location: combined `location` OR (city + state/country)
  v_has_location := (v_profile.location IS NOT NULL AND length(trim(v_profile.location)) > 0)
    OR (
      v_profile.city IS NOT NULL AND length(trim(v_profile.city)) > 0
      AND (
        (v_profile.state IS NOT NULL AND length(trim(v_profile.state)) > 0)
        OR (v_profile.country IS NOT NULL AND length(trim(v_profile.country)) > 0)
      )
    );
  IF v_has_location THEN
    v_done := v_done + 1;
  ELSE
    v_missing := array_append(v_missing, 'location');
  END IF;

  -- Resume
  IF v_profile.resume_url IS NOT NULL AND length(trim(v_profile.resume_url)) > 0 THEN
    v_done := v_done + 1;
  ELSE
    v_missing := array_append(v_missing, 'resume');
  END IF;

  RETURN jsonb_build_object(
    'percent', (v_done * 100) / v_total,
    'missing', to_jsonb(v_missing)
  );
END;
$$;