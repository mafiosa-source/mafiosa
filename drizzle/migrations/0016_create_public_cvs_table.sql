CREATE TABLE IF NOT EXISTS public.cvs (
  id text PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  position text NOT NULL,
  experience text,
  cv_url text,
  is_available boolean NOT NULL DEFAULT true,
  phone_override text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cvs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cvs TO authenticated;
GRANT ALL ON public.cvs TO service_role;

ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read available cvs" ON public.cvs;
CREATE POLICY "Public can read available cvs"
  ON public.cvs FOR SELECT TO anon
  USING (is_available = true);

DROP POLICY IF EXISTS "Members can read all cvs" ON public.cvs;
CREATE POLICY "Members can read all cvs"
  ON public.cvs FOR SELECT TO authenticated
  USING (public.is_app_member(auth.uid()));

DROP POLICY IF EXISTS "Admins manage cvs insert" ON public.cvs;
CREATE POLICY "Admins manage cvs insert"
  ON public.cvs FOR INSERT TO authenticated
  WITH CHECK (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage cvs update" ON public.cvs;
CREATE POLICY "Admins manage cvs update"
  ON public.cvs FOR UPDATE TO authenticated
  USING (public.is_app_admin(auth.uid()))
  WITH CHECK (public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage cvs delete" ON public.cvs;
CREATE POLICY "Admins manage cvs delete"
  ON public.cvs FOR DELETE TO authenticated
  USING (public.is_app_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS cvs_available_idx ON public.cvs (is_available, country);