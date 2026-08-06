CREATE TABLE IF NOT EXISTS public.wallet_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  wallet text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, wallet)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_targets TO authenticated;
GRANT ALL ON public.wallet_targets TO service_role;

ALTER TABLE public.wallet_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own wallet targets"
ON public.wallet_targets FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_wallet_targets_updated_at
BEFORE UPDATE ON public.wallet_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();