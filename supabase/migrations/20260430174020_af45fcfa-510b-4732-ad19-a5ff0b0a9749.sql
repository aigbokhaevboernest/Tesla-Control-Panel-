REVOKE ALL ON FUNCTION public.increment_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrement_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_balance(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_balance(uuid, numeric) TO service_role;