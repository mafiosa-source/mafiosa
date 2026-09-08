CREATE TABLE IF NOT EXISTS public.recruitment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  sponsor_id uuid REFERENCES public.sponsors(id) ON DELETE SET NULL,
  requested_by text,
  requested_by_user uuid,
  amount numeric,
  reason text,
  status text NOT NULL DEFAULT 'Pending',
  settlement_status text,
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  auto_created boolean NOT NULL DEFAULT false,
  decided_by text,
  decided_at timestamptz,
  decision_note text,
  seen_by_requester boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recruitment_requests_status_idx ON public.recruitment_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS recruitment_requests_candidate_idx ON public.recruitment_requests (candidate_id);
GRANT SELECT, INSERT, UPDATE ON public.recruitment_requests TO authenticated;
GRANT ALL ON public.recruitment_requests TO service_role;
ALTER TABLE public.recruitment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read requests" ON public.recruitment_requests FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
CREATE POLICY "Members create requests" ON public.recruitment_requests FOR INSERT TO authenticated WITH CHECK (public.is_app_member(auth.uid()));
CREATE POLICY "Admins decide requests" ON public.recruitment_requests FOR UPDATE TO authenticated USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
CREATE POLICY "Requester marks seen" ON public.recruitment_requests FOR UPDATE TO authenticated USING (requested_by_user = auth.uid()) WITH CHECK (requested_by_user = auth.uid());
CREATE TRIGGER update_recruitment_requests_updated_at BEFORE UPDATE ON public.recruitment_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();