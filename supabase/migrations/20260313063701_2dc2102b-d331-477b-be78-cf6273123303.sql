DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews viewable by authenticated users"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (true);