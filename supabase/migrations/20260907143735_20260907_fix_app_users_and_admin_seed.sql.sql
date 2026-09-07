/*
# Fix app_users table and seed admin account

## What this does

1. Alters the existing `app_users` table (which only had id, name, role, is_approved)
   to add all columns needed by the ERP auth system: auth_user_id, login_email,
   name_key, permissions, full_access, status, must_change_password, temp_password,
   temp_password_set_at, last_login_at, created_at.
2. Enables RLS and creates proper admin-only CRUD policies.
3. Creates the `is_app_admin` RPC function.
4. Seeds the admin row linking to the existing auth user m.aconsultingqatar@gmail.com.

## Security
- RLS enabled on app_users.
- SELECT: all authenticated users can read (shared workspace).
- INSERT/UPDATE/DELETE: only admins.
- is_app_admin function is SECURITY DEFINER, execute granted to authenticated only.
*/

-- ============================================================
-- 1. Add missing columns to app_users
-- ============================================================
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS auth_user_id uuid;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS name_key text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS login_email text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS full_access boolean NOT NULL DEFAULT false;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS temp_password text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS temp_password_set_at timestamptz;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS app_users_auth_user_id_key ON public.app_users (auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_login_email_key ON public.app_users (lower(login_email)) WHERE login_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_name_key_key ON public.app_users (name_key) WHERE name_key IS NOT NULL;

-- ============================================================
-- 2. Enable RLS and create policies
-- ============================================================
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.app_users;
DROP POLICY IF EXISTS "app_users_select_authenticated" ON public.app_users;
CREATE POLICY "app_users_select_authenticated" ON public.app_users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "app_users_insert_admin" ON public.app_users;
CREATE POLICY "app_users_insert_admin" ON public.app_users
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_users au WHERE au.auth_user_id = auth.uid() AND au.role = 'admin')
  );

DROP POLICY IF EXISTS "app_users_update_admin" ON public.app_users;
CREATE POLICY "app_users_update_admin" ON public.app_users
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.app_users au WHERE au.auth_user_id = auth.uid() AND au.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_users au WHERE au.auth_user_id = auth.uid() AND au.role = 'admin')
  );

DROP POLICY IF EXISTS "app_users_delete_admin" ON public.app_users;
CREATE POLICY "app_users_delete_admin" ON public.app_users
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.app_users au WHERE au.auth_user_id = auth.uid() AND au.role = 'admin')
  );

-- ============================================================
-- 3. is_app_admin RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_app_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT au.role = 'admin' OR au.full_access = true
     FROM public.app_users au
     WHERE au.auth_user_id = _uid),
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated;

-- ============================================================
-- 4. Seed admin row
-- ============================================================
DO $$
DECLARE
  v_auth_id uuid;
  v_exists boolean;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE lower(email) = 'm.aconsultingqatar@gmail.com';
  IF v_auth_id IS NULL THEN
    RAISE NOTICE 'Auth user not found — cannot seed admin row';
    RETURN;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.app_users WHERE auth_user_id = v_auth_id) INTO v_exists;
  IF NOT v_exists THEN
    INSERT INTO public.app_users (
      auth_user_id, name, name_key, login_email, role, permissions,
      full_access, status, must_change_password, is_approved
    ) VALUES (
      v_auth_id,
      'Super Admin',
      'super admin',
      'm.aconsultingqatar@gmail.com',
      'admin',
      '[]'::jsonb,
      true,
      'active',
      false,
      true
    );
    RAISE NOTICE 'Admin row seeded';
  ELSE
    UPDATE public.app_users
    SET role = 'admin', full_access = true, status = 'active', is_approved = true,
        login_email = 'm.aconsultingqatar@gmail.com',
        name_key = 'super admin'
    WHERE auth_user_id = v_auth_id;
    RAISE NOTICE 'Admin row updated';
  END IF;
END $$;
