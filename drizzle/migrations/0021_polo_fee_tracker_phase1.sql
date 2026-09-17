-- Additive only: adds one column to candidates and one new table.
-- Nothing is renamed, deleted or reset.

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS is_first_time boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.polo_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL UNIQUE REFERENCES public.candidates(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PAID',
  submitted_date date,
  expected_date date,
  approved_date date,
  rejection_reason text,
  attempt integer NOT NULL DEFAULT 1,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.polo_contracts TO authenticated;
GRANT ALL ON public.polo_contracts TO service_role;

ALTER TABLE public.polo_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read polo contracts" ON public.polo_contracts;
CREATE POLICY "Members read polo contracts" ON public.polo_contracts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Members insert polo contracts" ON public.polo_contracts;
CREATE POLICY "Members insert polo contracts" ON public.polo_contracts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Members update polo contracts" ON public.polo_contracts;
CREATE POLICY "Members update polo contracts" ON public.polo_contracts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Members delete polo contracts" ON public.polo_contracts;
CREATE POLICY "Members delete polo contracts" ON public.polo_contracts FOR DELETE TO authenticated USING (true);

DROP TRIGGER IF EXISTS polo_contracts_updated_at ON public.polo_contracts;
CREATE TRIGGER polo_contracts_updated_at
  BEFORE UPDATE ON public.polo_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();