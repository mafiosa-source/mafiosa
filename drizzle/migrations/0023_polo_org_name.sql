ALTER TABLE public.polo_batches ADD COLUMN IF NOT EXISTS org_name text;
ALTER TABLE public.polo_events ADD COLUMN IF NOT EXISTS org_name text;