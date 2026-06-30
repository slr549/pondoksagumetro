
CREATE TABLE public.page_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path text NOT NULL,
  referrer text,
  user_id uuid,
  session_id text,
  user_agent text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_visits_created_at ON public.page_visits (created_at DESC);
CREATE INDEX idx_page_visits_path ON public.page_visits (path);
CREATE INDEX idx_page_visits_session ON public.page_visits (session_id);

GRANT INSERT ON public.page_visits TO anon, authenticated;
GRANT SELECT ON public.page_visits TO authenticated;
GRANT ALL ON public.page_visits TO service_role;

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a visit"
  ON public.page_visits FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can view visits"
  ON public.page_visits FOR SELECT
  TO authenticated
  USING (public.is_admin_or_dev(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_traffic_stats(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result jsonb;
  since timestamptz := now() - make_interval(days => _days);
BEGIN
  IF NOT public.is_admin_or_dev(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: admin or developer role required';
  END IF;

  WITH recent AS (
    SELECT * FROM public.page_visits WHERE created_at >= since
  ),
  summary AS (
    SELECT
      COUNT(*) AS total_visits,
      COUNT(DISTINCT session_id) AS unique_sessions,
      COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS unique_users,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS visits_24h,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '1 hour') AS visits_1h
    FROM recent
  ),
  daily AS (
    SELECT
      to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
      COUNT(*) AS visits,
      COUNT(DISTINCT session_id) AS sessions
    FROM recent
    GROUP BY 1
    ORDER BY 1
  ),
  top_pages AS (
    SELECT path, COUNT(*) AS visits
    FROM recent
    GROUP BY path
    ORDER BY visits DESC
    LIMIT 10
  ),
  top_referrers AS (
    SELECT COALESCE(NULLIF(referrer,''), 'direct') AS referrer, COUNT(*) AS visits
    FROM recent
    GROUP BY 1
    ORDER BY visits DESC
    LIMIT 10
  ),
  devices AS (
    SELECT COALESCE(device_type, 'unknown') AS device, COUNT(*) AS visits
    FROM recent
    GROUP BY 1
    ORDER BY visits DESC
  )
  SELECT jsonb_build_object(
    'since', since,
    'days', _days,
    'summary', (SELECT row_to_json(summary) FROM summary),
    'daily', COALESCE((SELECT jsonb_agg(row_to_json(d)) FROM daily d), '[]'::jsonb),
    'top_pages', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM top_pages t), '[]'::jsonb),
    'top_referrers', COALESCE((SELECT jsonb_agg(row_to_json(r)) FROM top_referrers r), '[]'::jsonb),
    'devices', COALESCE((SELECT jsonb_agg(row_to_json(dv)) FROM devices dv), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
