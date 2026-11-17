# 🚀 Reporte de despliegue — Carresol Reto 2

Fecha: 17/11/2026 · Sin secretos: las contraseñas y cadenas reales viven solo en
`server/.env` (ignorado por git). Los archivos temporales del escritorio deben borrarse y,
si las credenciales viajaron por chat, rotarse.

## Resumen por fase

| Fase | Estado | Detalle |
|---|---|---|
| 1. GitHub | ✅ | `jscrash22/carresol-fullstack` (público), rama `main` con un único commit limpio y 154 archivos. Escaneo de secretos limpio. |
| 2. Supabase | ✅ | `DATABASE_URL` (6543, transaction) y `DIRECT_URL` (5432, session) sobre `aws-1-us-east-1`. `SELECT 1` correcto. |
| 3. Código para la nube | ✅ | `trust proxy`, `/api/health`, `process.env.PORT`, `prisma` en `dependencies`, `HTTPS=false`, CORS whitelist, RLS en 28/28 tablas, seed con contraseñas nuevas, frontend con `API_PROD_URL` y reintento por arranque en frío. |
| 4. `render.yaml` + documentación | ✅ | Blueprint válido sin secretos; `docs/DESPLIEGUE_RENDER.md`; README con enlaces reales. |
| 5. Render | ✅ | Servicio `carresol-api` creado por API, estado **live**. Frontend en GitHub Pages (decisión del estudiante). |
| 6. Verificación en línea | ✅ | `/api/health` 200, 25 productos, login admin, CORS permitido/rechazado. |
| 7. Entrega | ✅ | Zip regenerado y verificado sin secretos. |

## URLs

- **Repositorio:** https://github.com/jscrash22/carresol-fullstack
- **API:** https://carresol-api.onrender.com
- **Frontend:** https://jscrash22.github.io/carresol-fullstack/
- **Supabase:** proyecto `tdapkdknamqvucmoarqc` (región `us-east-1`)
- **Panel de Render:** https://dashboard.render.com/web/srv-dbttha6k1f9s739netd0

## Pruebas reales

- **Smoke local (FASE 11):** **81 PASS / 0 FAIL** — evidencia en
  `docs/evidencias/smoke-test-local.txt`.
- **Smoke contra la API desplegada:** **77 PASS / 4 FAIL** — evidencia en
  `docs/evidencias/smoke-test-produccion.txt`.
  Las 4 fallas son **esperadas y correctas**: los casos 65, 68, 69 y 70 dependen de que
  `forgot-password` devuelva el token, algo que **solo ocurre en `NODE_ENV=development`**.
  En producción el token no se expone (comportamiento seguro).
- **Verificación ligera contra Supabase (tras limpiar):** conexión OK, RLS 28/28,
  `GET /api/productos` = 25, login admin OK, `GET /api/health` = `{"ok":true}`.
- **Datos finales en Supabase:** 5 categorías, 25 productos, 40 variantes, 2 usuarios,
  1 punto de emisión, 6 parámetros, **0 pedidos y 0 compras** (sin datos de prueba).

## Qué debe hacer el estudiante

1. **Borrar** del escritorio `conexión.supabase.md` y `render-variables-SECRETO.md`
   (contienen secretos). El primero ya no hace falta; el segundo solo hasta que termines
   de configurar Render.
2. **Cambiar la contraseña de la base** si viajó por chat: Supabase → Project Settings →
   Database → *Reset database password*, y actualizar `server/.env` y la variable
   `DATABASE_URL`/`DIRECT_URL` en Render.
3. **Primera carga:** el plan gratis de Render duerme la API tras ~15 min. La primera
   petición puede tardar hasta un minuto; el frontend avisa y reintenta solo.
4. **Nada pendiente de clics:** la API y el sitio ya están desplegados y verificados.
   GitHub Pages quedó activado con *Source: GitHub Actions*.
5. Avisar al profesor de que el frontend está en GitHub Pages y la API en Render (plan
   gratis, con arranque en frío).

## Decisiones tomadas

- Repo público (el estudiante ya lo creó así); email de commits
  `jscrash22@users.noreply.github.com` para no publicar el correo personal.
- Rama huérfana `main` con un único commit limpio (no se publicó el historial local).
- Frontend en **GitHub Pages** (elección del estudiante) en lugar de Render Static Site.
- Contraseñas del seed rotadas y `JWT_SECRET` de Render nuevo, ambos fuera del repo.
- El archivo del escritorio traía la contraseña entre corchetes (`[clave]`): se limpiaron.

## Bloqueos y plan B

- **B06 — corchetes en la conexión de Supabase:** la primera conexión dio `P1000`; se
  limpiaron los corchetes y `SELECT 1` funcionó.
- **B07 — PostgreSQL local inestable:** los backends mueren con `0xC0000142`
  (antivirus/OneDrive). No se pudo re-correr el smoke contra la BD local; se corrió contra
  la API desplegada y luego se limpió Supabase con `db:reset` + `db:seed`.
- El primer run de GitHub Pages falló porque Pages aún no estaba habilitado; se habilitó
  (`build_type=workflow`) y el segundo run terminó en **success**.
