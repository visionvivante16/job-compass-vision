-- Cron-safe reader for vault secrets (no founder check). Only callable by service_role / postgres so it's not exposed to clients.
CREATE OR REPLACE FUNCTION public.read_vault_secret_internal(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  secret_value text;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  RETURN secret_value;
END;
$function$;

REVOKE ALL ON FUNCTION public.read_vault_secret_internal(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_vault_secret_internal(text) TO postgres, service_role;