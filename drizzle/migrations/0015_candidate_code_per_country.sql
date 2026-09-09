-- Serial codes become [COUNTRY]-NNN, sequential per country, globally unique.
CREATE OR REPLACE FUNCTION public.get_next_candidate_code(p_country_code text, p_agent_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_country text := upper(trim(p_country_code));
  v_sequence integer;
BEGIN
  IF v_country !~ '^[A-Z]{2}$' THEN RAISE EXCEPTION 'Invalid country code'; END IF;
  -- serialise concurrent inserts for the same country
  PERFORM pg_advisory_xact_lock(hashtext('candidate_code_' || v_country));
  SELECT coalesce(max((regexp_match(candidate_code, '([0-9]+)$'))[1]::int), 0) + 1
    INTO v_sequence
    FROM public.candidates
   WHERE country_code = v_country;
  RETURN v_country || '-' || lpad(coalesce(v_sequence, 1)::text, 3, '0');
END;
$function$;

-- Re-sequence existing codes to the new format, oldest CV first per country.
WITH ranked AS (
  SELECT id,
         upper(country_code) AS cc,
         row_number() OVER (PARTITION BY upper(country_code) ORDER BY created_at, id) AS seq
    FROM public.candidates
)
UPDATE public.candidates c
   SET candidate_code = r.cc || '-' || lpad(r.seq::text, 3, '0')
  FROM ranked r
 WHERE r.id = c.id;

CREATE UNIQUE INDEX IF NOT EXISTS candidates_candidate_code_unique
  ON public.candidates (candidate_code)
  WHERE candidate_code IS NOT NULL;