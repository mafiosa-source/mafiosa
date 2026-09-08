ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS place_of_birth TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS monthly_salary TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS remarks TEXT;