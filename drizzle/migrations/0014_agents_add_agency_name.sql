ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS agency_name text;
COMMENT ON COLUMN public.agents.agency_name IS 'Overseas agency the agent belongs to (optional).';