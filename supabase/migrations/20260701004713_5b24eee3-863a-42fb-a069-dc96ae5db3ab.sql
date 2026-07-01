
-- 1. security_events table
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_email text,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  target_user_id uuid,
  target_email text,
  resource text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text
);
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Developers can view security events" ON public.security_events;
CREATE POLICY "Developers can view security events" ON public.security_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'developer'));

CREATE INDEX IF NOT EXISTS security_events_created_at_idx ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_event_type_idx ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS security_events_severity_idx ON public.security_events(severity);

-- 2. Helper to log events (SECURITY DEFINER so triggers & authorized RPCs can insert)
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _severity text DEFAULT 'info',
  _target_user_id uuid DEFAULT NULL,
  _resource text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  actor uuid := auth.uid();
  actor_mail text;
  target_mail text;
BEGIN
  SELECT email INTO actor_mail FROM auth.users WHERE id = actor;
  IF _target_user_id IS NOT NULL THEN
    SELECT email INTO target_mail FROM auth.users WHERE id = _target_user_id;
  END IF;
  INSERT INTO public.security_events(actor_id, actor_email, event_type, severity, target_user_id, target_email, resource, metadata)
  VALUES (actor, actor_mail, _event_type, _severity, _target_user_id, target_mail, _resource, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, text, jsonb) TO authenticated, service_role;

-- 3. Trigger to auto-log role changes
CREATE OR REPLACE FUNCTION public.audit_user_roles_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_mail text;
  target_mail text;
BEGIN
  SELECT email INTO actor_mail FROM auth.users WHERE id = actor;
  IF TG_OP = 'INSERT' THEN
    SELECT email INTO target_mail FROM auth.users WHERE id = NEW.user_id;
    INSERT INTO public.security_events(actor_id, actor_email, event_type, severity, target_user_id, target_email, resource, metadata)
    VALUES (actor, actor_mail, 'role.assigned',
            CASE WHEN NEW.role IN ('admin','developer') THEN 'high' ELSE 'info' END,
            NEW.user_id, target_mail, 'user_roles',
            jsonb_build_object('role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT email INTO target_mail FROM auth.users WHERE id = OLD.user_id;
    INSERT INTO public.security_events(actor_id, actor_email, event_type, severity, target_user_id, target_email, resource, metadata)
    VALUES (actor, actor_mail, 'role.revoked',
            CASE WHEN OLD.role IN ('admin','developer') THEN 'high' ELSE 'info' END,
            OLD.user_id, target_mail, 'user_roles',
            jsonb_build_object('role', OLD.role));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_change();

-- 4. Security overview RPC (developer only)
CREATE OR REPLACE FUNCTION public.get_security_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'developer') THEN
    RAISE EXCEPTION 'Forbidden: developer role required';
  END IF;

  WITH role_counts AS (
    SELECT role::text AS role, COUNT(*) AS count
    FROM public.user_roles GROUP BY role
  ),
  user_totals AS (
    SELECT
      (SELECT COUNT(*) FROM auth.users) AS total_users,
      (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL) AS verified_users,
      (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at >= now() - interval '24 hours') AS active_24h,
      (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '7 days') AS new_7d
  ),
  tbls AS (
    SELECT c.relname AS name, c.relrowsecurity AS rls_enabled,
           (SELECT COUNT(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname) AS policy_count
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
  ),
  buckets AS (
    SELECT id AS name, public FROM storage.buckets
  ),
  recent_events AS (
    SELECT id, created_at, event_type, severity, actor_email, target_email, resource, metadata
    FROM public.security_events
    ORDER BY created_at DESC LIMIT 25
  ),
  event_counts AS (
    SELECT severity, COUNT(*) AS count
    FROM public.security_events
    WHERE created_at >= now() - interval '7 days'
    GROUP BY severity
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'users', (SELECT row_to_json(u) FROM user_totals u),
    'roles', COALESCE((SELECT jsonb_object_agg(role, count) FROM role_counts), '{}'::jsonb),
    'tables', COALESCE((SELECT jsonb_agg(row_to_json(t) ORDER BY t.name) FROM tbls t), '[]'::jsonb),
    'buckets', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM buckets b), '[]'::jsonb),
    'recent_events', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM recent_events e), '[]'::jsonb),
    'event_counts_7d', COALESCE((SELECT jsonb_object_agg(severity, count) FROM event_counts), '{}'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_security_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_security_overview() TO authenticated;
