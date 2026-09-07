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
  IF v_agent_code IS NULL THEN
    SELECT coalesce(max((regexp_match(candidate_code, '([0-9]+)$'))[1]::int), 0) + 1
      INTO v_sequence FROM public.candidates WHERE country_code = v_country;
    RETURN v_country || '-' || lpad(coalesce(v_sequence,1)::text, 3, '0');
  END IF;
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
GRANT ALL ON public.agents TO service_role;
GRANT ALL ON public.candidates TO service_role;
GRANT ALL ON public.candidate_code_counters TO service_role;
GRANT EXECUTE ON FUNCTION public.get_next_candidate_code(text, uuid) TO authenticated;
REVOKE ALL ON public.candidate_code_counters FROM anon, authenticated;

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

DROP POLICY IF EXISTS "Members read candidate files" ON storage.objects;
CREATE POLICY "Members read candidate files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'candidate-files');
DROP POLICY IF EXISTS "Members upload candidate files" ON storage.objects;
CREATE POLICY "Members upload candidate files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'candidate-files');
DROP POLICY IF EXISTS "Members update candidate files" ON storage.objects;
CREATE POLICY "Members update candidate files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'candidate-files') WITH CHECK (bucket_id = 'candidate-files');
DROP POLICY IF EXISTS "Members delete candidate files" ON storage.objects;
CREATE POLICY "Members delete candidate files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'candidate-files');