# 🚀 DESPLIEGUE — Carresol Reto 2 GitHub → Supabase → Render

Eres un ingeniero DevOpsfull stack senior trabajando de forma autónoma sobre el proyecto Carresol (Reto 2), que ya está construido y probado en local. Tu misión (1) subirlo a GitHub, (2) conectarlo a Supabase, (3) prepararlo y desplegarlo en Render.

Datos fijos
- Usuario de GitHub `jscrash22`
- Nombre del repositorio `carresol-fullstack` (URL `httpsgithub.comjscrash22carresol-fullstack`)
- Proyecto Supabase referencia `tdapkdknamqvucmoarqc`, región `us-east-1` (East US, North Virginia).
- Render región `virginia` (la misma que Supabase), plan free.
- Ojo `httpsgithub.comjscrash22carresol` es el Reto 1 (el sitio estático en GitHub Pages). No lo toques ni subas nada ahí.

El estudiante se va a dormir apenas responda tu cuestionario. Quiere despertar con todo desplegado.

---

## 0. REGLAS DE OPERACIÓN

1. Pregunta solo una vez (FASE 0, un solo mensaje). Después, cero preguntas; decide con criterio y anótalo en `docsDECISIONES.md`.
2. No te detengas ante errores diagnostica, corrige, sigue. Si algo es imposible, aplica un plan B, anótalo en `docsBLOQUEOS.md` y continúa con lo que sí se pueda.
3. Secretos nunca imprimas en consola, logs, commits, README ni reportes contraseñas, cadenas de conexión completas, `JWT_SECRET`, tokens o API keys. Enmascara siempre (``). Solo viven en `server.env` (ignorado por git) y en las variables de entorno de Render.
4. Entorno Windows  PowerShell. Si `npm` falla por la política de ejecución (`npm.ps1` bloqueado), usa `npm.cmd` y `npx.cmd`. Para el escritorio usa `[Environment]GetFolderPath('Desktop')` (puede estar redirigido a OneDrive).
5. Nunca uses `git push --force`, ni reescribas historial de un repo remoto existente, ni borres carpetas del estudiante.
6. Verifica de verdad no declares algo hecho sin haberlo ejecutado y comprobado (push visible, migración aplicada, `apihealth` respondiendo, etc.).
7. Textos, commits y documentación en español. Commits pequeños por fase.
8. Al final escribe `docsREPORTE_DESPLIEGUE.md` (sin secretos) y entrega el resumen del §8.

---

## 1. FASE 0 — CUESTIONARIO INICIAL (único momento para preguntar)

Primero haz estas comprobaciones tú, en silencio `git --version`, `gh --version` y `gh auth status`; `git config user.name`  `user.email`; `git remote -v` y `git log --oneline -5` en el proyecto; si existe el archivo de Supabase del escritorio (§3.1) y si tiene contenido (no 0 bytes).

Luego, en un solo mensaje, preguntaavisa lo que falte, con el valor por defecto de cada punto

1. Autenticación en GitHub. Si `gh` no está instalado o no está autenticado, indícale exactamente qué hacer ahora, antes de dormirse (por ejemplo instalar con `winget install --id GitHub.cli`, y luego ejecutar `gh auth login` → GitHub.com → HTTPS → Login with a web browser). Espera a que lo confirme y verifica tú con `gh auth status` antes de seguir. Es lo único que bloquea la FASE 1.
2. Visibilidad del repo (default público, porque así Render lo lee sin vincular cuentas y el profesor puede verlo; no tendrá secretos). Si elige privado, Render necesitará acceso a GitHub (un clic suyo).
3. ¿Tienes cuenta en Render Debe estar creada (registro con GitHub en render.com). (Sin cuenta, la FASE 5 queda en modo listo para desplegar.)
4. ¿Quieres que despliegue yo en Render por API Para eso necesito una API key de Render (Dashboard → Account Settings → API Keys). (default no → dejo todo listo y te entrego los valores y los clics exactos; con key, lo hago yo de punta a punta). Si la da, úsala solo como variable de entorno de la sesión, nunca en archivos.
5. Frontend (default Render Static Site `carresol-web`, gratis y sin dormirse); alternativa GitHub Pages desde una Action.
6. Apellido y Nombre para `Reto2_Apellido_Nombre.zip` (default dejo `Reto2_Carresol.zip` y se renombra a mano).

Confirma en una línea que arrancas. Desde ahí, cero preguntas.

---

## 2. FASE 1 — SUBIR EL PROYECTO A GITHUB (primero)

Objetivo repo `jscrash22carresol-fullstack` con el proyecto sin ningún secreto.

1.1 Higiene previa (obligatoria, antes del primer commit)
- Confirma que `.gitignore` cubre `node_modules`, `server.env`, `.env`, `.env.local`, `servercerts`, `.zip`, `.log`, `serverprisma.db`, `.DS_Store`. Añade lo que falte.
- Mueve `PROMPT_RETO2_OPENCODE.md` de la raíz a `docsprompts` (si no está ya). Los prompts son parte de la documentación del proceso; no deben contener secretos.
- Quita contraseñas reales de la documentación `docsREPORTE_FINAL.md` y cualquier archivo de `docs` que contenga las contraseñas del seed o tokens → reemplázalas por `ver server.env`  ``. Revisa también `docsevidenciasejemplos-endpoints.md`.
- Escaneo de secretos sobre todos los archivos que se van a versionar (`git ls-files` + archivos nuevos) busca (a) cada valor sensible de `server.env` (`JWT_SECRET`, contraseñas, `DATABASE_URL``DIRECT_URL`, `POSTGRES_PASSWORD`, `SEED_`), (b) patrones `postgresqlusuarioclave@`, `eyJ[A-Za-z0-9_-]{20,}` (JWT), `rnd_``API_KEY`. Si hay un solo hallazgo, corrígelo y vuelve a escanear antes de continuar. No imprimas el valor encontrado, solo archivo y línea.
- Verifica con `git ls-files` que no salgan `server.env`, `node_modules`, `.zip`, `.db`.

1.2 Git y remoto
- Si no hay identidad configurada, usa configuración local del repo `user.name = jscrash22`, `user.email = jscrash22@users.noreply.github.com`.
- Revisa `git remote -v`. Si `origin` apunta al repo `carresol` (Reto 1) u otro distinto de `carresol-fullstack`, NO empujes ahí reemplaza el remoto por el nuevo.
- Si ya existen commits previos, no subas ese historial (puede contener secretos antiguos) crea una rama huérfana con un único commit inicial limpio (`git checkout --orphan main-limpio` → `git add -A` → commit Carresol Reto 2 — versión inicial full stack → `git branch -M main`). Si no hay commits, simplemente haz el commit inicial. No borres el `.git` original.
- Crea el repo con `gh repo create jscrash22carresol-fullstack --publicprivate --source=. --remote=origin` (según FASE 0) o, si ya existe vacío, añade el remoto. Luego `git push -u origin main`.
- Si `gh` falla por falta de permisos, plan B dile en el reporte el comando exacto para crear el repo en github.com y empujar; no te quedes bloqueado continúa con las fases 2–4 en local.

Checkpoint `git ls-remote origin` muestra `main`; `gh repo view jscrash22carresol-fullstack` responde; el escaneo de secretos del repo remoto (clona a una carpeta temporal o usa `git grep` sobre `HEAD`) sale limpio.

---

## 3. FASE 2 — CONEXIÓN A SUPABASE (desde el escritorio)

### 3.1 De dónde sacas la conexión
El estudiante dejó en su escritorio un archivo Markdown con la conexión a Supabase. Búscalo en `[Environment]GetFolderPath('Desktop')` (y en `%USERPROFILE%Desktop` por si acaso) con cualquier nombre que contenga `supabase` y extensión `.md` o `.txt` (por ejemplo `supabase-conexion.md`). Verifica que no esté vacío (en una sesión anterior llegó de 0 bytes y bloqueó el trabajo).

- Si contiene las cadenas completas (`DATABASE_URL` y `DIRECT_URL`) úsalas.
- Si contiene solo la contraseña (o la contraseña + el host) construye las cadenas con estos datos conocidos
  - Usuario `postgres.tdapkdknamqvucmoarqc`
  - `DATABASE_URL` (Transaction pooler) `postgresqlpostgres.tdapkdknamqvucmoarqcCLAVE@HOST6543postgrespgbouncer=true`
  - `DIRECT_URL` (Session pooler) `postgresqlpostgres.tdapkdknamqvucmoarqcCLAVE@HOST5432postgres`
  - `HOST` es `aws-0-us-east-1.pooler.supabase.com` o `aws-1-us-east-1.pooler.supabase.com` prueba ambos y quédate con el que conecte.
  - Codifica la contraseña en formato URL si tiene caracteres especiales (`node -e console.log(encodeURIComponent(process.argv[1])) -- CLAVE`).
  - No uses la conexión Direct (`db.ref.supabase.co`) en el plan gratis suele ser solo IPv6 y falla.
- Si el archivo no existe o sigue vacío plan B → registra el bloqueo en `docsBLOQUEOS.md`, salta a la FASE 5 en modo preparado (código y documentación listos) y deja claro en el reporte qué falta.

### 3.2 Qué hacer con ella
1. Escribe `DATABASE_URL` y `DIRECT_URL` en `server.env` (conserva el resto de variables; no toques nada más; el archivo está ignorado por git).
2. Comprueba la conexión con una consulta trivial (`SELECT 1`) vía Prisma o `pg`, sin imprimir la cadena.
3. No copies el archivo del escritorio dentro del repo ni lo menciones por su contenido. Al terminar, recuerda en el reporte que el estudiante debe borrarlo y, si la contraseña viajó por chat, cambiarla (Supabase → Project Settings → Database → Reset database password) y actualizar `.env` y Render.

---

## 4. FASE 3 — VERIFICA Y COMPLETA EL CÓDIGO PARA LA NUBE

Revisa cada punto; si ya está hecho, no lo repitas; si falta, hazlo

1. Migraciones limpias la carpeta `serverprismamigrations20261110043125_init` es de SQLite (`AUTOINCREMENT`, `DATETIME`) y rompe `prisma migrate deploy` en PostgreSQL. Elimínala (deja solo las migraciones PostgreSQL) y comprueba que `npx prisma migrate deploy` funciona desde cero (en una BD vacía) y que `migration_lock.toml` dice `postgresql`.
2. RLS en Supabase convierte `docslegacyrls_supabase.sql` en una migración de Prisma que ejecute `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` en todas las tablas del esquema `public` (incluida `_prisma_migrations` no es necesario; las 27+ tablas del modelo sí), sin crear políticas. Prisma usa el rol `postgres`, que ignora RLS, así que el backend sigue funcionando y la API REST pública de Supabase queda bloqueada. Compruébalo con una consulta a `pg_tables.rowsecurity`.
3. Limpieza elimina de `serverprisma` los duplicados `schema.sqlserver.prisma`, `schema.supabase.prisma` y `migrations-sql` (ya están archivados en `docslegacy`). Quita referencias rotas en el README.
4. Compatibilidad con Renderproxy
   - `app.set('trust proxy', 1)` en `serverapp.js` (el rate limit está detrás del proxy de Render).
   - `GET apihealth` → 200 `{ oktrue }` sin tocar la BD.
   - `server.js` usa `process.env.PORT` (Render lo inyecta; no definas `PORT` en Render).
   - Mueve `prisma` de `devDependencies` a `dependencies` (el build en Render necesita el CLI).
   - `HTTPS` debe quedar en `false` en producción (Render termina TLS).
5. CORS por whitelist desde `CORS_ORIGIN` (admite varios orígenes separados por coma, solo origen sin ruta ni `` final). Verifica que un origen no permitido es rechazado en `NODE_ENV=production`.
6. Frontend `config.js` usa `httplocalhost3000api` cuando `location.hostname` es `localhost``127.0.0.1`, y una constante `API_PROD_URL` (editable, con comentario) en cualquier otro caso. Si la primera petición tarda o falla por red (el plan gratis de Render se duerme tras ~15 min), muestra un mensaje accesible (`aria-live`) tipo El servidor está despertando, puede tardar hasta un minuto… con reintento automático (p. ej. 3 intentos con espera creciente), sin romper el manejo de errores 401403500 existente.
7. Datos en Supabase
   - Aplica `npm run dbdeploy` (con `DIRECT_URL`) y `npm run dbseed` contra Supabase.
   - Contraseñas de seed NUEVAS (genéralas con `crypto.randomBytes`, fuertes), distintas de las del reporte anterior. Guárdalas solo en `server.env` (`SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD`) y en el archivo local de §7. No las pongas en el README.
   - Confirma 5 categorías, 25 productos con variantes, 2 usuarios, punto de emisión y parámetros.
8. No ensucies la base de producción con pruebas. El smoke test (81 casos) crea usuarios, productos, pedidos y compras. Córrelo contra el PostgreSQL local (el portable de `CUsersjdavipgsql`, o el que corresponda; usa un `.env` aparte o variables de entorno para esa corrida) y contra Supabase haz solo una verificación ligera (conexión, `GET apiproductos`, login admin, `GET apihealth`). Si ya ensuciaste Supabase, déjalo limpio al final (`dbreset` con `CONFIRM_RESET=yes` y `dbseed`).
9. Re-corre smoke, E2E y accesibilidad (en local) y actualiza `docsevidencias` en UTF-8.
10. Commit y push de estos cambios (`git add -A`, re-escaneo de secretos, commit en español, push).

---

## 5. FASE 4 — `render.yaml` (Blueprint) Y DOCUMENTACIÓN

Crea `render.yaml` en la raíz del repo

- Servicio web `carresol-api` `type web`, `runtime node`, `rootDir server`, `region virginia`, `plan free`, `healthCheckPath apihealth`,
  `buildCommand npm install && npx prisma generate && npx prisma migrate deploy`, `startCommand npm start`.
  - Variables con valor `NODE_ENV=production`, `HTTPS=false`, `JWT_EXPIRES_IN=2h`, `BCRYPT_ROUNDS=12`.
  - Variables `sync false` (secretos, se piden al aplicar) `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN`.
- Sitio estático `carresol-web` (si FASE 0 = Static Site) publica la carpeta `frontend`, sin build, y las cabeceras de seguridad razonables.
- Ningún secreto dentro del archivo. Valida su sintaxis (carga como YAML) y que respeta el esquema de Blueprints de Render (consulta la documentación oficial si dudas de un campo).

Crea `docsDESPLIEGUE_RENDER.md` (para un estudiante principiante) qué es cada pieza (Supabase = BD, Render = API y sitio, GitHub = código), paso a paso con clics (Blueprint y alternativa manual con Root Directory `server`), cada variable con su nombre y de dónde sale su valor (sin valores reales), qué poner en `CORS_ORIGIN`, cómo probar `apihealth` y `apiproductos`, qué significa que el plan gratis se duerma, y cómo cambiar `API_PROD_URL` y redeplegar. Enlázalo desde el README (sección Despliegue, con los enlaces reales cuando existan).

Commit y push.

---

## 6. FASE 5 — RENDER

### Modo A — con API key de Render (si el estudiante la dio)
Usa la API REST de Render (`httpsapi.render.comv1`, consulta la documentación oficial para los payloads) con la key solo desde una variable de entorno de la sesión. Sin imprimirla ni guardarla.
1. Localiza el `ownerId` (workspace) del estudiante.
2. Crea el servicio web `carresol-api` desde `httpsgithub.comjscrash22carresol-fullstack` (rama `main`, `rootDir server`, comandos de §5, región Virginia, plan free, health check `apihealth`) y define sus variables de entorno `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` nuevo y largo (genéralo con `crypto.randomBytes(48).toString('hex')`), `NODE_ENV`, `HTTPS`, `JWT_EXPIRES_IN`, `BCRYPT_ROUNDS` y un `CORS_ORIGIN` provisional.
   - Si el repo es privado y Render no tiene acceso, plan B regístralo en `docsBLOQUEOS.md` con el único clic que debe hacer el estudiante (autorizar la app de GitHub en Render) y deja todo preparado.
3. Espera a que el despliegue termine (consulta el estado hasta `live`, con tiempo máximo razonable; el primer build puede tardar varios minutos) y revisa los logs si falla corrige y redepliega.
4. Con la URL real del API (`httpscarresol-api….onrender.com`)
   - Pon `API_PROD_URL = 'URLapi'` en `frontendconfig.js`, haz commit y push.
   - Crea el Static Site `carresol-web` (publica `frontend`) y espera su URL.
   - Actualiza `CORS_ORIGIN` del API con el origen exacto del sitio (solo origen, sin `` final) y espera el redespliegue.
5. Verificación extremo a extremo en línea `GET APIapihealth` → 200 (la primera vez puede tardar ~1 min reintenta); `GET apiproductos` → 25 productos; login admin con las contraseñas nuevas; una petición con `Origin` del sitio recibe cabeceras CORS y una con un origen ajeno no. Si puedes, corre el E2E de Playwright contra la URL del frontend en línea (solo lectura y login; no crees pedidos de prueba en producción, o límpialos).

### Modo B — sin API key (default)
No intentes automatizar el sitio web de Render. Deja todo listo y entrega, en lugar de acciones, instrucciones exactas
1. Verifica que el repo en GitHub está completo (FASE 1) y que `render.yaml` está en la raíz.
2. Genera el archivo local del §7 con los valores a pegar en Render.
3. En `docsREPORTE_DESPLIEGUE.md` y en tu resumen final escribe los clics exactos Render → New → Blueprint → repo `jscrash22carresol-fullstack` → pegar `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` y un `CORS_ORIGIN` provisional → Apply; copiar la URL del API → editar `API_PROD_URL` en `frontendconfig.js` → push → New → Static Site con Publish Directory `frontend` → copiar su URL → poner esa URL en `CORS_ORIGIN` del API → guardar (redepliega solo) → probar.

---

## 7. ARCHIVO LOCAL CON LOS VALORES PARA RENDER (fuera del repo)

Crea en el escritorio del estudiante `render-variables-SECRETO.md` con los valores reales listos para copiar y pegar en Render (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, las contraseñas nuevas del seed y las URL finales cuando existan), con un aviso en la primera línea Contiene secretos. NO lo subas a GitHub ni lo compartas. Bórralo cuando termines. Este archivo nunca entra al repo ni al zip. En `docsREPORTE_DESPLIEGUE.md` solo menciona que existe y dónde, sin su contenido.

---

## 8. CIERRE Y ENTREGA

1. Regenera el zip (`Reto2_Apellido_Nombre.zip` o `Reto2_Carresol.zip`) sin `.env`, `node_modules`, `.git`, `.db`, certificados ni el archivo del escritorio; verifica su contenido y que no tiene fugas (mismo escaneo de §2).
2. Actualiza el README sección Despliegue con los enlaces reales (repo, API, frontend) o, si el despliegue quedó en modo preparado, con los pasos. Sin contraseñas.
3. Escribe `docsREPORTE_DESPLIEGUE.md` y entrega este resumen final en el chat
   - ✅❌ por fase (GitHub, Supabase, código para la nube, render.yaml, Render, verificación en línea).
   - URLs repo, API, frontend (o pendiente + qué falta).
   - Resultado real de las pruebas (local y verificación en línea).
   - Qué debe hacer el estudiante borrar el archivo de Supabase y `render-variables-SECRETO.md` del escritorio; cambiar la contraseña de la base si viajó por chat; nota de que la primera carga del plan gratis tarda ~1 min; los clics pendientes si los hay; avisar al profesor de ese detalle.
   - Decisiones tomadas y bloqueos con su plan B.

---

## 9. DEFINICIÓN DE TERMINADO

- [ ] Repo `jscrash22carresol-fullstack` en GitHub, con `main` subido, sin secretos (escaneo limpio) y sin tocar el repo `carresol` del Reto 1.
- [ ] `server.env` conectado a Supabase desde el archivo del escritorio; `SELECT 1` correcto; sin imprimir la cadena.
- [ ] Migraciones PostgreSQL limpias (sin la de SQLite) aplicadas en Supabase con RLS activo en todas las tablas; seed con contraseñas nuevas.
- [ ] `trust proxy`, `apihealth`, `process.env.PORT`, `prisma` en dependencies, CORS whitelist verificado.
- [ ] `frontendconfig.js` con API localproducción y mensaje de servidor despertando con reintento.
- [ ] `render.yaml` válido sin secretos + `docsDESPLIEGUE_RENDER.md` + README actualizado.
- [ ] Render API y sitio desplegados y verificados en línea (Modo A) o todo listo con clics exactos (Modo B).
- [ ] Supabase sin datos de prueba residuales.
- [ ] Archivo `render-variables-SECRETO.md` en el escritorio (fuera del repo) y `docsREPORTE_DESPLIEGUE.md` escrito.
- [ ] Zip final verificado sin secretos.

Empieza ahora con la FASE 0.