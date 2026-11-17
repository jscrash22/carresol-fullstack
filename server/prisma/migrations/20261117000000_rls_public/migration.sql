-- Activa Row Level Security en TODAS las tablas del esquema public.
--
-- Motivo: Prisma se conecta con el rol `postgres`, que tiene BYPASSRLS, así que el
-- backend sigue funcionando con normalidad. La API REST pública de Supabase
-- (roles `anon` y `authenticated`) queda bloqueada porque no se crean políticas.
--
-- Se aplica de forma dinámica para cubrir todas las tablas del modelo (27+) sin
-- tener que listarlas a mano y para que siga siendo válido si el modelo crece.

DO $$
DECLARE
  tabla record;
BEGIN
  FOR tabla IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla.tablename);
  END LOOP;
END
$$;
