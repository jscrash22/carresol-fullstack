# 🧰 SUPER PROMPT FINAL — Carresol Reto 2

**Unifica y reemplaza** a `PROMPT_PULIDO_FINAL_OPENCODE.md` y `PROMPT_STOCK_IMAGENES_USUARIOS_OPENCODE.md` (no ejecutes esos dos por separado; todo está aquí), y añade un **endurecimiento** de riesgos detectados en una segunda revisión del proyecto.

Eres un ingeniero full stack senior que trabaja de forma **autónoma** sobre **Carresol (Reto 2)**, un proyecto **ya construido, probado y desplegado**:

- Repo `https://github.com/jscrash22/carresol-fullstack` (rama `main`, público).
- API en Render `https://carresol-api.onrender.com` (plan free, autoDeploy) · Frontend en GitHub Pages `https://jscrash22.github.io/carresol-fullstack/` (workflow `.github/workflows/pages.yml`) · BD en Supabase (PostgreSQL, RLS activo, plan free).
- `frontend/`: JS puro, módulos ES, MVC, router por hash. `server/`: Express 5 + Prisma 6, 27 tablas, 56 endpoints.
- Estado verificado antes de esta ronda: **81** casos de backend, **37** E2E y **31** de accesibilidad en PASS.

**Prioridad absoluta: NO DAÑAR lo que ya funciona.** Todo cambio es aditivo y está protegido por una red de seguridad (§2).

---

## 0. REGLAS DE OPERACIÓN

1. **Pregunta solo una vez**, al inicio y en un solo mensaje: *Apellido y Nombre* para `Reto2_Apellido_Nombre.zip` (default `Reto2_Carresol.zip`). Después, **cero preguntas**; decide con criterio y anótalo en `docs/DECISIONES.md`.
2. **No te detengas ante errores:** diagnostica, corrige, sigue. Si algo es imposible, aplica un plan B y anótalo en `docs/BLOQUEOS.md`.
3. **Secretos:** nunca imprimas ni escribas contraseñas, cadenas de conexión, `JWT_SECRET`, API keys ni tokens (consola, commits, README, reportes, evidencias). **No toques `server/.env`.**
4. **Windows/PowerShell.** Si `npm` falla por la política de ejecución usa `npm.cmd`/`npx.cmd`. El PostgreSQL local portable es inestable (`0xC0000142`): no cuentes con él.
5. **Nunca** `git push --force`. Commits pequeños, en español, uno por fase.
6. **Verifica de verdad:** nada se da por hecho sin ejecutarlo y comprobarlo.
7. **Qué NO se puede tocar** (contrato existente): rutas y campos actuales de la API (solo se **añaden**), la arquitectura MVC, el esquema de BD (esta ronda **no requiere migraciones**; si creyeras necesitar una, solo puede ser **aditiva**, no destructiva, y debe quedar justificada en `DECISIONES.md`), la estética blanco/dorado, la accesibilidad lograda, CORS por lista blanca, `requireRole`, validaciones y los tests existentes.
8. **Orden obligatorio:** §1 pregunta → §2 red de seguridad → §3 backend/infra → §4 frontend → §5 pruebas → §6 documentación → §7 despliegue → §8 zip y resumen.

---

## 1. PREGUNTA INICIAL (única)
Pregunta *Apellido y Nombre* para el nombre del zip y confirma en una línea que arrancas. Nada más.

---

## 2. RED DE SEGURIDAD (antes de cambiar una sola línea)

1. `git status` limpio; crea el tag `antes-del-super-prompt` y trabaja en la rama `mejoras-finales` (se fusiona a `main` solo al final, si todo pasa).
2. Instala dependencias y corre la **línea base**: smoke test del backend, E2E del frontend y accesibilidad. Guarda los números reales en `docs/DECISIONES.md` ("línea base"). Debe coincidir con 81 / 37 / 31; si no, documenta la diferencia antes de seguir.
3. **Respaldo de datos:** crea `server/scripts/respaldo-json.js` que vuelque las tablas de la BD configurada a `server/backups/AAAA-MM-DD_HHmm/*.json` (añade `server/backups/` a `.gitignore` y al excluir del zip) **sin imprimir datos sensibles**. Ejecútalo contra Supabase y guarda el resultado en el equipo (nunca en git).
4. **Protección de datos reales en Supabase.** La app está en línea y **puede haber usuarios o pedidos reales** además de los del seed. Antes de cualquier prueba escritura:
   - Cuenta usuarios, pedidos y productos. Si hay datos que **no** son del seed, **está prohibido** usar `db:reset` o `db:seed` con borrado en Supabase.
   - Las pruebas destructivas deben crear **datos propios identificables** (correos `test+<id>@carresol.test`, SKU/nombres con prefijo `TEST-`, productos de prueba creados por el propio test) y **no tocar datos reales**: las compras simuladas de las pruebas se hacen sobre **variantes de prueba**, nunca sobre el stock real de los 25 productos.
   - Al terminar, **limpia solo lo creado por las pruebas** (borra o desactiva por prefijo; si una FK impide borrar, desactiva y marca como `TEST`) y verifica por conteo que los datos reales quedaron intactos.
5. **Regla de regresión:** al cierre de cada fase corre el smoke test (subconjunto rápido) y los E2E afectados. Si un test que estaba en PASS pasa a FAIL y no lo arreglas razonablemente, **revierte el commit de esa fase** (`git revert`), anótalo en `docs/BLOQUEOS.md` y sigue con la siguiente.

---

## 3. BACKEND E INFRAESTRUCTURA

### 3.1 Endurecimiento (riesgos detectados en la revisión)
1. **Versión de Node fijada.** No hay `engines` ni versión definida en Render, así que depende del valor por defecto de la plataforma. Añade `"engines": { "node": ">=20" }` en `server/package.json`, un archivo `server/.node-version` con el **major LTS que usa el estudiante en local** (`node -v`, mínimo 20) y la variable `NODE_VERSION` en `render.yaml`. Consulta la documentación vigente de Render para confirmar el mecanismo. Si el servicio ya existe y no puedes cambiarlo por API, deja el paso manual en `docs/DESPLIEGUE_RENDER.md`.
2. **Timeouts de transacción.** Las `$transaction` interactivas de Prisma tienen 5 s por defecto y ahora crean pedido + items + pago + envío + factura + historial + auditoría. Con arranque en frío o latencia con Supabase pueden fallar con "Transaction already closed". Pasa `{ maxWait: 10000, timeout: 20000 }` a las transacciones largas (crear pedido, cancelar pedido, recibir compra, crear/editar producto con variantes e imágenes) y comprueba que los errores de transacción se mapean a una respuesta consistente (503/500 sin stacktrace).
3. **Límite del body.** `express.json({ limit: '10kb' })` es demasiado justo para compras con muchos items o productos con varias variantes e imágenes. Súbelo a `64kb` globalmente, manteniendo validación estricta de tamaños de arrays (máx. items/variantes/imágenes) para no abrir una puerta a abusos.
4. **Rate limit razonable para una demo.** Login: 20 intentos/15 min/IP y registro: 10/15 min/IP pueden bloquear a toda una clase detrás de la misma IP. En login usa `skipSuccessfulRequests: true` (solo cuentan los fallos) y haz los límites configurables por entorno (`RATE_LOGIN_MAX`, `RATE_REGISTER_MAX`, con los defaults actuales o más holgados para registro, p. ej. 20/hora). Mantén el rate limit de contacto y de recuperación de contraseña.
5. **Errores del proceso.** Añade `process.on('unhandledRejection')` y `uncaughtException` que registren con el logger (sin datos sensibles) y terminen el proceso con código 1 para que Render lo reinicie limpio; conserva el cierre ordenado con `$disconnect`.
6. **Seed seguro.** El seed lee `SEED_ADMIN_PASSWORD`/`SEED_USER_PASSWORD`; verifica que **aborte con un mensaje claro** si faltan o son demasiado cortas (< 10), que **no** tenga ninguna contraseña por defecto escrita en el código y que **nunca** se ejecute automáticamente en el build de Render (`render.yaml` no debe llamar a `db:seed`).
7. **Dependencias (`npm audit`).** El reporte actual marca 3 avisos *high* en la cadena `prisma → @prisma/config → deepmerge-ts` (agotamiento de pila al fusionar grafos recursivos). Es del **CLI de Prisma**, no del servidor en ejecución. **No ejecutes `npm audit fix --force`**: instalaría Prisma 7 (cambio incompatible). Actualiza solo a la última 6.x compatible (`npm update` dentro del rango, probado con el smoke test) y **documenta el riesgo aceptado** en README ("Limitaciones").
8. **Supabase gratis se pausa** tras ~7 días de poca actividad (la API dejaría de responder hasta reanudarlo desde el panel). Crea `.github/workflows/keepalive.yml` con `cron` **diario** y `workflow_dispatch` que haga `curl -fsS --retry 5 --retry-delay 20 --max-time 120 https://carresol-api.onrender.com/api/productos` (consulta la BD, solo lectura; sin secretos). Documenta: qué es, que GitHub puede desactivar workflows programados tras un periodo largo sin actividad en el repo, y cómo **reanudar** un proyecto pausado (Supabase → proyecto → *Resume project*).
9. **Arranque en frío de Render** (se duerme tras ~15 min sin tráfico): no lo "arregles" con pings continuos; ya existe el aviso "servidor despertando" en el frontend. Documenta en README el calentamiento previo a una demo.

### 3.2 Funciones nuevas (aditivas)
1. **`GET /api/config-publica`** (sin auth, caché corta): subconjunto **permitido** de `parametros_sistema` (IVA %, moneda, costo de envío por defecto). El frontend lo usa para el resumen del carrito/checkout (hoy el IVA y el envío estimado están duplicados en `config.js`), con las constantes actuales como *fallback*. El servidor sigue recalculando todo al crear el pedido.
2. **Imágenes múltiples por producto:** extiende `POST/PUT /api/productos(/:id)` para aceptar `imagenes: [{ url, altText, esPrincipal, orden, materialId? }]`, que reemplaza el conjunto **dentro de la transacción** (exactamente **una** principal; auditoría incluida). Mantén compatibles los campos `imagen` y `alt`. Valida (cliente y servidor) que cada `url` sea ruta relativa que empiece por `assets/img/` **o** URL `https://`; rechaza `javascript:`, `data:`, `http:` y `..`; `altText` obligatorio; longitud ≤ 300; máximo razonable de imágenes por producto.
3. **`PATCH /api/admin/usuarios/:id`** con `{ activo?, role? }` (JWT + admin, validación estricta). Reglas: un admin **no puede desactivarse ni quitarse el rol a sí mismo** y **no se puede dejar el sistema sin un admin activo** (409 con mensaje claro); todo cambio va a `auditoria`. *Nota verificada:* `authRequired` ya comprueba `activo` en cada petición, así que una cuenta desactivada pierde acceso en la siguiente; solo hay que **probarlo**. El listado de usuarios nunca devuelve `password_hash` ni `token_hash`.
4. Mantén el contrato de todos los endpoints existentes y actualiza la tabla de endpoints del README (incluye `config-publica`, `imagenes` y el `PATCH` de usuarios).

---

## 4. FRONTEND

### 4.1 Almacenamiento correcto (`localStorage` vs `sessionStorage`)

**Observación del estudiante:** sin iniciar sesión, cerró el navegador, abrió la página en otra ventana y apareció "donde la había dejado".
**Hechos verificados en el código:** token y usuario en `sessionStorage` (`apiClient.js`); carrito y favoritos en `localStorage` (`carritoModel.js`, `favoritosModel.js`); el router es por **hash** (la vista vive en la URL); **no** se guarda estado de pantalla; **al cerrar sesión NO se limpia** el carrito ni el espejo de favoritos; al iniciar sesión el carrito local se **fusiona** con el del servidor **sin comprobar de quién era** (si A cierra sesión y entra B, el carrito de A acaba en B).

**Diagnóstico obligatorio:** reproduce el escenario con Playwright en **contexto persistente** (`launchPersistentContext` con `userDataDir` temporal) y determina **qué reaparece** (carrito/favoritos, vista por hash u otra cosa). Documenta la causa real en `DECISIONES.md`.

**Política a implementar:**

| Dónde | Qué guarda | Por qué |
|---|---|---|
| `localStorage` | Carrito y favoritos de invitado, **dueño** (`invitado` o `usuarioId`), versión y fecha del carrito | Es lo que debe sobrevivir al cierre del navegador (requisito del reto) |
| `sessionStorage` | Token JWT y usuario (ya está) + **estado de pantalla**: filtros, búsqueda, orden y página del catálogo, pestaña activa del admin, paso del checkout y **borradores** de formularios (nunca contraseñas) | Estado temporal; no sobrevive al cierre de la pestaña |
| URL (hash) | Vista actual | Enlaces directos y botón Atrás |
| Nunca | Contraseñas, datos de tarjeta, tokens en `localStorage`, estado de pantalla en `localStorage` | Seguridad y privacidad |

**Cambios:**
1. Centraliza todo el acceso en `frontend/models/almacenamiento.js` (prefijo `carresol_`, `JSON.parse` seguro con valor por defecto, `try/catch`, funciones `local.*` y `sesion.*`). No debe quedar `localStorage`/`sessionStorage` directo fuera de ese archivo.
2. **Dueño del carrito/favoritos locales:** al iniciar sesión, si el dueño es `invitado` → **fusionar** con el del servidor; si es **otro usuario** → **descartar** lo local (nunca fusionar) y cargar el del servidor. Al **cerrar sesión** (manual o por 401/expiración), si el dueño era un usuario → **vaciar** carrito local, espejo de favoritos y borradores, y volver a `invitado`.
3. Una ventana/pestaña **nueva** (sin estado en `sessionStorage`) arranca en inicio/catálogo con filtros por defecto; un enlace directo con hash a una vista **pública** se respeta; una vista **protegida** sin sesión redirige a login y regresa al destino tras entrar (verifícalo).
4. Al arrancar, si el JWT guardado ya expiró (`exp`), cierra la sesión local sin llamar a la API y avisa con `aria-live`. Si la sesión caduca **en pleno checkout**, conserva el carrito y los borradores y vuelve al checkout tras el login.
5. Carrito con versión de formato (`carresol_carrito_v`) y descarte con aviso de formatos antiguos; escucha el evento `storage` para sincronizar el contador y el panel entre pestañas.

### 4.2 Stock que se refresca (problema reportado)
**Hecho verificado:** el backend **sí** descuenta el stock (condicional y atómico, y lo repone al cancelar). El frontend **no lo refleja**: `cargarCatalogo()` solo se llama al arrancar (`appController.js`) y tras confirmar el pedido solo se vacía el carrito; tarjetas, detalle y tope del carrito muestran el stock viejo hasta recargar.
1. En `catalogoController.js` crea `recargarCatalogo({ silencioso })` (sin spinner de pantalla completa ni anuncios molestos) y el evento `carresol:catalogo-invalidado` (mismo patrón que `carresol:carrito-cambio`).
2. **Invalida y recarga** tras: pedido confirmado, pedido **fallido por stock** (además ajusta el carrito al stock real y avisa de forma accesible), cancelación de pedido, y cambios del admin (productos/variantes, compra recibida, cambio de estado o cancelación de pedido, ajustes de inventario).
3. **Frescura al navegar:** al entrar en `#/inicio` o `#/catalogo`, si los datos tienen más de 30 s, recarga en segundo plano; al abrir el panel del carrito, revalida precios/stock de su contenido.
4. Tarjeta/detalle: "Quedan N" cuando N ≤ `stock_minimo` (o ≤ 5) y "Agotado" (botón deshabilitado) en 0; tope del carrito = mín(10, stock). Documenta la regla: **el stock se descuenta al crear el pedido** (reserva) aunque el pago simulado esté `pendiente`, y se **repone al cancelarlo** si aún no fue enviado.

### 4.3 Imágenes en el panel admin (problema reportado)
**Hecho verificado:** la tabla de productos no tiene miniatura y el modal solo trae un campo de texto "Ruta de imagen" sin vista previa ni soporte para varias imágenes.
1. **Miniatura** (≈ 48 px, `object-fit: cover`, `alt` real, `loading="lazy"`, fallback accesible con `role="img"`/`aria-label`) en la tabla de productos.
2. **Vista previa en vivo** en el modal (debounce; mensaje `aria-live="polite"` si no carga) y `alt` obligatorio cuando hay imagen.
3. **Varias imágenes** en el modal: miniatura + ruta + alt, marcar **principal** (radio), ordenar, agregar y quitar (usa la API de §3.2.2).
4. Muestra **miniatura + `Nombre — Material — Medida (SKU)`** en Inventario/stock bajo, en el selector de variantes de Compras y en las filas de Pedidos/Detalles.
5. Documenta cómo agregar imágenes (archivo en `frontend/assets/img/<categoría>/` + commit y push para que Pages lo publique, o URL `https://`) y deja como **mejora futura** la subida de archivos (p. ej. Supabase Storage); **no** la implementes.

### 4.4 Usuarios (pregunta: "¿se pueden crear usuarios reales?")
**Respuesta verificada:** **sí**. `POST /api/auth/register` es público y el frontend tiene el formulario; el rol siempre es `user`. Valida nombre, correo, contraseña (≥ 8, mayúscula y número), teléfono y **cédula ecuatoriana** opcional; usa bcrypt y rate limit. **Limitaciones:** no hay verificación de correo (la columna `email_verificado` existe pero nada la usa); **la recuperación de contraseña no funciona en producción** (no hay envío de correo, y el token no se expone fuera de desarrollo, lo cual es correcto); el panel solo **listaba** usuarios.
1. **Pestaña Usuarios (admin):** activar/desactivar y cambiar rol con **modal de confirmación accesible** y las salvaguardas de §3.2.3.
2. **Aviso de demostración** visible y accesible en el registro, el checkout y el pie: *"Tienda de demostración académica: los pedidos y pagos son simulados y no se envía ningún producto. Evita ingresar datos personales sensibles reales."* La cédula sigue siendo opcional.
3. **No implementes** verificación por correo ni envío de emails. **Documenta** en el README una FAQ "¿Se pueden crear usuarios reales?" y las limitaciones, y sugiere integrar SMTP/Resend en el futuro.

### 4.5 Detalles de calidad
- Usa `GET /api/config-publica` (IVA/envío) con *fallback* local.
- Mantén accesibilidad: foco, `aria-*`, contraste AA, `prefers-reduced-motion`; respeta el estilo existente.
- Los comentarios del código que prometan algo que no ocurre (p. ej. "se revalidará al recargar") deben corregirse.

---

## 5. PRUEBAS (todo en UTF-8: `fs.writeFileSync(..., 'utf8')`, nunca redirecciones de PowerShell)

**Regresión:** los 81 del backend, 37 E2E y 31 de accesibilidad siguen en PASS (actualiza solo lo que dependa de las claves de almacenamiento anteriores). Los casos de `forgot-password`/`reset-password` salen como **`SKIP` con motivo** cuando se corre contra producción (detecta `NODE_ENV` o un flag), no como FAIL.

**Nuevas** (`docs/evidencias/e2e-super-prompt.txt` y ampliación del smoke test; reporta PASS/FAIL reales):
1. **Almacenamiento:** invitado agrega producto y favorito → cierra el navegador (contexto persistente) → reabre: carrito y favoritos siguen, `sessionStorage` vacío, arranca sin filtros; filtros persisten al recargar la **misma pestaña** y no en una **nueva**; login → F5 sigue logueado, ventana nueva no; cerrar sesión limpia carrito/espejo/borradores/dueño; **A cierra sesión y B inicia sesión: B no ve lo de A**; invitado con carrito que inicia sesión: se **fusiona**; token expirado al arrancar → sesión cerrada con aviso; sesión caducada en checkout conserva carrito y vuelve; **prueba estática**: ningún `localStorage`/`sessionStorage` fuera de `almacenamiento.js`.
2. **Stock** (sobre una **variante de prueba**): comprar 2 unidades → sin recargar la tarjeta y el detalle muestran N−2; admin (Productos e Inventario) ve N−2 y un movimiento `venta`; pedido que falla por stock ajusta el carrito; cancelar repone y se ve sin recargar; el admin edita stock y el catálogo lo refleja al volver a `#/catalogo`.
3. **Imágenes:** miniaturas en la tabla; vista previa en el modal; rutas inválidas (`javascript:alert(1)`, `http://…`, `../x.png`) rechazadas por UI y API (400/422); producto con 2 imágenes deja exactamente una principal; el catálogo muestra la principal; usuario no admin → 403.
4. **Usuarios:** registro válido → login → `GET /api/auth/me`; `role: "admin"` en el body → queda `user`; correo duplicado 409; contraseña débil y cédula inválida 422; el admin desactiva un usuario y su token **anterior** deja de funcionar en la siguiente petición (401/403); reactivar lo restaura; el admin **no** puede desactivarse ni quitarse el rol ni dejar el sistema sin admin (409); usuario normal en el `PATCH` → 403; el aviso de demostración aparece en registro, checkout y pie.
5. **Endurecimiento:** pedido de 10 items completa sin error de transacción (mide y registra el tiempo); body de ~40 KB válido pasa y uno excesivo recibe 413 consistente; login con credenciales correctas **no** consume el límite; `GET /api/config-publica` devuelve solo campos permitidos; el seed aborta sin contraseñas; con `NODE_ENV=production` el CORS rechaza un origen ajeno.
6. **Accesibilidad:** miniaturas con `alt`, modales, vista previa con `aria-live`, pestaña de usuarios, avisos.
7. Compara contra la línea base (§2): **ningún test regresó**.

---

## 6. DOCUMENTACIÓN

1. **Enlaces rotos:** `README.md`, `docs/REPORTE_FINAL.md`, `docs/DECISIONES.md` y `docs/BLOQUEOS.md` apuntan a `docs/evidencias/smoke-test.txt`, que **no existe** (se llama `smoke-test-local.txt`). Corrige y **comprueba por script que ningún enlace/ruta a archivos de la documentación queda roto**.
2. **Documentos que se contradicen:** `REPORTE_FINAL.md` y `BLOQUEOS.md` (B01, B03, B07) describen un estado antiguo (Supabase sin conectar, RLS pendiente, PostgreSQL local, `migrations-sql/rls_supabase.sql` que ya no existe). Actualízalos: **B01 → RESUELTO** (Supabase conectado, RLS por migración `20261117000000_rls_public`, API desplegada), conservando el historial como "histórico". Ningún documento debe contradecir a `docs/REPORTE_DESPLIEGUE.md`. Elimina todas las rutas personales (`C:\Users\...`).
3. **`server/.env.example`:** corrige el comentario de `DIRECT_URL`. En Supabase gratis la conexión directa `db.<ref>.supabase.co` suele ser solo IPv6 y falla en muchas redes; para migraciones se usa el **Session pooler (5432)**. Mismo criterio en README y `DESPLIEGUE_RENDER.md`. Añade `RATE_LOGIN_MAX`, `RATE_REGISTER_MAX` y `NODE_VERSION` donde corresponda.
4. **README — secciones nuevas o actualizadas:** *Almacenamiento en el navegador* (tabla de §4.1, justificación del token en `sessionStorage`, riesgo XSS frente a cookies `httpOnly`); *Reglas de stock*; *Cómo agregar imágenes*; *Gestión de usuarios* y FAQ "¿Se pueden crear usuarios reales?"; *Limitaciones y mejoras futuras* (sin verificación de correo, recuperación de contraseña solo en desarrollo, arranque en frío de Render, **pausa de Supabase gratis y cómo reanudarla**, aviso `npm audit` aceptado, subida de archivos pendiente, `Ctrl+F5` tras un despliegue porque GitHub Pages cachea los módulos unos minutos); totales de pruebas y rutas de evidencia actualizadas; tabla de endpoints con lo nuevo.
5. **Raíz del repo:** elimina los archivos sueltos `# 🚀 DESPLIEGUE — Carresol Reto 2 GitHub → Supabase → Render.md` y `.txt` (copias del prompt anterior; el `.txt` está vacío). Guarda este archivo y los prompts útiles solo en `docs/prompts/`.
6. Escaneo de secretos sobre `git ls-files` antes de cada commit (solo archivo y línea, nunca el valor).

---

## 7. DESPLIEGUE Y VERIFICACIÓN

1. Con todo en PASS: fusiona `mejoras-finales` en `main` (sin `--force`) y `git push origin main`. Comprueba que el workflow de **GitHub Pages** termina en éxito y que **Render** redespliega (`/api/health` 200; la primera respuesta puede tardar ~1 min). Si hay `RENDER_API_KEY` en el entorno de la sesión, úsala para fijar `NODE_VERSION` y comprobar el estado; **nunca la imprimas ni la guardes**. Sin key, deja el paso manual documentado.
2. **Verificación de humo en línea, solo lectura:** `GET /api/health`, `GET /api/productos` (25 productos), `GET /api/config-publica` y la carga de `https://jscrash22.github.io/carresol-fullstack/`; una petición con un `Origin` ajeno **no** recibe cabeceras CORS. **No** crees pedidos ni usuarios de prueba en producción en esta verificación.
3. Confirma que el workflow `keepalive.yml` aparece en la pestaña *Actions* (ejecútalo una vez con `workflow_dispatch`).
4. Verifica por conteo que los **datos reales** de Supabase (usuarios, pedidos, productos) quedaron intactos y que el stock de los 25 productos es el esperado.

---

## 8. ZIP Y RESUMEN FINAL

1. Regenera el zip (`Reto2_Apellido_Nombre.zip` o `Reto2_Carresol.zip`) con **rutas con `/`** (usa `tar` o `7z`; **no** `Compress-Archive` de PowerShell 5, que genera `\`). Incluye `frontend/`, `server/` (con `prisma/schema.prisma`, `migrations/`, `seed.js`, `.env.example`), `docs/`, `README.md`, `render.yaml`, `docker-compose.yml`, `.github/`, `.gitignore`. **Excluye** `.env`, `node_modules/`, `.git/`, `server/backups/`, bases SQLite, certificados y cualquier archivo del escritorio.
2. Verifica el zip: lista su contenido, confirma que no hay `.env`/`node_modules`/`backups`, rutas con `/`, pocos MB y **sin fugas** (escaneo de secretos sobre el contenido).
3. Entrega en el chat un **resumen final** con: ✅/❌ por cada fase; números reales de las pruebas **frente a la línea base** (81/37/31 + nuevas); la **causa real** del comportamiento de almacenamiento observado; decisiones y bloqueos con su plan B; los riesgos que quedan abiertos (pausa de Supabase, arranque en frío, aviso de `npm audit`); y lo que el estudiante deba hacer a mano (borrar archivos de credenciales del escritorio, rotar la contraseña de Supabase si viajó por chat, revocar la API key de Render, renombrar el zip si aplica).

---

## 9. DEFINICIÓN DE "TERMINADO"

- [ ] Línea base registrada, tag `antes-del-super-prompt`, respaldo JSON hecho; **ninguna regresión** frente a 81/37/31.
- [ ] Datos reales de Supabase intactos y pruebas limpias tras sí mismas.
- [ ] Node fijado, timeouts de transacción, límite de body, rate limits configurables, handlers de proceso, seed seguro, riesgo de `npm audit` documentado, keepalive diario.
- [ ] `GET /api/config-publica`, `imagenes` múltiples y `PATCH /api/admin/usuarios/:id` con salvaguardas y auditoría; contrato anterior intacto.
- [ ] Almacenamiento centralizado con dueño, limpieza al cerrar sesión y sin mezcla entre usuarios; estado de pantalla en `sessionStorage`; ventana nueva arranca limpia; causa del comportamiento observado documentada.
- [ ] Stock visible actualizado **sin recargar** tras pedido, fallo, cancelación y cambios del admin.
- [ ] Admin con miniaturas, vista previa, validación y varias imágenes; selectores identificables.
- [ ] Gestión de usuarios en el admin, aviso de demostración y FAQ de usuarios reales.
- [ ] Documentación sin enlaces rotos ni contradicciones ni rutas personales; README completo.
- [ ] Push a `main`, Pages y Render desplegados y verificados en línea (solo lectura).
- [ ] Zip final con rutas `/`, sin secretos, `node_modules`, `.env` ni backups; resumen final entregado.

**Empieza ahora preguntando (una sola vez) Apellido y Nombre para el zip.**
