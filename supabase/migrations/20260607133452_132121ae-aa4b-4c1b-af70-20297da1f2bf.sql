
-- Role hierarchy helpers
CREATE OR REPLACE FUNCTION public.is_admin_or_dev(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','developer')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','developer','moderator')
  );
$$;

-- Products / categories: developer + admin can write; everyone can view (existing public SELECT remains)
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins and developers manage products"
  ON public.products FOR ALL TO authenticated
  USING (public.is_admin_or_dev(auth.uid()))
  WITH CHECK (public.is_admin_or_dev(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins and developers manage categories"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_admin_or_dev(auth.uid()))
  WITH CHECK (public.is_admin_or_dev(auth.uid()));

-- Orders / order items / reviews: staff (developer/admin/moderator) can manage
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Staff manage orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Staff manage order items"
  ON public.order_items FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Staff manage reviews"
  ON public.reviews FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Profiles: staff can view all
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Staff view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- user_roles management restricted to developer + admin
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins and developers manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin_or_dev(auth.uid()))
  WITH CHECK (public.is_admin_or_dev(auth.uid()));
