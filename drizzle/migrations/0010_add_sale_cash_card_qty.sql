ALTER TABLE public.dm_sale_items ADD COLUMN cash_qty numeric NOT NULL DEFAULT 0;
ALTER TABLE public.dm_sale_items ADD COLUMN card_qty numeric NOT NULL DEFAULT 0;
