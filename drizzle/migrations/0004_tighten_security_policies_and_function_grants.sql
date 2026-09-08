-- 1. agents: restrict from open "true" policies to active app members / admins
DROP POLICY IF EXISTS "Members read agents" ON public.agents;
DROP POLICY IF EXISTS "Members insert agents" ON public.agents;
DROP POLICY IF EXISTS "Members update agents" ON public.agents;
DROP POLICY IF EXISTS "Members delete agents" ON public.agents;

CREATE POLICY "Members read agents" ON public.agents
  FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
CREATE POLICY "Members insert agents" ON public.agents
  FOR INSERT TO authenticated WITH CHECK (public.is_app_member(auth.uid()));
CREATE POLICY "Members update agents" ON public.agents
  FOR UPDATE TO authenticated USING (public.is_app_member(auth.uid())) WITH CHECK (public.is_app_member(auth.uid()));
CREATE POLICY "Admins delete agents" ON public.agents
  FOR DELETE TO authenticated USING (public.is_app_admin(auth.uid()));

-- 2. candidates: restrict from open "true" policies to active app members / admins
DROP POLICY IF EXISTS "Members read candidates" ON public.candidates;
DROP POLICY IF EXISTS "Members insert candidates" ON public.candidates;
DROP POLICY IF EXISTS "Members update candidates" ON public.candidates;
DROP POLICY IF EXISTS "Members delete candidates" ON public.candidates;

CREATE POLICY "Members read candidates" ON public.candidates
  FOR SELECT TO authenticated USING (public.is_app_member(auth.uid()));
CREATE POLICY "Members insert candidates" ON public.candidates
  FOR INSERT TO authenticated WITH CHECK (public.is_app_member(auth.uid()));
CREATE POLICY "Members update candidates" ON public.candidates
  FOR UPDATE TO authenticated USING (public.is_app_member(auth.uid())) WITH CHECK (public.is_app_member(auth.uid()));
CREATE POLICY "Admins delete candidates" ON public.candidates
  FOR DELETE TO authenticated USING (public.is_app_admin(auth.uid()));

-- 3. candidate_code_counters: internal-only table, deny all Data API access explicitly
REVOKE ALL ON public.candidate_code_counters FROM anon, authenticated;
GRANT ALL ON public.candidate_code_counters TO service_role;
CREATE POLICY "No direct client access to code counters" ON public.candidate_code_counters
  FOR SELECT TO authenticated USING (false);

-- 4. candidate-files storage: restrict to active app members instead of any authenticated user
DROP POLICY IF EXISTS "Members read candidate files" ON storage.objects;
DROP POLICY IF EXISTS "Members upload candidate files" ON storage.objects;
DROP POLICY IF EXISTS "Members update candidate files" ON storage.objects;
DROP POLICY IF EXISTS "Members delete candidate files" ON storage.objects;

CREATE POLICY "Members read candidate files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'candidate-files' AND public.is_app_member(auth.uid()));
CREATE POLICY "Members upload candidate files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'candidate-files' AND public.is_app_member(auth.uid()) AND owner = auth.uid());
CREATE POLICY "Members update candidate files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'candidate-files' AND (owner = auth.uid() OR public.is_app_admin(auth.uid())))
  WITH CHECK (bucket_id = 'candidate-files' AND (owner = auth.uid() OR public.is_app_admin(auth.uid())));
CREATE POLICY "Members delete candidate files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'candidate-files' AND (owner = auth.uid() OR public.is_app_admin(auth.uid())));

-- 5. SECURITY DEFINER functions: remove public/anon EXECUTE access
REVOKE ALL ON FUNCTION public.assign_candidate_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_next_candidate_code(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_app_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_app_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_member(uuid) TO authenticated;