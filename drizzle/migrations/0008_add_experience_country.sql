ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS experience_country text;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;