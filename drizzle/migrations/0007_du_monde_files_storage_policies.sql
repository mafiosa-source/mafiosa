CREATE POLICY "Members read du monde files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'du-monde-files' AND public.is_app_member(auth.uid()));
CREATE POLICY "Members upload du monde files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'du-monde-files' AND public.is_app_member(auth.uid()) AND owner = auth.uid());
CREATE POLICY "Owners update du monde files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'du-monde-files' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'du-monde-files' AND owner = auth.uid());
CREATE POLICY "Owners delete du monde files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'du-monde-files' AND (owner = auth.uid() OR public.is_app_admin(auth.uid())));