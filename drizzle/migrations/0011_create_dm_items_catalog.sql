CREATE TABLE public.dm_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'OTHER',
  price numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_items TO authenticated;
GRANT ALL ON public.dm_items TO service_role;

ALTER TABLE public.dm_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read dm_items" ON public.dm_items
  FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
CREATE POLICY "Admins insert dm_items" ON public.dm_items
  FOR INSERT TO authenticated WITH CHECK (public.is_app_admin(auth.uid()));
CREATE POLICY "Admins update dm_items" ON public.dm_items
  FOR UPDATE TO authenticated USING (public.is_app_admin(auth.uid()));
CREATE POLICY "Admins delete dm_items" ON public.dm_items
  FOR DELETE TO authenticated USING (public.is_app_admin(auth.uid()));

CREATE TRIGGER update_dm_items_updated_at BEFORE UPDATE ON public.dm_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.dm_sale_items ADD COLUMN IF NOT EXISTS item_code text;
