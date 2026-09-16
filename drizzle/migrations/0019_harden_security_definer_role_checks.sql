-- Hardening only: no table, column or data changes.
-- The SECURITY DEFINER role checks stay callable by signed-in users (the RLS
-- policies and the admin RPC need them), but they now only answer for the
-- caller's own account. Privileged server roles keep full use.

CREATE OR REPLACE FUNCTION public.is_app_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN current_user IN ('postgres', 'service_role', 'supabase_admin')
      OR _uid = auth.uid()
    THEN COALESCE(
           (SELECT role = 'admin' AND status = 'active'
              FROM public.app_users WHERE auth_user_id = _uid),
           false)
         OR COALESCE((SELECT email FROM auth.users WHERE id = _uid), '') = 'm.aconsultingqatar@gmail.com'
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.is_app_member(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN current_user IN ('postgres', 'service_role', 'supabase_admin')
      OR _uid = auth.uid()
    THEN public.is_app_admin(_uid)
         OR EXISTS (SELECT 1 FROM public.app_users
                     WHERE auth_user_id = _uid AND status = 'active')
    ELSE false
  END
$$;

-- Keep the trigger/code-generation helpers off the signed-in API surface.
REVOKE EXECUTE ON FUNCTION public.get_next_candidate_code(text, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_candidate_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_app_member(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_app_member(uuid) TO authenticated, service_role;
