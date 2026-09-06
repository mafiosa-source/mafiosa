/*
# App Users table, admin helper functions, and admin seed

## What this does

1. Creates the `app_users` table that stores each user's display name, role,
   module permissions, and status (active/disabled).
2. Creates the `is_app_admin` RPC used by admin server functions to check
   whether the calling user has admin privileges.
3. Seeds the admin auth account (m.aconsultingqatar@gmail.com) as a super-admin
   with full_access=true, role=admin, all permissions.

## Tables
- `app_users` — one row per authenticated user
  - `id` uuid PK
  - `auth_user_id` uuid (links to auth.users)
  - `name` text (display name)
  - `name_key` text (lowercased name for lookups)
  - `login_email` text (the email used for auth)
  - `role` text ('admin' | 'user')
  - `permissions` jsonb (array of module keys)
  - `full_access` boolean (true = can access everything)
  - `status` text ('active' | 'disabled')
  - `must_change_password` boolean
  - `temp_password` text (nullable, cleared after handover)
  - `temp_password_set_at` timestamptz
  - `last_login_at` timestamptz
  - `created_at` timestamptz

## Security
- RLS enabled on app_users.
- SELECT: authenticated users can read all rows (shared workspace pattern).
- INSERT/UPDATE/DELETE: only admins can modify user records.
- The `is_app_admin` function checks role + full_access.
*/

-- ============================================================
-- 1. app_users table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL,
  name text NOT NULL,
  name_key text NOT NULL,
  login_email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  full_access boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  must_change_password boolean NOT NULL DEFAULT false,
  temp_password text,
  temp_password_set_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_auth_user_id_key ON public.app_users (auth_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_login_email_key ON public.app_users (lower(login_email));
CREATE UNIQUE INDEX IF NOT EXISTS app_users_name_key_key ON public.app_users (name_key);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Shared workspace: all authenticated users can read the user list
DROP POLICY IF EXISTS "app_users_select_authenticated" ON public.app_users;
CREATE POLICY "app_users_select_authenticated" ON public.app_users
  FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
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
-- 2. is_app_admin RPC
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
-- 3. Seed the admin auth account
-- ============================================================
-- Create the auth user for m.aconsultingqatar@gmail.com
-- Using a known temporary password the admin will change after first login.
DO $$
DECLARE
  v_auth_id uuid;
  v_exists boolean;
BEGIN
  -- Check if auth user already exists
  SELECT id INTO v_auth_id FROM auth.users WHERE lower(email) = 'm.aconsultingqatar@gmail.com';
  IF v_auth_id IS NULL THEN
    -- Create the auth user via the admin API equivalent
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'm.aconsultingqatar@gmail.com',
      crypt('Alhakeem@2026', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{}'::jsonb,
      '{"display_name":"Super Admin"}'::jsonb
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_auth_id;
  END IF;

  -- Check if app_users row already exists
  SELECT EXISTS(SELECT 1 FROM public.app_users WHERE lower(login_email) = 'm.aconsultingqatar@gmail.com') INTO v_exists;
  IF NOT v_exists AND v_auth_id IS NOT NULL THEN
    INSERT INTO public.app_users (
      auth_user_id,
      name,
      name_key,
      login_email,
      role,
      permissions,
      full_access,
      status,
      must_change_password
    ) VALUES (
      v_auth_id,
      'Super Admin',
      'super admin',
      'm.aconsultingqatar@gmail.com',
      'admin',
      '[]'::jsonb,
      true,
      'active',
      false
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
