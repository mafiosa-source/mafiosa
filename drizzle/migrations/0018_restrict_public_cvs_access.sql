-- Remove anonymous read access to the retired website-only CV table and PDF bucket.
-- No data is deleted; signed-in members and admins keep their existing access.
DROP POLICY IF EXISTS "Public can read available cvs" ON public.cvs;
REVOKE SELECT ON public.cvs FROM anon;

DROP POLICY IF EXISTS "Public can read cv pdfs" ON storage.objects;