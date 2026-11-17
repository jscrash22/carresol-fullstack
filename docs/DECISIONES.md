# Decisiones de implementación — Reto 2 (continuación)

Registro cronológico de las decisiones tomadas por el agente de continuación.
Cada fase agrega sus decisiones al final de este archivo.

---

## FASE 0 — Cuestionario y respuestas recibidas

| Pregunta | Respuesta / default aplicado |
|---|---|
| Apellido y nombre para el zip | **No se recibió** → el entregable se genera como `Reto2_Carresol.zip` (renombrable a mano, ver `docs/BLOQUEOS.md`). |
| Dónde corre PostgreSQL | **Supabase elegido** por el estudiante, pero el archivo `conexión supabase.txt` del escritorio llegó **vacío (0 bytes)**: solo se recibió la contraseña, sin la referencia del proyecto/host. **Plan B aplicado: PostgreSQL 16 local portable** (ver BLOQUEOS.md). |
| Credenciales de seed | Default: `admin@carresol.com` y `cliente@carresol.com`; contraseñas fuertes generadas con `crypto.randomBytes` (solo en `.env` y `REPORTE_FINAL.md`). |
| Módulo de compras | Default: **compras a proveedores que reponen el stock** (proveedores + órdenes de compra + recepción que suma inventario). |
| Despliegue | **No por ahora** ("lo del Render subimos después"): todo local; el README documenta cómo desplegar y qué origen agregar a `CORS_ORIGIN`. |
| Datos de facturación | Default: establecimiento `001`, punto de emisión `001`, IVA 15 %, moneda `USD`. |

## FASE 1 — Línea base (auditoría del estado heredado)

- **Verificado antes de tocar nada**: backend Express 5 + Prisma 6 (ES Modules) con SQLite,
  frontend MVC (JS puro, módulos ES) servido en `http://localhost:5500` y API en `http://localhost:3000`.
- **Hallazgo**: el `dev.db` existía pero **sin tablas ni datos** (la migración `20261110043125_init`
  nunca se había aplicado a ese archivo). Se ejecutó `prisma migrate deploy` + `prisma db seed`
  (25 productos, 2 usuarios) y con eso el smoke test heredado pasó completo:
  **21 PASS / 0 FAIL** (evidencia regenerada en `docs/evidencias/smoke-test-baseline.txt`, UTF-8).
- Entorno del estudiante: Windows 11, Node v24.21.0, git 2.55, **sin Docker ni psql instalados**.
  `npm.ps1` está bloqueado por la política de ejecución de PowerShell → en toda la documentación
  se usan comandos compatibles con PowerShell y `npm.cmd` cuando la terminal lo requiera.
- Repositorio git inicializado en el proyecto para commits por fase (no existe `remote`, sin push).
- El PDF `docs/diagrama_er_joyeria.pdf` (copiado de la carpeta Descargas del estudiante) no pudo
  ser leído por el runtime del agente (el modelo no soporta entrada PDF). Como el prompt indica
  que su transcripción del diagrama tiene prioridad, el modelo se implementó **desde la
  transcripción §4 del prompt**.

## FASE 2 — Base de datos PostgreSQL y modelo ER real

- **Motor**: PostgreSQL 16 **portable** (binarios EDB en `C:\Users\jdavi\pgsql`, datos en
  `C:\Users\jdavi\pgdata`), corriendo como proceso normal del usuario (sin Docker, sin servicio
  de Windows, sin permisos de administrador). El `docker-compose.yml` del repo pasó a ser
  `postgres:16` para quien tenga Docker (documentado en el README).
- **Contraseña de la BD local**: generada con `crypto.randomBytes` y guardada solo en
  `server/.env` como `DATABASE_URL`. La contraseña de Supabase recibida en la FASE 0 **no** se
  reutilizó ni se copió a ningún archivo del repo.
- **Modelo Prisma**: implementación completa del diagrama ER (`docs/diagrama_er_joyeria.pdf`)
  + módulo de compras, con `provider = "postgresql"`, nombres `snake_case` en la BD vía
  `@@map`/`@map` y nombres camelCase en Prisma.
- **BigInt → Number en la capa `server/models/`**: los ids de la BD son `bigint` (por el
  diagrama) pero la API responde números JSON normales; la conversión se hace al salir del
  modelo y el `sub` del JWT se firma como número. `JSON.stringify` nunca ve un BigInt.
- **Decimal → Number**: `numeric` se declara con precisión explícita
  (`@db.Decimal(12,2)`) y se convierte a `Number` en la capa de modelos.
- **Enums nativos de PostgreSQL** para todos los enumerados del diagrama.
- **`numero_pedido` y `numero_compra`**: secuencias dedicadas de PostgreSQL (`numero_pedido_seq`,
  `numero_compra_seq`) creadas en la migración con `nextval()` por defecto (no dependen del id PK).
- **Numeración de facturas**: `puntos_emision.ultimo_secuencial` incrementado con
  `UPDATE ... RETURNING` **dentro de la transacción del pedido** (bloqueo a nivel de fila);
  `numero = EEE-PPP-SSSSSSSSS` (9 dígitos). `clave_acceso` de 49 caracteres **simulada**
  (no es una clave real del SRI; documentado en el README).
- **Auditoría**: extensión de Prisma (`$extends`) en `server/models/db.js` que registra
  INSERT/UPDATE/DELETE de productos, variantes, pedidos (estados), compras y proveedores en la
  tabla `auditoria`, con `usuario_id` tomado de un `AsyncLocalStorage` por petición. Se eligió
  extensión JS en lugar de triggers SQL porque los triggers no pueden saber el `usuario_id`
  de la sesión que hizo el cambio.
- **Sin RLS**: la BD es local (no Supabase), por lo que no aplica activar RLS; el SQL de RLS
  quedó en `prisma/migrations-sql/rls_supabase.sql` (archivado) con instrucciones para cuando
  la BD se mueva a Supabase (ver BLOQUEOS.md).
- **Seed idempotente** (todo con `upsert`): roles, 2 usuarios, 5 categorías, materiales por
  categoría, los 25 productos del Reto 1 con ≥1 variante c/u (SKU único, stock 5–30,
  `tipo_medida` coherente con la categoría), imágenes principales apuntando a
  `assets/img/...`, punto de emisión 001/001, dirección de ejemplo del cliente y
  `parametros_sistema` (IVA 15 %, USD, costo de envío).
- Migraciones SQLite anteriores **eliminadas**; schema viejo y variantes archivadas en
  `docs/legacy/`. Se generó una migración inicial limpia para PostgreSQL con los
  `CHECK`s (stock ≥ 0, cantidad > 0, precios ≥ 0, `char_length(clave_acceso) = 49`).

## FASE 3–7 — Backend completo sobre el modelo ER (implementado y probado)

- **Routers nuevos** montados en `app.js`: `/api/{auth, productos, pedidos, direcciones, carrito,
  favoritos, contacto, compras, proveedores, inventario, admin}`; se habilitó `PATCH` en el CORS.
  Las secciones FASE 4 y FASE 6 que siguen más abajo eran el diseño; con esta fase quedan
  **implementadas y verificadas** contra la BD real.
- **Validadores** (`middleware/validators.js`): reescritura completa con patrón **fábrica de
  reglas** — las cadenas de express-validator son mutables, así que las variantes "parcial" (PUT)
  crean cadenas nuevas en lugar de mutar las de "alta" (POST). Cubre todos los endpoints del §6.
- **Bugs encontrados y corregidos durante las pruebas reales** (todos con corrida posterior en verde):
  1. Dos instancias de `AsyncLocalStorage` (una en `middleware/auth.js`, otra en `models/db.js`)
     → la auditoría habría registrado `usuario_id` nulo. Se unificó: `auth.js` importa la de `db.js`.
  2. Comparaciones `BigInt !== Number` en los chequeos de propiedad (anti-IDOR): `2n !== 2` es
     `true` en JS estricto → todo pedido con dirección respondía 403. Normalizadas con `Number()`.
  3. `adminModel.resumen()`: destructuraba como arreglo el objeto que devuelve
     `prisma.aggregate()` (no es iterable) → TypeError 500. Corregido.
  4. Borrado **físico** de producto sin ventas violaba la FK `variantes_producto_id_fkey`
     (la FK RESTRICT de `pedido_items` es intencional para preservar historial; el resto de
     dependencias son CASCADE). Ahora el borrado físico limpia las variantes en la misma transacción.
  5. `prisma/seed.js` quedó **doble-codificado** (UTF-8→CP1252→UTF-8) por un `Set-Content` de
     PowerShell usado para reemplazar la cédula. Reparado con mapeo inverso CP1252 (script
     desechable fuera del repo) y re-ejecutado el seed para re-verificar la idempotencia.
     **Lección**: nunca usar `Get-Content`/`Set-Content` de PowerShell sobre archivos UTF-8 con
     caracteres no-ASCII; siempre `fs.writeFileSync` (Node).
  6. La evidencia de línea base SQLite estaba en UTF-16 con mojibake CP850 (redirección `>` de
     PowerShell); convertida a UTF-8 legible en `docs/evidencias/smoke-test-baseline.txt`.
- **Smoke test §9 ampliado**: **73 PASS / 0 FAIL** sobre una BD reseteada (`prisma migrate reset`
  + seed), con evidencia en `docs/evidencias/smoke-test.txt` (UTF-8, escrita con
  `fs.writeFileSync`). Incluye los casos exigidos por §9 que faltaban en la primera versión:
  concurrencia sobre la última unidad (exactamente un 201 y un 409), facturas consecutivas sin
  repetir, user no puede cambiar el estado de su pedido, admin cancela y repone stock, no se
  edita una compra recibida, no se recibe una compra cancelada.
- **`docs/evidencias/ejemplos-endpoints.md`**: requests/responses reales generados con
  `scripts/ejemplos-endpoints.js`; JWT y contraseñas enmascarados (`<JWT_OMITIDO>`) y verificado
  automáticamente contra los valores reales de `.env` (0 filtraciones).

## FASE 4 — Pedidos transaccionales (contrato §6 del prompt; diseño verificado en FASE 3–7)


- `POST /api/pedidos` acepta el contrato nuevo (`{ direccionId, metodoPago, items:[{varianteId,cantidad}], ... }`)
  y **por compatibilidad** el viejo `{ productoId, cantidad }` (se resuelve a la variante única
  del producto cuando solo hay una).
- Todo el pedido se crea en **una sola `$transaction`**: pedido + items con snapshots + historial
  de estados + pago simulado + envío con snapshot de dirección + factura numerada + vaciado del
  carrito servidor + auditoría + movimientos de inventario.
- **Pago simulado** (`pasarela = "simulada"`): `tarjeta` → aprobado inmediato;
  `transferencia`/`deposito`/`contra_entrega` → `pendiente` hasta confirmación de un admin.
  Nunca se piden datos de tarjeta.
- Al **cancelar** un pedido aún no enviado, el stock se repone en la misma transacción.

## FASE 6 — Módulo de compras

- Interpretación confirmada en FASE 0: compras a **proveedores** que reponen inventario.
- Flujo de estados `borrador → ordenada → recibida` (+ `cancelada` desde borrador/ordenada).
  Una compra `recibida` no se edita ni se cancela.
- La recepción (`PATCH /api/compras/:id/estado` → `recibida`) suma stock **exactamente una vez**
  (idempotente: marca `fecha_recepcion` y reutiliza la transacción), escribe auditoría y
  `movimientos_inventario` con tipo `compra`.
- `movimientos_inventario` también registra las ventas (descuento de stock en pedidos) para
  trazabilidad completa del inventario.
- Totales siempre calculados en el servidor; IVA desde `parametros_sistema`.

## FASE 8 — Frontend (MVC) sobre la API real

- El carrito local guarda `varianteId`; al iniciar sesión se sincroniza con el carrito servidor
  (`PUT /api/carrito`) y al cargar se revalidan precios/stock contra la API.
- Checkout accesible por pasos: dirección (elegir/crear) → método de pago (radio group) →
  datos de facturación → resumen (subtotal, envío, IVA, total) → confirmación con número de
  pedido y factura. Envío mostrado como **estimado** ($10, parámetro `costo_envio_default`);
  el total definitivo lo calcula el servidor (así lo indica la vista).
- Panel admin con pestañas ARIA (`role="tablist"`, flechas de teclado): Resumen, Productos,
  Categorías/Materiales, Pedidos, Usuarios, Proveedores, Compras, Inventario, Mensajes,
  Parámetros y Auditoría.
- Favoritos: ligados a la cuenta cuando hay sesión; modo local conservado para invitados.
- Arquitectura respetada (§7): las **vistas solo pintan** (DOM APIs, sin innerHTML → anti-XSS),
  los **controladores orquestan** y los **modelos** hablan con la API. `carritoController` es
  dueño de los paneles carrito/favoritos y del modal de detalle; `catalogoController` recibe
  callbacks `{onVerDetalle, onToggleFav}`; `cuentaController` y `adminController` reconsultan
  su pestaña en cada visita.
- Carrito por variante con tope `mín(10, stock)`; favoritos híbridos (snapshot local para
  invitados; al hacer login se ligan al servidor con `POST` por favorito y al cerrar sesión
  vuelven a modo local).
- "Mi cuenta" (`#/cuenta`): pestañas Direcciones (CRUD completo + predeterminar) y Mis pedidos
  (con detalle expandible y cancelación con confirmación). El hash `#/pedidos` es un alias.
- Contrato de guardado en modales: `onGuardar → Promise<true|string|void>`; `true` cierra el
  modal, un `string` se muestra como error dentro del modal (no lanza excepciones).
- 401 de la API → evento `carresol:sesion-expirada` (apiClient) → el appController avisa con
  toast y redirige al login; `carresol:carrito-cambio` refresca contadores entre módulos.
- Extensión backend compatible: `authOpcional` (middleware que nunca falla; si hay token
  válido añade `req.usuario` y contexto de auditoría) y `GET /api/productos?inactivos=true`
  (solo se honra para admins, para que el panel admin vea y reactive productos inactivos).
- Bug corregido durante la verificación: el agrupado de variantes por material usaba claves
  `Number` frente a `select.value` (string) → claves normalizadas a `String`.
- Semántica PUT productos: variantes con `id` → update; sin `id` → create; faltantes → baja
  lógica. `activo`/`destacado` usan `optional()` para distinguir `false` de ausencia.

## FASE 8 — Verificación (evidencias en `docs/evidencias/`)

- Smoke test del backend ampliado a **75 PASS / 0 FAIL** (`smoke-test.txt`), incluidos los
  casos 63-64 del flag `?inactivos=true` (admin los ve, anónimo no).
- E2E del frontend con **Playwright headless (canal msedge, Edge del sistema, sin descargar
  navegadores)**: **37 PASS / 0 FAIL** (`e2e-frontend.txt`): catálogo invitado, detalle con
  selector material/medida, carrito por variante, favoritos local, login + sincronización,
  checkout con dirección/pago/facturación → pedido real (n.º, factura, clave de acceso),
  mi cuenta (direcciones/pedidos), sesión expirada 401 → login, admin con las 11 pestañas y
  modal de producto con editor de variantes; sin errores de JavaScript en consola.

## FASE 9 — Accesibilidad y verificación (evidencia en `docs/evidencias/`)

- Playwright **fue** instalable (directorio temporal fuera del proyecto, canal `msedge`
  para reutilizar el Edge del sistema): flujo funcional E2E 37 PASS + accesibilidad 31 PASS
  (`accesibilidad.txt`) + 18 capturas (`capturas/01-18`).
- **Contraste WCAG AA corregido**: botones dorados y filtros activos pasan de dorado
  (#b8860b, 3.25:1) a dorado oscuro (#8b6508, 5.30:1); badges verdes oscurecidos (#14602a,
  6.19:1). Resto de pares verificados en runtime (precio 7.46:1, nav 19.44:1, resumen 5.09:1).
- **Modal accesible arreglado** (bug detectado por las pruebas): la clase `.abierto` se
  añade ANTES de calcular los elementos enfocables (con `display:none` la lista quedaba
  vacía y el foco inicial nunca entraba al modal → la trampa de Tab no funcionaba). El foco
  inicial se aplica en el siguiente frame; el retorno de foco guarda una referencia directa
  al disparador (el botón "Ver detalle" no tenía id) y el modal tiene `tabindex="-1"` de
  respaldo.
- **Pestañas con flechas**: el foco se aplica DESPUÉS del re-render (antes, el botón
  enfocado se destruyera al reconstruir el tablist y las flechas dejaban de funcionar).
- Radios de dirección del checkout marcados `aria-required="true"`.
- **Red caída al revalidar la sesión NO cierra la sesión** (solo un 401 real la cierra):
  se conserva la sesión local y las siguientes acciones reintentan. Corregido `ApiError`
  para que `esRed` también sea cierto en fallos de `fetch` (código `RED`).
- Verificado además: skip-link primero en orden de foco y visible al enfocar, foco visible
  (`:focus-visible` 3px), alt en imágenes, `lang="es"`, tablists ARIA en cuenta y admin con
  flechas, tablas con `th[scope]`, nombre accesible en todos los controles del checkout,
  toasts en `role=status`, error de red con aviso `role=alert` + Reintentar que recupera,
  403 de cliente a `#/admin` redirige, y sin desbordamiento horizontal en móvil (375px).

## FASE 10 — P2 implementados (recuperación de contraseña)

- Del listado P2 ya existían de fases previas: cédula ecuatoriana (módulo 10) en el
  registro, bloqueo de login si `activo=false` (y revocación de sesión en el middleware),
  `ultimo_login` al entrar y columna `email_verificado` en el modelo.
- **Nuevos endpoints** `POST /api/auth/forgot-password` y `POST /api/auth/reset-password`
  usando la tabla `password_reset_tokens` del ER: la BD guarda **solo el hash SHA-256** del
  token (64 hex aleatorios), expira a los **30 minutos** y es **de un solo uso**; pedir uno
  nuevo invalida los pendientes del usuario.
- **Anti enumeración**: forgot-password responde siempre 200 con el mismo mensaje exista o
  no el correo. Sin servicio de correo en el reto, el token se devuelve **solo fuera de
  producción** (`NODE_ENV !== 'production'`) para poder probar el flujo; en producción
  viajaría únicamente por correo.
- Limitador de tasa propio (10 peticiones / 15 min por IP) en ambas rutas.
- Validaciones: token 64 hex obligatorio; contraseña con las mismas reglas del registro
  (8-72, mayúscula y número). El cambio de contraseña y el consumo del token ocurren en
  una misma transacción.
- Smoke test ampliado a **81 PASS / 0 FAIL** (casos 65-70): registro de un usuario smoke,
  forgot con mensaje genérico, correo inexistente sin filtrar información, token inventado
  → 401, token válido → login con la nueva contraseña, token de un solo uso y contraseña
  anterior revocada. El token nunca se imprime en la evidencia.
- No se añadió vista de recuperación en el frontend (§7 no la exige); los endpoints quedan
  listos y documentados para un futuro correo real.

## FASE 11 — Documentación, entrega y verificación del zip

- **Observación resuelta**: el catálogo pinta 8 tarjetas por página porque la paginación del
  Reto 1 (`POR_PAGINA = 8` en `catalogoView.js`) se conservó a propósito; hay 25 productos
  en 4 páginas. No es un bug.
- `docker-compose.yml` reescrito de SQL Server (heredado, obsoleto) a **PostgreSQL
  16-alpine** con healthcheck y contraseña por `--env-file server/.env`.
- `server/.env.example` con valores falsos y comentarios que explican cada variable,
  incluidos los tres sabores de `DATABASE_URL` (Docker, local, Supabase).
- `REPORTE_FINAL.md` en `docs/` (viaja dentro del zip): ✅/❌ por requisito del reto, por
  entidad del ER y por el módulo de compras; resultados reales de las pruebas; arranque en
  pocos comandos; credenciales del seed (inyectadas desde `server/.env` con un script que
  jamás las imprime por consola); decisiones/bloqueos/planes B y tareas manuales pendientes.
- Las credenciales del seed figuran SOLO en `server/.env` y en ese reporte (lo pide la spec);
  el `README.md` muestra solo credenciales de ejemplo.
- **`Reto2_Carresol.zip`** (renombrable, B02): staging con robocopy excluyendo
  `node_modules`, `.git`, `server/certs`, `server/.env`, `dev.db`, logs y zips; comprimido
  con `Compress-Archive` → **3,5 MB, 151 entradas**. Verificación en dos pasos: listado
  (sin contenido prohibido) y **escaneo de secretos** del contenido extraído contra los
  valores reales de `server/.env` (JWT_SECRET, DATABASE_URL, DIRECT_URL, POSTGRES_PASSWORD,
  MSSQL_SA_PASSWORD) → 0 fugas en 103 archivos de texto.

## FASE 12 — Despliegue en la nube (GitHub → Supabase → Render → GitHub Pages)

- **GitHub:** repo `jscrash22/carresol-fullstack` (público, creado por el estudiante). Se
  subió una rama huérfana `main` con un único commit limpio para no publicar historial
  local con posibles secretos. El repo `carresol` del Reto 1 no se tocó.
- **Email de commits:** `jscrash22@users.noreply.github.com` (config local del repo) para no
  publicar el correo personal en un repo público.
- **Supabase:** `DATABASE_URL` (Transaction pooler, 6543) y `DIRECT_URL` (Session pooler,
  5432) sobre `aws-1-us-east-1.pooler.supabase.com`. El archivo del escritorio traía la
  contraseña entre corchetes (`[clave]`): se limpiaron y la conexión `SELECT 1` funcionó.
- **RLS:** migración de Prisma `20261117000000_rls_public` que activa RLS en todas las
  tablas de `public` con un bloque `DO` dinámico (28/28 verificadas). Sin políticas: el rol
  `postgres` de Prisma la ignora y la API REST pública de Supabase queda bloqueada.
- **Contraseñas del seed:** rotadas con `crypto.randomBytes` (18 caracteres). Viven solo en
  `server/.env` y en `render-variables-SECRETO.md` del escritorio. `JWT_SECRET` de Render
  nuevo (96 hex), distinto del local.
- **Frontend:** GitHub Pages con la Action `.github/workflows/pages.yml` (publica
  `frontend/`). `frontend/config.js` usa `localhost` en desarrollo y `API_PROD_URL` en
  cualquier otro host. Se añadió reintento (3 intentos, espera creciente) y aviso
  `aria-live` para el arranque en frío del plan gratis de Render.
- **Render:** Blueprint `render.yaml` con un único servicio web `carresol-api` (rootDir
  `server`, Virginia, free, health check `/api/health`). El frontend NO usa Render.
- **Código para la nube:** `trust proxy`, `/api/health` sin BD, `process.env.PORT`, `prisma`
  movido a `dependencies`, `HTTPS=false`, CORS whitelist ya existente.
- **Zip:** `Reto2_Carresol.zip`, regenerado sin `.env`, `node_modules`, `.git`, `.db` ni
  secretos.