# Bloqueos, problemas y planes B — Reto 2 (continuación)

Registro de todo lo que no se pudo completar tal como pedía el prompt, con el plan B
aplicado y qué debe hacer el estudiante a mano. Se actualiza por fase.

---

## B01 — Supabase sin cadena de conexión (FASE 0/2)

- **Qué pasó**: el estudiante eligió Supabase y dejó un archivo `conexión supabase.txt` en el
  escritorio, pero el archivo llegó **vacío (0 bytes)**. Solo se recibió la contraseña de la BD
  por chat; sin la **referencia del proyecto** (el host `aws-0-REGION.pooler.supabase.com` y el
  prefijo `postgres.PROYECTO`) no es posible construir la cadena de conexión.
- **Plan B aplicado**: se montó un **PostgreSQL 16 portable local** (`C:\Users\jdavi\pgsql`,
  datos en `C:\Users\jdavi\pgdata`) y todo el proyecto corre contra él. El schema usa
  `provider = "postgresql"`, así que el modelo es 100 % compatible con Supabase.
- **Qué debe hacer el estudiante para mover la BD a Supabase** (≈5 minutos):
  1. En el dashboard de Supabase: *Project Settings → Database → Connection string*.
  2. Editar `server/.env`:
     - `DATABASE_URL=postgresql://postgres.PROYECTO:CONTRASEÑA@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true` (Transaction pooler, para la API).
     - `DIRECT_URL=postgresql://postgres.PROYECTO:CONTRASEÑA@aws-0-REGION.pooler.supabase.com:5432/postgres` (Session pooler, para migrar).
     - Si la contraseña tiene caracteres especiales, codificarla con Node:
       `node -e "console.log(encodeURIComponent('TU-CONTRASEÑA'))"`.
  3. Descomentar `directUrl` en `server/prisma/schema.prisma` (línea marcada con `// Supabase`).
  4. `npm run db:deploy` (aplica las migraciones) y `npm run db:seed`.
  5. **Seguridad**: ejecutar `prisma/migrations-sql/rls_supabase.sql` (activa RLS en todas las
     tablas; Prisma usa el rol `postgres`, que ignora RLS, así que el backend sigue funcionando).
     Esto es imprescindible en Supabase: su API REST pública expone el esquema `public` y sin
     RLS cualquiera con la `anon key` leería/modificaría los datos (OWASP A01/A05).
- **Nota**: la contraseña de Supabase recibida por chat **no** se escribió en ningún archivo
  del repo ni en los commits.

## B02 — Nombre del zip sin proporcionar (FASE 0)

- El prompt pedía Apellido y Nombre para `Reto2_Apellido_Nombre.zip` y no se recibió respuesta.
- **Plan B aplicado (FASE 11)**: el entregable se generó como **`Reto2_Carresol.zip`** (3,5 MB,
  151 entradas) y se verificó: sin `node_modules`, sin `server/.env`, sin `.git`, sin la base
  SQLite ni certificados, y **sin fugas** de los valores reales de `server/.env`
  (JWT_SECRET, DATABASE_URL, DIRECT_URL, POSTGRES_PASSWORD). El estudiante solo debe
  **renombrar** el archivo con su apellido y nombre antes de entregarlo.

## B03 — Docker no instalado (FASE 2)

- La máquina no tiene Docker (ni `docker` en PATH). El `docker-compose.yml` default del prompt
  (PostgreSQL local en Docker) no era viable.
- **Plan B**: PostgreSQL 16 portable (binarios EDB descomprimidos en `C:\Users\jdavi\pgsql`),
  iniciado con `pg_ctl` como proceso del usuario. En FASE 11 el `docker-compose.yml` heredado
  (que apuntaba a SQL Server) se reescribió a `postgres:16-alpine` con healthcheck, por si el
  estudiante instala Docker después (README, sección Base de datos).

## B04 — npm.ps1 bloqueado por ExecutionPolicy (FASE 1)

- PowerShell del estudiante tiene la política de ejecución `Restricted`: `npm` (que resuelve a
  `npm.ps1`) falla con "la ejecución de scripts está deshabilitada".
- **Plan B aplicado en toda la documentación y scripts**: usar `npm.cmd` (o `cmd /c npm`).
  El estudiante también puede habilitarlo una sola vez si prefiere:
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## B05 — dev.db sin migrar (FASE 1)

- El `dev.db` heredado existía pero sin tablas ni seed (la migración nunca se aplicó a ese
  archivo). Se ejecutó `prisma migrate deploy` + `prisma db seed` y la línea base quedó
  21 PASS / 0 FAIL. No fue necesario regenerar nada.

## B06 — El archivo de Supabase del escritorio traía la clave entre corchetes

- `conexión.supabase.md` contenía las URLs con la contraseña envuelta en `[...]` (formato
  Markdown). La primera conexión falló con `P1000`.
- **Plan B aplicado:** se limpiaron los corchetes al importar y `SELECT 1` funcionó. No fue
  necesario cambiar la contraseña de la base.

## B07 — PostgreSQL local inestable al re-verificar (FASE 12)

- El PostgreSQL 16 portable (`C:\Users\jdavi\pgdata`) arranca, pero sus procesos backend
  mueren con la excepción `0xC0000142` (interferencia de antivirus/OneDrive en Windows), así
  que no se pudo re-correr el smoke test completo contra la BD local.
- **Plan B aplicado:** verificación ligera contra Supabase (conexión, `GET /api/productos`,
  login admin, `GET /api/health`) y, si el smoke ensucia datos, `db:reset` + `db:seed` para
  dejar la base limpia. El smoke completo (81 PASS) ya está documentado en
  `docs/evidencias/smoke-test.txt` de la FASE 11.

## B08 — Poolers de Supabase inalcanzables desde esta red (FASE 13)

- **Qué pasó:** `DATABASE_URL` (6543) y `DIRECT_URL` (5432) ambos dan **timeout TCP** desde
  la máquina; Prisma responde `PrismaClientInitializationError` de red. En cambio la API en
  Render (`https://carresol-api.onrender.com/api/health` y `/api/productos`) responde 200 y
  ve 25 productos, así que el proyecto de Supabase NO está pausado: es el egress local a esos
  puertos el que está bloqueado.
- **Plan B aplicado:** (1) no ejecutar `db:reset`/`db:seed` ni migraciones contra Supabase;
  (2) línea base tomada de las evidencias archivadas (81/37/31) + verificación en línea de
  solo lectura; (3) las pruebas nuevas se harán contra la API pública con datos propios
  identificables (`TEST-`) y limpieza posterior; (4) `respaldo-json.js` queda listo para
  ejecutarse cuando el estudiante tenga red con acceso a los poolers.
- **Cómo reintentar el respaldo:** desde `server/`, `node scripts/respaldo-json.js` (nunca
  versionar `server/backups/`; nunca imprimir el contenido).