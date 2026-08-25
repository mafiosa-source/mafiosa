CREATE TABLE public.action_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  label text,
  before_data jsonb,
  after_data jsonb,
  actor text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.action_audit TO authenticated;
GRANT ALL ON public.action_audit TO service_role;

ALTER TABLE public.action_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own audit entries" ON public.action_audit
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owner writes own audit entries" ON public.action_audit
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX action_audit_created_at_idx ON public.action_audit (user_id, created_at DESC);