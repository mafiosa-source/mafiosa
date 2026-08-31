ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS temp_password TEXT;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS temp_password_set_at TIMESTAMPTZ;