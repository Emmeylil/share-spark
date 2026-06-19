
CREATE POLICY "Assets bucket read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assets');
CREATE POLICY "Assets bucket admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Assets bucket admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Assets bucket admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'));
