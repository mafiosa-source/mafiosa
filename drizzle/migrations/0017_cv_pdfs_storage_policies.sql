DROP POLICY IF EXISTS "Public can read cv pdfs" ON storage.objects;
CREATE POLICY "Public can read cv pdfs"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'cv-pdfs');

DROP POLICY IF EXISTS "Members can read cv pdfs" ON storage.objects;
CREATE POLICY "Members can read cv pdfs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cv-pdfs' AND public.is_app_member(auth.uid()));

DROP POLICY IF EXISTS "Admins upload cv pdfs" ON storage.objects;
CREATE POLICY "Admins upload cv pdfs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cv-pdfs' AND public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update cv pdfs" ON storage.objects;
CREATE POLICY "Admins update cv pdfs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cv-pdfs' AND public.is_app_admin(auth.uid()))
  WITH CHECK (bucket_id = 'cv-pdfs' AND public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete cv pdfs" ON storage.objects;
CREATE POLICY "Admins delete cv pdfs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cv-pdfs' AND public.is_app_admin(auth.uid()));