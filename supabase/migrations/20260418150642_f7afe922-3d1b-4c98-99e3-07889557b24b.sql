-- Helper to read a vault secret (founder-only)
CREATE OR REPLACE FUNCTION public.read_vault_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  secret_value text;
BEGIN
  IF NOT public.is_founder() THEN
    RAISE EXCEPTION 'Founder access required';
  END IF;
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  RETURN secret_value;
END;
$$;

-- Helper to store a vault secret (founder-only)
CREATE OR REPLACE FUNCTION public.store_vault_secret(secret_name text, secret_value text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  IF NOT public.is_founder() THEN
    RAISE EXCEPTION 'Founder access required';
  END IF;
  SELECT id INTO existing_id FROM vault.secrets WHERE name = secret_name LIMIT 1;
  IF existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(existing_id, secret_value);
    RETURN existing_id;
  ELSE
    SELECT vault.create_secret(secret_value, secret_name) INTO new_id;
    RETURN new_id;
  END IF;
END;
$$;