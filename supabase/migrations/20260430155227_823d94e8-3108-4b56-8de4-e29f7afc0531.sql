GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_current_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

REVOKE ALL ON FUNCTION public.is_current_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_admin() TO authenticated, service_role;