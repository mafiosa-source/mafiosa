-- ============================================================
-- Additive multi-user layer. No existing table, column or row is
-- modified, renamed or removed.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  name text NOT NULL,
  name_key text NOT NULL UNIQUE,
  login_email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'user',
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  full_access boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  must_change_password boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users TO authenticated;
GRANT ALL ON public.app_users TO service_role;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid recursive policy evaluation).
CREATE OR REPLACE FUNCTION public.is_app_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' AND status = 'active'
       FROM public.app_users WHERE auth_user_id = _uid),
    false)
  OR COALESCE((SELECT email FROM auth.users WHERE id = _uid), '') = 'm.aconsultingqatar@gmail.com'
$$;

CREATE OR REPLACE FUNCTION public.is_app_member(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_app_admin(_uid)
    OR EXISTS (SELECT 1 FROM public.app_users
                WHERE auth_user_id = _uid AND status = 'active')
$$;

DO $$ BEGIN
  CREATE POLICY "Members read app users" ON public.app_users
    FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin manages app users" ON public.app_users
    FOR ALL TO authenticated
    USING (public.is_app_admin(auth.uid()))
    WITH CHECK (public.is_app_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER update_app_users_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Shared workspace: approved members reach the same ledger ----------
DO $$ BEGIN
  CREATE POLICY "Members share the ledger" ON public.transactions
    FOR ALL TO authenticated
    USING (public.is_app_member(auth.uid()))
    WITH CHECK (public.is_app_member(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members share opening balances" ON public.opening_balances
    FOR ALL TO authenticated
    USING (public.is_app_member(auth.uid()))
    WITH CHECK (public.is_app_member(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members share wallet targets" ON public.wallet_targets
    FOR ALL TO authenticated
    USING (public.is_app_member(auth.uid()))
    WITH CHECK (public.is_app_member(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members share payables" ON public.payables
    FOR ALL TO authenticated
    USING (public.is_app_member(auth.uid()))
    WITH CHECK (public.is_app_member(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members share payable payments" ON public.payable_payments
    FOR ALL TO authenticated
    USING (public.is_app_member(auth.uid()))
    WITH CHECK (public.is_app_member(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Members share month closings" ON public.month_closings
    FOR ALL TO authenticated
    USING (public.is_app_member(auth.uid()))
    WITH CHECK (public.is_app_member(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Soft delete: financial records are never erased ----------
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_by text;

CREATE INDEX IF NOT EXISTS transactions_deleted_at_idx
  ON public.transactions (deleted_at);

-- ---------- Audit trail: admin sees every member's activity ----------
ALTER TABLE public.action_audit ADD COLUMN IF NOT EXISTS module text;
ALTER TABLE public.action_audit ADD COLUMN IF NOT EXISTS actor_name text;

DO $$ BEGIN
  CREATE POLICY "Admin reads all audit entries" ON public.action_audit
    FOR SELECT TO authenticated USING (public.is_app_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
