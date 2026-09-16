-- Corrects the self-only guard: inside a SECURITY DEFINER function current_user
-- is always the owner, so scope on the caller's JWT identity instead.
CREATE OR REPLACE FUNCTION public.is_app_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR _uid = auth.uid()
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
    WHEN auth.uid() IS NULL OR _uid = auth.uid()
    THEN public.is_app_admin(_uid)
         OR EXISTS (SELECT 1 FROM public.app_users
                     WHERE auth_user_id = _uid AND status = 'active')
    ELSE false
  END
$$;
