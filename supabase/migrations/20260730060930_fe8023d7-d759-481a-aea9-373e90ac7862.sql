CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  date DATE NOT NULL,
  type TEXT NOT NULL,
  voucher_number TEXT,
  company TEXT,
  classification TEXT,
  candidate TEXT,
  sponsor TEXT,
  passport TEXT,
  purpose TEXT,
  purpose_category TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  current_location TEXT,
  status TEXT NOT NULL DEFAULT 'Completed',
  description TEXT,
  reference_number TEXT,
  attachment TEXT,
  card_category TEXT,
  driver TEXT,
  vehicle TEXT,
  plate_number TEXT,
  station TEXT,
  km_before NUMERIC,
  km_after NUMERIC,
  parent_txn_id UUID,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own transactions"
  ON public.transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX transactions_user_date_idx ON public.transactions (user_id, date DESC);

CREATE TABLE public.opening_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  wallet TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, wallet)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opening_balances TO authenticated;
GRANT ALL ON public.opening_balances TO service_role;

ALTER TABLE public.opening_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own opening balances"
  ON public.opening_balances FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opening_balances_updated_at BEFORE UPDATE ON public.opening_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();