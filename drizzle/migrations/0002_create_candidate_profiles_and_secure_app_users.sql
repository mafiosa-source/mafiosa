CREATE TABLE public.candidate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  full_name text NOT NULL,
  name_key text NOT NULL,
  reference_code text,
  photo_url text,
  religion text,
  height text,
  weight text,
  position_applied text NOT NULL DEFAULT 'HOUSEMAID',
  monthly_salary text,
  contract_period text DEFAULT '2 YEARS',
  passport_no text,
  nationality text,
  contact_number text,
  address text,
  date_of_birth date,
  place_of_birth text,
  civil_status text,
  children text,
  english text DEFAULT 'YES',
  arabic text DEFAULT 'NO',
  education text,
  company text,
  sponsor text,
  skills jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_jobs jsonb NOT NULL DEFAULT '[]'::jsonb,
  remarks text,
  created_by text,
  last_edited_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_profiles TO authenticated;
GRANT ALL ON public.candidate_profiles TO service_role;

ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members share candidate profiles" ON public.candidate_profiles
  FOR ALL TO authenticated
  USING (public.is_app_member(auth.uid()))
  WITH CHECK (public.is_app_member(auth.uid()));

CREATE POLICY "Owner manages candidate profiles" ON public.candidate_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_candidate_profiles_updated_at
  BEFORE UPDATE ON public.candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX candidate_profiles_name_key_idx ON public.candidate_profiles (name_key);

-- Security: members must no longer read every user's temporary password / permissions.
DROP POLICY IF EXISTS "Members read app users" ON public.app_users;

CREATE POLICY "Users read their own app user row" ON public.app_users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());