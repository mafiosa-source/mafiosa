-- Additive only: new tables for POLO batch scans and bulk transfers to the holding wallet.

CREATE TABLE IF NOT EXISTS public.polo_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('submitted','returned')),
  scan_date date NOT NULL DEFAULT current_date,
  image text,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.polo_batches TO authenticated;
GRANT ALL ON public.polo_batches TO service_role;
ALTER TABLE public.polo_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read polo batches" ON public.polo_batches;
CREATE POLICY "Members read polo batches" ON public.polo_batches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Members insert polo batches" ON public.polo_batches;
CREATE POLICY "Members insert polo batches" ON public.polo_batches FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Members update polo batches" ON public.polo_batches;
CREATE POLICY "Members update polo batches" ON public.polo_batches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Members delete polo batches" ON public.polo_batches;
CREATE POLICY "Members delete polo batches" ON public.polo_batches FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.polo_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.polo_batches(id) ON DELETE SET NULL,
  worker_id uuid REFERENCES public.candidates(id) ON DELETE CASCADE,
  worker_name text NOT NULL,
  reference_code text,
  event_type text NOT NULL CHECK (event_type IN ('submitted','returned','approved')),
  event_date date NOT NULL DEFAULT current_date,
  attempt_no integer NOT NULL DEFAULT 1,
  fee_location text,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS polo_events_worker_idx ON public.polo_events (worker_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.polo_events TO authenticated;
GRANT ALL ON public.polo_events TO service_role;
ALTER TABLE public.polo_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read polo events" ON public.polo_events;
CREATE POLICY "Members read polo events" ON public.polo_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Members insert polo events" ON public.polo_events;
CREATE POLICY "Members insert polo events" ON public.polo_events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Members update polo events" ON public.polo_events;
CREATE POLICY "Members update polo events" ON public.polo_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Members delete polo events" ON public.polo_events;
CREATE POLICY "Members delete polo events" ON public.polo_events FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.bulk_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  from_account text NOT NULL,
  to_account text NOT NULL DEFAULT 'housemaid-holding',
  total numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  transfer_date date NOT NULL DEFAULT current_date,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_transfers TO authenticated;
GRANT ALL ON public.bulk_transfers TO service_role;
ALTER TABLE public.bulk_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read bulk transfers" ON public.bulk_transfers;
CREATE POLICY "Members read bulk transfers" ON public.bulk_transfers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Members insert bulk transfers" ON public.bulk_transfers;
CREATE POLICY "Members insert bulk transfers" ON public.bulk_transfers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Members update bulk transfers" ON public.bulk_transfers;
CREATE POLICY "Members update bulk transfers" ON public.bulk_transfers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Members delete bulk transfers" ON public.bulk_transfers;
CREATE POLICY "Members delete bulk transfers" ON public.bulk_transfers FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.bulk_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_id uuid NOT NULL REFERENCES public.bulk_transfers(id) ON DELETE CASCADE,
  fee_transaction_id text NOT NULL,
  worker_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  worker_name text,
  sponsor_name text,
  amount numeric(14,2) NOT NULL DEFAULT 160,
  sign_status text NOT NULL DEFAULT 'pending' CHECK (sign_status IN ('pending','signed')),
  proof text,
  sign_date date,
  signed_by text,
  transfer_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bulk_items_bulk_idx ON public.bulk_items (bulk_id);
CREATE INDEX IF NOT EXISTS bulk_items_fee_txn_idx ON public.bulk_items (fee_transaction_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_items TO authenticated;
GRANT ALL ON public.bulk_items TO service_role;
ALTER TABLE public.bulk_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read bulk items" ON public.bulk_items;
CREATE POLICY "Members read bulk items" ON public.bulk_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Members insert bulk items" ON public.bulk_items;
CREATE POLICY "Members insert bulk items" ON public.bulk_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Members update bulk items" ON public.bulk_items;
CREATE POLICY "Members update bulk items" ON public.bulk_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Members delete bulk items" ON public.bulk_items;
CREATE POLICY "Members delete bulk items" ON public.bulk_items FOR DELETE TO authenticated USING (true);