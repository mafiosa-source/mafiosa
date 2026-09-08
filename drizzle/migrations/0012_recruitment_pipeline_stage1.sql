-- Stage 1: sponsors, recruitment pipeline on candidates, expense-folder tags on transactions. Additive only.

CREATE TABLE IF NOT EXISTS public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  name_key text NOT NULL,
  qid text,
  phone text,
  address text,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sponsors_qid_unique ON public.sponsors (qid) WHERE qid IS NOT NULL AND trim(qid) <> '';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read sponsors" ON public.sponsors FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
CREATE POLICY "Members insert sponsors" ON public.sponsors FOR INSERT TO authenticated WITH CHECK (public.is_app_member(auth.uid()));
CREATE POLICY "Members update sponsors" ON public.sponsors FOR UPDATE TO authenticated USING (public.is_app_member(auth.uid())) WITH CHECK (public.is_app_member(auth.uid()));
CREATE POLICY "Admins delete sponsors" ON public.sponsors FOR DELETE TO authenticated USING (public.is_app_admin(auth.uid()));
CREATE TRIGGER update_sponsors_updated_at BEFORE UPDATE ON public.sponsors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pipeline fields on candidates (all nullable / defaulted)
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS sponsor_id uuid REFERENCES public.sponsors(id),
  ADD COLUMN IF NOT EXISTS pipeline_status text NOT NULL DEFAULT 'CV_UPLOADED',
  ADD COLUMN IF NOT EXISTS experience_abroad boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS polo_pickup_date date,
  ADD COLUMN IF NOT EXISTS agreed_remittance numeric,
  ADD COLUMN IF NOT EXISTS pipeline_notes text,
  ADD COLUMN IF NOT EXISTS selected_at timestamptz,
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS candidates_passport_unique ON public.candidates (upper(trim(passport_number))) WHERE passport_number IS NOT NULL AND trim(passport_number) <> '';

-- Status history per housemaid
CREATE TABLE IF NOT EXISTS public.candidate_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  changed_by text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS candidate_status_history_candidate_idx ON public.candidate_status_history (candidate_id, changed_at);
GRANT SELECT, INSERT ON public.candidate_status_history TO authenticated;
GRANT ALL ON public.candidate_status_history TO service_role;
ALTER TABLE public.candidate_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read status history" ON public.candidate_status_history FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
CREATE POLICY "Members insert status history" ON public.candidate_status_history FOR INSERT TO authenticated WITH CHECK (public.is_app_member(auth.uid()));

-- Expense-folder tags on the master ledger (nullable, existing rows untouched)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS candidate_id uuid,
  ADD COLUMN IF NOT EXISTS expense_kind text,
  ADD COLUMN IF NOT EXISTS settlement_status text;
CREATE INDEX IF NOT EXISTS transactions_candidate_id_idx ON public.transactions (candidate_id) WHERE candidate_id IS NOT NULL;