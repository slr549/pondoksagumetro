DROP POLICY IF EXISTS "Anyone can record a visit" ON public.page_visits;
CREATE POLICY "Anyone can record a visit" ON public.page_visits FOR INSERT TO anon, authenticated WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
);