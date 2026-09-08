-- Du Monde operations module (additive only; finance tables untouched)

CREATE TABLE public.dm_lpos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  location text NOT NULL,
  notes text,
  total numeric NOT NULL DEFAULT 0,
  attachment_url text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_lpos TO authenticated;
GRANT ALL ON public.dm_lpos TO service_role;
ALTER TABLE public.dm_lpos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage du monde lpos" ON public.dm_lpos FOR ALL TO authenticated
  USING (public.is_app_member(auth.uid())) WITH CHECK (public.is_app_member(auth.uid()));
CREATE TRIGGER update_dm_lpos_updated_at BEFORE UPDATE ON public.dm_lpos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dm_lpo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lpo_id uuid NOT NULL REFERENCES public.dm_lpos(id) ON DELETE CASCADE,
  name text NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  unit text,
  unit_cost numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_lpo_items TO authenticated;
GRANT ALL ON public.dm_lpo_items TO service_role;
ALTER TABLE public.dm_lpo_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage du monde lpo items" ON public.dm_lpo_items FOR ALL TO authenticated
  USING (public.is_app_member(auth.uid())) WITH CHECK (public.is_app_member(auth.uid()));
CREATE INDEX dm_lpo_items_lpo_id_idx ON public.dm_lpo_items(lpo_id);

CREATE TABLE public.dm_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  location text NOT NULL,
  notes text,
  total numeric NOT NULL DEFAULT 0,
  attachment_url text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_sales TO authenticated;
GRANT ALL ON public.dm_sales TO service_role;
ALTER TABLE public.dm_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage du monde sales" ON public.dm_sales FOR ALL TO authenticated
  USING (public.is_app_member(auth.uid())) WITH CHECK (public.is_app_member(auth.uid()));
CREATE TRIGGER update_dm_sales_updated_at BEFORE UPDATE ON public.dm_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dm_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.dm_sales(id) ON DELETE CASCADE,
  name text NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_sale_items TO authenticated;
GRANT ALL ON public.dm_sale_items TO service_role;
ALTER TABLE public.dm_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage du monde sale items" ON public.dm_sale_items FOR ALL TO authenticated
  USING (public.is_app_member(auth.uid())) WITH CHECK (public.is_app_member(auth.uid()));
CREATE INDEX dm_sale_items_sale_id_idx ON public.dm_sale_items(sale_id);

CREATE TABLE public.dm_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  location text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  particulars text,
  amount numeric NOT NULL DEFAULT 0,
  lpo_id uuid REFERENCES public.dm_lpos(id) ON DELETE SET NULL,
  txn_id uuid,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_expenses TO authenticated;
GRANT ALL ON public.dm_expenses TO service_role;
ALTER TABLE public.dm_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage du monde expenses" ON public.dm_expenses FOR ALL TO authenticated
  USING (public.is_app_member(auth.uid())) WITH CHECK (public.is_app_member(auth.uid()));
CREATE TRIGGER update_dm_expenses_updated_at BEFORE UPDATE ON public.dm_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.dm_bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  label text NOT NULL,
  from_date date,
  to_date date,
  attachment_url text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_bank_statements TO authenticated;
GRANT ALL ON public.dm_bank_statements TO service_role;
ALTER TABLE public.dm_bank_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage du monde bank statements" ON public.dm_bank_statements FOR ALL TO authenticated
  USING (public.is_app_member(auth.uid())) WITH CHECK (public.is_app_member(auth.uid()));

CREATE TABLE public.dm_bank_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES public.dm_bank_statements(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  location text,
  direction text NOT NULL DEFAULT 'in',
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_bank_lines TO authenticated;
GRANT ALL ON public.dm_bank_lines TO service_role;
ALTER TABLE public.dm_bank_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage du monde bank lines" ON public.dm_bank_lines FOR ALL TO authenticated
  USING (public.is_app_member(auth.uid())) WITH CHECK (public.is_app_member(auth.uid()));
CREATE INDEX dm_bank_lines_statement_id_idx ON public.dm_bank_lines(statement_id);