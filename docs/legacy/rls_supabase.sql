-- ============================================================
-- RLS para Supabase (ejecutar SOLO si usas la variante PostgreSQL/Supabase)
--
-- ¿Por qué? Supabase expone automáticamente las tablas del esquema public
-- en una API REST pública (PostgREST). Sin RLS, cualquiera con la anon key
-- podría leer o modificar datos saltándose el backend (A01 Broken Access
-- Control / A05 Security Misconfiguration del OWASP Top 10).
--
-- Estas órdenes activan RLS en las 4 tablas SIN crear políticas: el backend
-- (Prisma con el rol postgres, que ignora RLS) sigue funcionando y la API
-- REST pública queda bloqueada por completo.
--
-- Ejecutar tras migrar, por ejemplo con:
--   docker run -it --rm postgres psql "DIRECT_URL" -f rls_supabase.sql
-- o desde el SQL Editor de Supabase pegando este contenido.
-- ============================================================

ALTER TABLE "Producto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pedido" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PedidoDetalle" ENABLE ROW LEVEL SECURITY;

-- Verificación: todas deben devolver true
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
