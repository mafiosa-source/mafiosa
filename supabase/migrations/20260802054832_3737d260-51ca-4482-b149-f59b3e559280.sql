ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payable_by text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payer_name text;

CREATE TABLE IF NOT EXISTS public.month_closings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  year integer NOT NULL,
  month integer NOT NULL,
  status text NOT NULL DEFAULT 'Closed',
  closed_with_exceptions boolean NOT NULL DEFAULT false,
  exceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  closed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.month_closings TO authenticated;
GRANT ALL ON public.month_closings TO service_role;
ALTER TABLE public.month_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages month closings" ON public.month_closings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.payables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  txn_id uuid,
  date date NOT NULL DEFAULT current_date,
  responsible_party text NOT NULL,
  payer_name text,
  card_wallet text NOT NULL,
  company text,
  candidate text,
  sponsor text,
  particulars text,
  amount numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Outstanding',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payables TO authenticated;
GRANT ALL ON public.payables TO service_role;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages payables" ON public.payables FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.payable_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  payable_id uuid NOT NULL REFERENCES public.payables(id),
  txn_id uuid,
  date date NOT NULL DEFAULT current_date,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payable_payments TO authenticated;
GRANT ALL ON public.payable_payments TO service_role;
ALTER TABLE public.payable_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages payable payments" ON public.payable_payments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS payables_user_status_idx ON public.payables (user_id, status);
CREATE INDEX IF NOT EXISTS payable_payments_payable_idx ON public.payable_payments (payable_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_month_closings_updated_at BEFORE UPDATE ON public.month_closings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payables_updated_at BEFORE UPDATE ON public.payables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payable_payments_updated_at BEFORE UPDATE ON public.payable_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();