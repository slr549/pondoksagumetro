-- Allow admins to view all profiles for backup purposes
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all wishlists for backup purposes
CREATE POLICY "Admins can view all wishlists" 
ON public.wishlist 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));
