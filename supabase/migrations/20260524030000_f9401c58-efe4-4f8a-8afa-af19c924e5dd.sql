
-- Fix: Revoke EXECUTE on SECURITY DEFINER trigger functions from public roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- Fix: Orders should always be tied to an authenticated user
-- Remove any orphaned orders first to allow NOT NULL constraint
DELETE FROM public.orders WHERE user_id IS NULL;
ALTER TABLE public.orders ALTER COLUMN user_id SET NOT NULL;

-- Fix: Stop broadcasting all order changes via Realtime to prevent data leakage
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;

-- Fix: Explicit INSERT policy preventing privilege escalation on user_roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
