
CREATE OR REPLACE FUNCTION public.get_schema_export()
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

  WITH cols AS (
    SELECT
      c.table_name,
      jsonb_agg(
        jsonb_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'udt_name', c.udt_name,
          'is_nullable', c.is_nullable,
          'column_default', c.column_default,
          'character_maximum_length', c.character_maximum_length,
          'ordinal_position', c.ordinal_position
        ) ORDER BY c.ordinal_position
      ) AS columns
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    GROUP BY c.table_name
  ),
  pks AS (
    SELECT
      tc.table_name,
      jsonb_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS pk_columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
    GROUP BY tc.table_name
  ),
  fks AS (
    SELECT
      tc.table_name,
      jsonb_agg(
        jsonb_build_object(
          'constraint_name', tc.constraint_name,
          'column', kcu.column_name,
          'references_table', ccu.table_name,
          'references_column', ccu.column_name,
          'references_schema', ccu.table_schema
        )
      ) AS foreign_keys
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    GROUP BY tc.table_name
  ),
  policies AS (
    SELECT
      tablename AS table_name,
      jsonb_agg(jsonb_build_object('policy', policyname, 'command', cmd, 'roles', roles)) AS policies
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ),
  tables AS (
    SELECT
      t.table_name,
      COALESCE(c.columns, '[]'::jsonb) AS columns,
      COALESCE(p.pk_columns, '[]'::jsonb) AS primary_key,
      COALESCE(f.foreign_keys, '[]'::jsonb) AS foreign_keys,
      COALESCE(pol.policies, '[]'::jsonb) AS rls_policies
    FROM information_schema.tables t
    LEFT JOIN cols c ON c.table_name = t.table_name
    LEFT JOIN pks p ON p.table_name = t.table_name
    LEFT JOIN fks f ON f.table_name = t.table_name
    LEFT JOIN policies pol ON pol.table_name = t.table_name
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'schema', 'public',
    'tables', jsonb_agg(
      jsonb_build_object(
        'name', table_name,
        'columns', columns,
        'primary_key', primary_key,
        'foreign_keys', foreign_keys,
        'rls_policies', rls_policies
      ) ORDER BY table_name
    )
  )
  INTO result
  FROM tables;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_schema_export() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_schema_export() TO authenticated;
