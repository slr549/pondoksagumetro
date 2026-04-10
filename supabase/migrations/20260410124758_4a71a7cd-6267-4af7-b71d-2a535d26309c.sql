-- Allow admins to view all profiles for role management
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow everyone to view reviews (not just authenticated)
DROP POLICY IF EXISTS "Reviews viewable by authenticated users" ON public.reviews;
CREATE POLICY "Reviews viewable by everyone"
ON public.reviews
FOR SELECT
USING (true);

-- Allow admins to manage reviews
CREATE POLICY "Admins can manage reviews"
ON public.reviews
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
