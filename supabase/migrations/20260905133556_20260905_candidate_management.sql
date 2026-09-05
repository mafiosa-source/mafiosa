/*
# Add CV / Candidate Management module (Phase 2, additive only)

1. New Tables
- `public.agents` — recruitment agents keyed by country with a unique agent_code (AG01–AG10).
- `public.candidates` — domestic-worker CV records: photos, passport, skills, assignment, status, uploader.
- `public.candidate_code_counters` — per-country+agent sequence counter for unique code generation.

2. Code generation
- `public.get_next_candidate_code(country_code, agent_id)` atomically returns COUNTRY-AGENT-NNN (e.g. KE-AG01-001).
- A BEFORE INSERT trigger auto-assigns the code so the frontend never sends one.

3. Security
- RLS enabled on every new table. This is an internal shared workspace: all authenticated ERP members can read and manage the candidate pool (same pattern as the existing finance tables).
- `uploaded_by_user_id` defaults to `auth.uid()` and is revoked from client INSERT/UPDATE so it cannot be forged.
- A private `candidate-files` storage bucket (10 MB, JPEG/PNG/WebP/PDF only) with authenticated-member policies.

4. Seed data
- Inserts common recruitment-country agents idempotently. No existing table, row, or policy is touched.
*/

CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  agent_code text NOT NULL UNIQUE,
  country text NOT NULL,
  phone text,
  contact_person text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.candidate_code_counters (
  country_code text NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  next_sequence integer NOT NULL DEFAULT 1,
  PRIMARY KEY (country_code, agent_id)
);

CREATE TABLE IF NOT EXISTS public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_code text UNIQUE,
  full_name text NOT NULL,
  photo_url text NOT NULL,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  nationality text NOT NULL,
  country_code text NOT NULL,
  age integer,
  date_of_birth date,
  position text NOT NULL DEFAULT 'Housemaid',
  experience_years numeric(5,2) NOT NULL DEFAULT 0,
  languages text[] NOT NULL DEFAULT '{}',
  availability_status text NOT NULL DEFAULT 'Available' CHECK (availability_status IN ('Available','Reserved','Unavailable')),
  marital_status text,
  children_count integer NOT NULL DEFAULT 0,
  height text,
  weight text,
  religion text,
  education text,
  skills text[] NOT NULL DEFAULT '{}',
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  uploaded_by_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  passport_number text,
  passport_issue_date date,
  passport_expiry_date date,
  passport_scan_url text,
  notes text,
  status text NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Reserved','Deployed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS candidates_country_code_idx ON public.candidates(country_code);
CREATE INDEX IF NOT EXISTS candidates_agent_id_idx ON public.candidates(agent_id);
CREATE INDEX IF NOT EXISTS candidates_status_idx ON public.candidates(status);
CREATE INDEX IF NOT EXISTS candidates_name_idx ON public.candidates(lower(full_name));

CREATE OR REPLACE FUNCTION public.get_next_candidate_code(p_country_code text, p_agent_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country text := upper(trim(p_country_code));
  v_agent_code text;
  v_sequence integer;
BEGIN
  IF v_country !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'Invalid country code'; END IF;
  SELECT agent_code INTO v_agent_code FROM public.agents WHERE id = p_agent_id;
  IF v_agent_code IS NULL THEN RAISE EXCEPTION 'Agent not found'; END IF;
  INSERT INTO public.candidate_code_counters(country_code, agent_id)
  VALUES (v_country, p_agent_id)
  ON CONFLICT (country_code, agent_id) DO NOTHING;
  SELECT next_sequence INTO v_sequence
  FROM public.candidate_code_counters
  WHERE country_code = v_country AND agent_id = p_agent_id
  FOR UPDATE;
  UPDATE public.candidate_code_counters
  SET next_sequence = v_sequence + 1
  WHERE country_code = v_country AND agent_id = p_agent_id;
  RETURN v_country || '-' || v_agent_code || '-' || lpad(v_sequence::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_candidate_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.candidate_code IS NULL OR trim(NEW.candidate_code) = '' THEN
    NEW.candidate_code := public.get_next_candidate_code(NEW.country_code, NEW.agent_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidates_assign_code ON public.candidates;
CREATE TRIGGER candidates_assign_code
BEFORE INSERT ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.assign_candidate_code();

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_code_counters ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_candidate_code(text, uuid) TO authenticated;
REVOKE ALL ON public.candidate_code_counters FROM anon, authenticated;

-- Shared internal workspace: all authenticated ERP members manage the candidate pool.
DROP POLICY IF EXISTS "Members read agents" ON public.agents;
CREATE POLICY "Members read agents" ON public.agents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Members insert agents" ON public.agents;
CREATE POLICY "Members insert agents" ON public.agents FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Members update agents" ON public.agents;
CREATE POLICY "Members update agents" ON public.agents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Members delete agents" ON public.agents;
CREATE POLICY "Members delete agents" ON public.agents FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Members read candidates" ON public.candidates;
CREATE POLICY "Members read candidates" ON public.candidates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Members insert candidates" ON public.candidates;
CREATE POLICY "Members insert candidates" ON public.candidates FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Members update candidates" ON public.candidates;
CREATE POLICY "Members update candidates" ON public.candidates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Members delete candidates" ON public.candidates;
CREATE POLICY "Members delete candidates" ON public.candidates FOR DELETE TO authenticated USING (true);

-- uploaded_by_user_id and candidate_code are server-managed (default + trigger); revoke client access.
REVOKE INSERT (uploaded_by_user_id, candidate_code) ON public.candidates FROM authenticated;
REVOKE UPDATE (uploaded_by_user_id, candidate_code) ON public.candidates FROM authenticated;

INSERT INTO public.agents (name, agent_code, country, contact_person)
VALUES
  ('Kenya Recruitment Desk', 'AG01', 'Kenya', 'Kenya Desk'),
  ('Uganda Recruitment Desk', 'AG02', 'Uganda', 'Uganda Desk'),
  ('Ethiopia Recruitment Desk', 'AG03', 'Ethiopia', 'Ethiopia Desk'),
  ('Nigeria Recruitment Desk', 'AG04', 'Nigeria', 'Nigeria Desk'),
  ('Tanzania Recruitment Desk', 'AG05', 'Tanzania', 'Tanzania Desk'),
  ('Rwanda Recruitment Desk', 'AG06', 'Rwanda', 'Rwanda Desk'),
  ('Philippines Recruitment Desk', 'AG07', 'Philippines', 'Philippines Desk'),
  ('India Recruitment Desk', 'AG08', 'India', 'India Desk'),
  ('Sri Lanka Recruitment Desk', 'AG09', 'Sri Lanka', 'Sri Lanka Desk'),
  ('Nepal Recruitment Desk', 'AG10', 'Nepal', 'Nepal Desk')
ON CONFLICT (agent_code) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('candidate-files', 'candidate-files', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = 10485760, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf'];

DROP POLICY IF EXISTS "Members read candidate files" ON storage.objects;
CREATE POLICY "Members read candidate files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'candidate-files');
DROP POLICY IF EXISTS "Members upload candidate files" ON storage.objects;
CREATE POLICY "Members upload candidate files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'candidate-files');
DROP POLICY IF EXISTS "Members update candidate files" ON storage.objects;
CREATE POLICY "Members update candidate files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'candidate-files') WITH CHECK (bucket_id = 'candidate-files');
DROP POLICY IF EXISTS "Members delete candidate files" ON storage.objects;
CREATE POLICY "Members delete candidate files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'candidate-files');