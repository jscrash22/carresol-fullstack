# 🔁 CONTINUACIÓN — Carresol Reto 2: migrar al modelo ER real (PostgreSQL) + módulo de compras + cierre del proyecto

Eres un ingeniero full stack senior que **retoma un proyecto a medias** escrito por otro agente. Trabajas de forma **autónoma**: el estudiante se va a dormir apenas responda tu cuestionario inicial y quiere despertar con todo terminado, probado y empaquetado.

---

## 0. REGLAS DE OPERACIÓN

1. **Pregunta solo una vez** (FASE 0, un solo mensaje). Después, cero preguntas: decide con criterio, anótalo en `docs/DECISIONES.md`.
2. **No te detengas ante errores.** Diagnostica, corrige, sigue. Si algo es imposible, aplica un plan B, anótalo en `docs/BLOQUEOS.md` y continúa.
3. **No pidas confirmaciones** para instalar paquetes ni correr comandos del proyecto.
4. **Secretos:** nunca imprimas contraseñas ni cadenas de conexión completas en logs, README ni commits. Solo viven en `server/.env` (ignorado por git).
5. **Verifica de verdad:** nada se da por terminado sin haberlo ejecutado contra la BD real y guardado la evidencia.
6. **Haz commits por fase** (mensajes en español). No hagas `push` salvo que el cuestionario lo pida.
7. Todo el código, comentarios, README y textos de UI van **en español**.
8. **El entorno del estudiante es Windows** (se ven binarios `windows` de Prisma y shims `.ps1/.cmd` en `node_modules`). Los comandos que documentes deben funcionar en **PowerShell**; evita sintaxis solo-bash en los scripts de npm y usa Node para lo multiplataforma. Al guardar salidas a archivo, **fuerza UTF-8** (ver §9: la evidencia anterior quedó en UTF-16).
9. **Prioridad si el tiempo aprieta:** primero **P0** (el reto sigue cumpliéndose), luego **P1** (modelo ER), luego **P2** (extras). Nunca dejes el proyecto en un estado roto: si una fase falla a medias, revierte esa fase y documenta.

---

## 1. QUÉ ES ESTE PROYECTO

**Carresol** es una tienda de joyería de lujo (estética blanco/dorado, Playfair Display + Poppins). Nació como proyecto 1 (frontend estático con carrito) y ahora es el **Reto 2 de "Desarrollo de Plataformas"**: una plataforma full stack tipo e-commerce.

### Requisitos originales del Reto 2 (SIGUEN VIGENTES, no pueden romperse)

- **Frontend MVC** en `/frontend/{models,views,controllers,assets}` + `index.html` semántico y accesible.
- **Backend MVC** en `/server/{routes,controllers,models,middleware,prisma}` con Node.js/Express.
- **Persistencia relacional con Prisma** (SQL Server u otro motor relacional) con al menos: Producto, Usuario, Pedido, PedidoDetalle.
- **Endpoints mínimos:**
  - `POST /api/auth/login` (devuelve JWT), `POST /api/auth/register`.
  - `GET /api/productos` y `GET /api/productos/:id` (públicos); `POST/PUT/DELETE /api/productos(/:id)` (JWT + admin).
  - `POST /api/pedidos` (JWT), `GET /api/pedidos/mis-pedidos` (JWT), `GET /api/pedidos` (JWT + admin).
- **Seguridad:** JWT Bearer, roles admin/user, CORS con whitelist (sin `*`), bcrypt, validación + sanitización (express-validator), errores centralizados sin stacktrace, logger. README con **≥ 3 riesgos OWASP** y su mitigación.
- **Frontend:** catálogo desde la API, carrito persistente (localStorage), **login obligatorio para comprar**, checkout que envía a `POST /api/pedidos`, panel admin (CRUD productos + vista de todas las tablas, solo visible para admin).
- **Accesibilidad:** HTML semántico, teclado, foco visible, labels, ARIA en dinámicos, contraste AA.
- **Entregables:** `Reto2_Apellido_Nombre.zip` con frontend, backend, Prisma schema + migraciones, `.env.example` (sin secretos), `README.md` completo.
- **7 pruebas mínimas con evidencia:** (1) login admin → token; (2) crear producto (admin); (3) user crear producto → 403; (4) catálogo visible en frontend; (5) carrito funciona y persiste; (6) confirmar pedido (user) → pedido en BD; (7) admin ve todos los pedidos.

---

## 2. ESTADO ACTUAL (lo que YA existe; inspecciónalo tú mismo antes de tocar nada)

El proyecto está en la raíz del directorio actual (puede estar dentro de una carpeta `carresol-main/`; adáptate). Un agente anterior dejó hecho lo siguiente:

**Backend (`server/`) — funcional**, ES Modules, Express 5, Prisma 6, `bcryptjs`, `jsonwebtoken`, `express-validator`, `helmet`, `express-rate-limit`.
- `server.js`, `app.js`, `routes/{auth,productos,pedidos,admin}.js`, `controllers/*`, `models/{db,productoModel,usuarioModel,pedidoModel,adminModel}.js`, `middleware/{auth,errorHandler,rateLimit,validators}.js`, `utils/{logger,respuestas}.js`.
- `models/pedidoModel.js` ya implementa la creación de pedidos **segura**: precios leídos de la BD (nunca del cliente), validación de stock, descuento condicional atómico dentro de `$transaction`, IVA 15 %.
- `scripts/{smoke-test,reset-confirmado,serve-frontend}.js`. El smoke test anterior terminó en **21 PASS / 0 FAIL** (cubre las 7 pruebas + negativos: stock insuficiente, anti mass-assignment de `role`, email duplicado, validación, `/admin/usuarios` sin `passwordHash`).
- Respuestas JSON consistentes: `{ ok, data }` / `{ ok:false, error:{ codigo, mensaje, detalles } }`.
- Extras de admin: `GET /api/admin/{usuarios,pedidos,detalles,resumen}`.

**Base de datos — PROVISIONAL (esto es lo que hay que reemplazar):**
- `server/prisma/schema.prisma` activo usa **SQLite** (`file:./dev.db`) con solo 4 modelos simples: `Producto`, `Usuario`, `Pedido`, `PedidoDetalle` (ids `Int`).
- Existen variantes viejas `schema.sqlserver.prisma` y `schema.supabase.prisma`, `prisma/migrations-sql/{crear_bd_sqlserver,rls_supabase}.sql` y `docker-compose.yml` (SQL Server). Una migración SQLite `20261110043125_init`.
- `server/.env` existente (NO lo muestres ni lo copies a ningún lado): `DATABASE_URL` apunta a SQLite; `DIRECT_URL` es un placeholder de Supabase.

**Frontend (`frontend/`) — funcional**, MVC con JS puro y módulos ES:
- `models/{apiClient,authModel,productoModel,carritoModel,favoritosModel,pedidoModel,adminModel}.js`
- `views/{catalogoView,productoCard,carritoView,loginView,pedidosView,adminView,uiComponents}.js`
- `controllers/{appController,authController,catalogoController,carritoController,pedidoController,adminController}.js`
- `config.js` (API_BASE_URL), `data/productos.json`, imágenes en `assets/img/{anillos,aretes,collares,pulseras,relojes,fondo}`.

**Pendientes y defectos conocidos que debes corregir:**
1. **`README.md` está desactualizado**: describe el Reto 1 (sitio estático). Hay que reescribirlo completo para el Reto 2.
2. `docs/evidencias/smoke-test.txt` está guardado en **UTF-16** (ilegible en muchos visores). Regenerarlo en UTF-8.
3. La base es SQLite (Plan B) y el modelo es el simplificado. El estudiante diseñó un **modelo ER completo en PostgreSQL** (ver §4) que debe implementarse.
4. Falta el **módulo de compras** (§5), que no está en el diagrama.
5. No hay evidencia de pruebas del **frontend** (capturas/headless) ni de accesibilidad verificada.
6. El archivo `PROMPT_RETO2_OPENCODE.md` quedó en la raíz del repo: muévelo a `docs/` (o elimínalo del entregable).
7. Hay que **excluir `node_modules/` y `server/.env`** del zip final (el archivo comprimido anterior los incluía: ~90 MB y con secretos).

---

## 3. FASE 0 — CUESTIONARIO INICIAL (único momento para preguntar)

Haz estas preguntas **en un solo mensaje**, numeradas, con el valor por defecto de cada una (el estudiante puede responder "default").

1. **Apellido y Nombre** para el zip `Reto2_Apellido_Nombre.zip` *(obligatorio, sin default)*.
2. **¿Dónde corre PostgreSQL?** (1) **Supabase** (nube) · (2) **PostgreSQL local en Docker** *(default si tiene Docker)* · (3) un PostgreSQL que ya tengo (dame los datos). El diagrama ER es de PostgreSQL, así que no uses SQL Server.
3. Si eligió **Supabase**: connection string del **Transaction pooler** (puerto 6543) y la **directa o Session pooler** (puerto 5432) para migraciones. Si la contraseña tiene caracteres especiales, tú la codificas en formato URL. **No pidas** `anon key` ni `service_role`.
   Si eligió **Docker**: confirma que Docker Desktop está corriendo (tú generas la contraseña).
   Si eligió **otro PostgreSQL**: host, puerto, base, usuario, contraseña.
4. **Credenciales** del admin y del usuario de prueba para el seed *(default: `admin@carresol.com` y `cliente@carresol.com` con contraseñas fuertes generadas que dejas en `REPORTE_FINAL.md`)*.
5. **Módulo de compras:** ¿lo interpreto como **compras a proveedores que reponen el stock** (proveedores + órdenes de compra + recepción que suma inventario)? *(default: sí; es la interpretación más natural dado que el diagrama ya cubre el carrito y los pedidos de clientes)*. Si quiere otra cosa, que lo describa en una línea.
6. **Despliegue:** ¿quieres publicar frontend (GitHub Pages: `https://jscrash22.github.io/carresol/`) y backend (Render/Railway)? Si sí, dame repo/URLs y cómo autenticarte. *(default: no, todo local; deja documentado cómo desplegar y qué origen agregar a `CORS_ORIGIN`)*.
7. ¿Datos de facturación de prueba? *(default: establecimiento `001`, punto de emisión `001`, IVA 15 %, moneda `USD`)*.

**No pidas** `JWT_SECRET`, contraseñas por defecto ni nada que puedas generar con `crypto.randomBytes`.

Al recibir las respuestas, confirma en **una línea** que arrancas. **Desde ahí, cero preguntas.**

---

## 4. MODELO DE DATOS OBJETIVO (PostgreSQL) — FUENTE: `diagrama_er_joyeria.pdf`

El estudiante diseñó este modelo. **Impleméntalo en Prisma** (`provider = "postgresql"`). Si el PDF está en `docs/diagrama_er_joyeria.pdf` o en el repo, léelo para contrastar; esta transcripción es suficiente y tiene prioridad si hay duda. Notación: **PK** clave primaria · **FK** foránea · **UK** único.

### 4.1 Usuarios y acceso
- **roles**: PK `id smallint`; UK `nombre varchar`; `descripcion varchar`.
- **usuarios**: PK `id bigint`; FK `rol_id smallint`; `nombre`, `telefono`; UK `email`; `password_hash`; `cedula`; `email_verificado boolean`; `activo boolean`; `ultimo_login timestamptz`; `created_at`, `updated_at`.
- **password_reset_tokens**: PK `id bigint`; FK `usuario_id`; UK `token_hash`; `expira_at`, `usado_at`, `created_at` (timestamptz).
- **direcciones**: PK `id bigint`; FK `usuario_id`; `alias`, `destinatario`, `telefono`, `provincia`, `ciudad`, `calle_principal`, `calle_secundaria`, `numeracion`, `referencia`, `codigo_postal`; `es_predeterminada boolean`; `activa boolean`; `created_at`, `updated_at`.

### 4.2 Catálogo
- **categorias**: PK `id int`; UK `nombre`; UK `slug`; `descripcion`; `orden smallint`; `activa boolean`.
- **materiales**: PK `id int`; FK `categoria_id int`; UK `nombre`; `activo boolean`. *(La categoría "agrupa" materiales.)*
- **productos**: PK `id bigint`; FK `categoria_id int`; `nombre`; UK `slug`; `descripcion text`; `precio_base numeric`; `activo`; `destacado`; `created_at`, `updated_at`.
- **producto_materiales** (tabla puente): PK compuesta (`producto_id bigint`, `material_id int`) ambas FK; FK `categoria_id int`; `activo`; `created_at`.
- **producto_imagenes**: PK `id bigint`; FK `producto_id`; FK `material_id int` (opcional: imagen específica de un material); `url`, `alt_text`; `orden smallint`; `es_principal boolean`; `created_at`.
- **variantes**: PK `id bigint`; FK `producto_id`; FK `material_id int`; UK `sku`; `tipo_medida enum`; `medida varchar`; `precio numeric`; `stock int` **(CHECK ≥ 0)**; `stock_minimo int`; `peso_gramos numeric`; `activo`; `created_at`, `updated_at`.

### 4.3 Carrito y favoritos
- **carritos**: PK `id bigint`; FK + UK `usuario_id` (un carrito por usuario); `created_at`, `updated_at`.
- **carrito_items**: PK `id bigint`; FK `carrito_id`; FK `variante_id`; `cantidad int`; `precio_unitario numeric`; `created_at`, `updated_at`.
- **favoritos**: PK `id bigint`; FK `usuario_id`; FK `producto_id`; `created_at`. *(Define UK compuesta usuario+producto.)*

### 4.4 Pedidos y pagos
- **pedidos**: PK `id bigint`; UK `numero_pedido bigint`; FK `usuario_id`; FK `direccion_id`; `estado enum`; `subtotal`, `costo_envio`, `iva_porcentaje`, `iva_valor`, `total` (numeric); `moneda char(3)`; `notas text`; `created_at`, `updated_at`.
- **pedido_items**: PK `id bigint`; FK `pedido_id`; FK `variante_id`; **snapshots** `sku`, `nombre_producto`, `material`, `medida`; `cantidad int`; `precio_unitario`; `subtotal`. *(Los snapshots congelan lo vendido aunque luego cambie el catálogo.)*
- **pedido_historial_estados**: PK `id bigint`; FK `pedido_id`; `estado_anterior enum`; `estado_nuevo enum`; FK `usuario_id` (quién cambió); `comentario`; `created_at`.
- **pagos**: PK `id bigint`; FK `pedido_id`; `metodo enum`; `pasarela`; UK `referencia_externa`; `monto`; `moneda char(3)`; `estado enum`; `respuesta_pasarela jsonb`; `fecha_pago`; `created_at`, `updated_at`.

### 4.5 Facturación y envío
- **facturas**: PK `id bigint`; FK + UK `pedido_id` (1:1); FK `establecimiento char(3)` y FK `punto_emision char(3)` → `puntos_emision`; `secuencial bigint`; UK `numero varchar`; `tipo enum`; `tipo_identificacion enum`; `identificacion`; `razon_social`; `email_facturacion`; `telefono`; `direccion_fiscal`; `subtotal`, `costo_envio`, `iva_porcentaje`, `iva_valor`, `total`; `estado enum`; UK `clave_acceso char(49)`; `fecha_emision`; `anulada_at`; `motivo_anulacion`; `created_at`.
- **envios**: PK `id bigint`; FK + UK `pedido_id` (1:1); `direccion_snapshot jsonb`; `transportista`; `numero_guia`; `estado enum`; `costo`; `fecha_despacho timestamptz`; `fecha_estimada date`; `fecha_entrega timestamptz`; `created_at`, `updated_at`.
- **puntos_emision**: PK compuesta (`establecimiento char(3)`, `punto char(3)`); `ultimo_secuencial bigint`; `activo`. *(Numera las facturas.)*

### 4.6 Soporte y sistema
- **mensajes_contacto**: PK `id bigint`; FK `usuario_id` (opcional: puede ser invitado); `nombre`, `email`, `telefono`, `mensaje text`; `canal_preferido enum`; `leido boolean`; `leido_at`; FK `leido_por` → usuarios; `created_at`.
- **parametros_sistema**: PK `clave varchar`; `valor`, `descripcion`; `updated_at`.
- **auditoria**: PK `id bigint`; `tabla`, `registro_id varchar`; `accion enum`; `datos_anteriores jsonb`; `datos_nuevos jsonb`; `usuario_id`; `created_at`.

### 4.7 Valores de enums sugeridos (el diagrama dice "enum" sin valores; usa estos salvo mejor criterio y documenta)
- `estado` de pedido: `pendiente`, `pagado`, `preparando`, `enviado`, `entregado`, `cancelado`.
- `metodo` de pago: `tarjeta`, `transferencia`, `deposito`, `contra_entrega`. `estado` de pago: `pendiente`, `aprobado`, `rechazado`, `reembolsado`.
- `tipo_medida`: `unica`, `talla`, `largo`, `diametro`.
- `canal_preferido`: `email`, `telefono`, `whatsapp`.
- Factura: `tipo` (`factura`, `nota_credito`), `tipo_identificacion` (`cedula`, `ruc`, `pasaporte`, `consumidor_final`), `estado` (`emitida`, `anulada`).
- Envío `estado`: `pendiente`, `preparando`, `en_transito`, `entregado`, `devuelto`.
- Auditoría `accion`: `INSERT`, `UPDATE`, `DELETE`.

### 4.8 Reglas de implementación del modelo
- **Nombres:** usa `snake_case` en la BD con `@@map`/`@map` y `camelCase` en Prisma (o el criterio que prefieras, pero la BD debe quedar con los nombres del diagrama).
- **`bigint` → `BigInt` en Prisma.** `JSON.stringify` **falla** con BigInt: convierte a `Number` (o a string) en la capa `server/models/` antes de responder, y vigila el `id` dentro del payload del JWT. Documenta la decisión.
- **`numeric` → `Decimal`** con precisión explícita (por ejemplo `@db.Decimal(12,2)`); convierte a `Number` al responder.
- **Enums:** usa `enum` nativos de Prisma/PostgreSQL.
- **Restricciones que Prisma no expresa** (escríbelas en una migración SQL propia, `prisma migrate dev --create-only` y edita): `CHECK (stock >= 0)` en `variantes`, `CHECK (cantidad > 0)` en `*_items`, `CHECK` de precios ≥ 0, y `CHECK (char_length(clave_acceso) = 49)`.
- **`numero_pedido`:** debe ser único y autogenerado. Verifica si `@default(autoincrement())` funciona en un campo no-PK con `@unique` en PostgreSQL; si no, crea una **secuencia** con SQL en la migración.
- **Numeración de facturas:** `secuencial` sale de `puntos_emision.ultimo_secuencial`, incrementado **dentro de la misma transacción del pedido** con bloqueo (`UPDATE ... SET ultimo_secuencial = ultimo_secuencial + 1 ... RETURNING`) para no repetir números. `numero` = `EEE-PPP-000000001` (estab-punto-secuencial a 9 dígitos). `clave_acceso` de 49 dígitos: genera una **simulada** y documenta que no es una clave real del SRI.
- **Auditoría:** como mínimo registra INSERT/UPDATE/DELETE de `productos`, `variantes`, cambios de estado de `pedidos`, y todo el módulo de compras. Implementación a tu criterio: **triggers SQL** en una migración, o una extensión de Prisma (`$extends`) que escriba en `auditoria` con `usuario_id` del contexto. Elige una y documenta.
- **Reemplaza** las migraciones SQLite anteriores: borra `prisma/migrations/` previa y genera una migración inicial limpia para PostgreSQL. Archiva el schema viejo en `docs/legacy/` (no lo dejes en `prisma/` para evitar confusión) y elimina `schema.sqlserver.prisma`, `schema.supabase.prisma`, `migrations-sql/crear_bd_sqlserver.sql` y el `docker-compose.yml` de SQL Server **si la BD elegida no es SQL Server**.
- **Si la BD es Supabase:** `datasource` con `url = env("DATABASE_URL")` (pooler 6543, `?pgbouncer=true`) y `directUrl = env("DIRECT_URL")`; si la conexión directa falla por IPv6, usa el Session pooler. **Activa RLS en TODAS las tablas** (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` sin políticas, en una migración): Supabase expone el esquema `public` por una API REST pública y, sin RLS, cualquiera con la anon key leería/modificaría datos saltándose el backend. Prisma usa el rol `postgres`, que ignora RLS, así que el backend sigue funcionando. Documéntalo como medida OWASP (A01/A05).
- **Si la BD es Docker local:** `docker-compose.yml` con `postgres:16`, volumen persistente y healthcheck (`pg_isready`); contraseña generada solo en `.env`.
- **Seed idempotente (`upsert`)**: roles (`admin`, `user`), 2 usuarios (admin y cliente, con bcrypt), 5 categorías (relojes, anillos, collares, pulseras, aretes), materiales por categoría (por ejemplo Oro 18k, Oro blanco, Plata 925, Acero inoxidable, Perlas), los **25 productos** de `frontend/data/productos.json` (o `server/prisma/productos.json`) con `slug`, `precio_base`, al menos **1 variante por producto** (SKU único tipo `ANI-SOL-ORO-7`, `stock` entre 5 y 30, `tipo_medida` coherente: talla en anillos, largo en collares/pulseras, `unica` en relojes/aretes), imagen principal en `producto_imagenes` apuntando a las rutas existentes de `assets/img/...` con su `alt_text`, un punto de emisión `001/001`, una dirección de ejemplo para el cliente, y `parametros_sistema` (`iva_porcentaje=15`, `moneda=USD`, `costo_envio_default`, etc.).

---

## 5. MÓDULO DE COMPRAS (lo único que falta en el modelo)

**Asunción (confirmada o ajustada en la FASE 0):** "compras" = **compras a proveedores** que reponen el inventario. Es la contraparte de `pedidos` (ventas a clientes).

Agrega a Prisma + migración estas tablas, con el mismo estilo (bigint, timestamptz, snake_case):

- **proveedores**: PK `id bigint`; `nombre`; UK `ruc varchar`; `email`; `telefono`; `direccion`; `contacto`; `activo boolean`; `created_at`, `updated_at`.
- **compras**: PK `id bigint`; UK `numero_compra bigint` (autogenerado); FK `proveedor_id`; FK `usuario_id` (admin que la registra); `estado enum` (`borrador`, `ordenada`, `recibida`, `cancelada`); `numero_factura_proveedor varchar`; `subtotal`, `iva_porcentaje`, `iva_valor`, `total` (numeric); `moneda char(3)`; `fecha_compra timestamptz`; `fecha_recepcion timestamptz`; `notas text`; `created_at`, `updated_at`.
- **compra_items**: PK `id bigint`; FK `compra_id`; FK `variante_id`; `sku` y `nombre_producto` (snapshots); `cantidad int` (CHECK > 0); `costo_unitario numeric`; `subtotal numeric`.
- **(Opcional, recomendado) movimientos_inventario**: PK `id bigint`; FK `variante_id`; `tipo enum` (`venta`, `compra`, `ajuste`, `devolucion`); `cantidad int` (+/−); `referencia_tipo`, `referencia_id`; FK `usuario_id`; `created_at`. Si la implementas, registra también las ventas (descuento de stock en pedidos) y los ajustes manuales, para tener trazabilidad completa.
- Opcional: añade `costo numeric` a `variantes` (último costo de compra) o calcula margen en el reporte.

**Reglas de negocio:**
- Solo **admin** crea/edita/ve compras y proveedores (JWT + rol).
- Flujo de estados: `borrador → ordenada → recibida` (o `cancelada` desde borrador/ordenada). **Una compra recibida no se edita ni se cancela.**
- Al pasar a **`recibida`**: dentro de una **transacción**, suma `cantidad` al `stock` de cada variante, guarda `fecha_recepcion`, escribe `auditoria` (y `movimientos_inventario` si existe). Idempotente: recibir dos veces no duplica stock.
- Los totales se **calculan en el servidor** (nunca confiar en el cliente), IVA tomado de `parametros_sistema`.
- Validar: proveedor activo, variantes existentes, cantidades enteras > 0, costos ≥ 0, RUC con formato válido (13 dígitos) y email válido.

**Endpoints (todos JWT + admin):**
| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/proveedores` | listar / crear |
| GET/PUT/DELETE | `/api/proveedores/:id` | ver / editar / desactivar (borrado lógico si tiene compras) |
| GET/POST | `/api/compras` | listar / crear (en `borrador` u `ordenada`) |
| GET | `/api/compras/:id` | detalle con items y proveedor |
| PUT | `/api/compras/:id` | editar (solo `borrador`) |
| PATCH | `/api/compras/:id/estado` | transiciones permitidas (incluye `recibida` con suma de stock) |
| GET | `/api/admin/inventario/bajo-stock` | variantes con `stock <= stock_minimo` (ayuda a decidir qué comprar) |

**Frontend (panel admin):** nuevas pestañas accesibles **Proveedores**, **Compras** (listado, formulario de nueva compra con items dinámicos, cambio de estado con confirmación y botón "Recibir mercadería") e **Inventario** (bajo stock). Mismo estilo, componentes accesibles, tabla con `<caption>`, mensajes `aria-live`.

---

## 6. ADAPTACIÓN DEL BACKEND AL NUEVO MODELO

**Contrato de compatibilidad (P0, no negociable):** los endpoints mínimos del reto **siguen funcionando** con las mismas rutas. Como ahora el precio/stock viven en `variantes`, define y documenta:
- `GET /api/productos` y `/:id` devuelven cada producto con `precio` (= `precio_base`, o el mínimo de sus variantes activas), `stock` (= suma del stock de sus variantes activas), `categoria`, `imagen` principal + `alt`, y el arreglo `variantes` (`id, sku, material, tipoMedida, medida, precio, stock`) más `materiales` e `imagenes`. Soporta `?categoria=slug`, `?destacado=true` y `?q=` (búsqueda de texto simple, sanitizada).
- `POST/PUT/DELETE /api/productos` (admin): crear/editar producto **con sus variantes** en una sola operación transaccional; `DELETE` hace **borrado lógico** (`activo=false`) si hubo ventas.
- `POST /api/pedidos` mantiene la seguridad del modelo anterior, adaptada a variantes: el body pasa a ser `{ direccionId, metodoPago, items: [{ varianteId, cantidad }], notas?, facturacion?: { tipoIdentificacion, identificacion, razonSocial, email, telefono, direccionFiscal } }`. Por **compatibilidad**, acepta también `{ productoId, cantidad }` y lo resuelve a la variante por defecto del producto si solo hay una. Precios y totales **siempre** del servidor (variante + `parametros_sistema`), stock validado y descontado de forma condicional dentro de `$transaction`.
  Dentro de **la misma transacción**: crea `pedidos` (con `numero_pedido`), `pedido_items` (con snapshots), `pedido_historial_estados` (estado inicial), `pagos` (simulados, ver abajo), `envios` (con `direccion_snapshot` jsonb), **`facturas`** (numeración desde `puntos_emision`), vacía el `carritos`/`carrito_items` del usuario, escribe `auditoria` y, si existe, `movimientos_inventario`.
- **Pago simulado (no hay pasarela real):** `pasarela = "simulada"`. `tarjeta` → aprobado inmediato (`pagado`); `transferencia`/`deposito` → `pendiente` hasta que un admin confirme; `contra_entrega` → `pendiente`. `referencia_externa` única generada. Guarda una `respuesta_pasarela` jsonb de ejemplo. **Nunca** pidas ni guardes datos reales de tarjeta; en el frontend no hay campos de tarjeta, solo la elección del método.
- `GET /api/pedidos/mis-pedidos` y `GET /api/pedidos` (admin) incluyen items, estado, pago, envío y número de factura. Un usuario **solo** ve sus pedidos; `GET /api/pedidos/:id` valida pertenencia (o admin) → `403` si no.
- `PATCH /api/pedidos/:id/estado` (admin): cambia estado con validación de transiciones, escribe `pedido_historial_estados` y `auditoria`; al `cancelar` un pedido no enviado, **repone stock** en la misma transacción.

**Nuevos endpoints (P1):**
| Área | Rutas | Acceso |
|---|---|---|
| Direcciones | `GET/POST /api/direcciones`, `PUT/DELETE /api/direcciones/:id` (propias; una sola `es_predeterminada`; borrado lógico `activa=false`) | JWT |
| Carrito servidor | `GET /api/carrito`, `PUT /api/carrito` (sincroniza el carrito local al iniciar sesión), `DELETE /api/carrito` | JWT |
| Favoritos | `GET /api/favoritos`, `POST /api/favoritos/:productoId`, `DELETE /api/favoritos/:productoId` | JWT |
| Contacto | `POST /api/contacto` (público, con rate limit y validación; si hay JWT asocia `usuario_id`), `GET /api/admin/mensajes`, `PATCH /api/admin/mensajes/:id/leido` | público / admin |
| Catálogo admin | CRUD de `categorias`, `materiales`, variantes y producto_imagenes | admin |
| Facturas / pagos / envíos | lectura por pedido; `PATCH /api/pedidos/:id/pago` (admin confirma pago), `PATCH /api/pedidos/:id/envio` (transportista, guía, estado, fechas) | JWT / admin |
| Parámetros | `GET/PUT /api/admin/parametros` | admin |
| Auditoría | `GET /api/admin/auditoria` (paginado, filtros por tabla/usuario/fecha) | admin |
| Admin "todas las tablas" | amplía `GET /api/admin/resumen` y agrega listados paginados por tabla (nunca devolver `password_hash` ni `token_hash`) | admin |

**P2 (si hay tiempo):** `POST /api/auth/forgot-password` y `/reset-password` con `password_reset_tokens` (guarda solo el **hash** del token, expiración 30 min, de un solo uso; sin servicio de correo, en desarrollo devuelve el enlace solo si `NODE_ENV=development`); validación de **cédula ecuatoriana** (módulo 10) en el registro; `email_verificado`; bloqueo de login si `activo=false`; actualizar `ultimo_login`; paginación estándar (`?page=&limit=`) en todos los listados.

**Seguridad (se mantiene y se amplía):** JWT HS256 con expiración y `JWT_SECRET` en `.env`; `requireRole('admin')`; CORS whitelist por `CORS_ORIGIN` (sin `*`; incluye el origen de GitHub Pages solo si hay despliegue); bcrypt (cost ≥ 10, ya hay `BCRYPT_ROUNDS`); validación/sanitización con express-validator en **todas** las rutas nuevas (body, params, query); errores centralizados sin stacktrace ni mensajes internos de Prisma (mapea `P2002`, `P2025`, `P2003`, violaciones de CHECK); `helmet`; rate limit en auth y contacto; límite de body; anti mass-assignment (nunca aceptar `rol_id`/`role`, `total`, precios, `estado`, `usuario_id` del cliente); verificación de propiedad de recursos (direcciones, carrito, pedidos) para evitar IDOR (OWASP A01).

---

## 7. ADAPTACIÓN DEL FRONTEND

Mantén MVC y el estilo. **No dupliques lógica de render**; las vistas solo pintan, los controladores orquestan, los modelos hablan con la API.

- **Catálogo/tarjeta/detalle de producto:** muestra categoría, rango de precios, imagen principal; un **detalle de producto** (modal accesible o vista) con selector de **material** y **medida/talla** (variantes), stock por variante y botón "Agregar al carrito" deshabilitado si no hay stock. El carrito local guarda `varianteId`.
- **Carrito:** igual que antes (localStorage, tope = mín(10, stock de la variante)); al iniciar sesión, **sincroniza** con `PUT /api/carrito`; al cargar, revalida precios/stock con la API y avisa si cambió algo.
- **Checkout (login obligatorio, ya existe la regla; mantenla):** nuevo flujo accesible por pasos o sección única: elegir/crear **dirección** (formulario con labels y validación), elegir **método de pago** (radio group accesible, sin campos de tarjeta), datos de **facturación** (consumidor final por defecto, o cédula/RUC con razón social), resumen con subtotal, envío, IVA y total, confirmar. En éxito: vaciar carrito, mostrar confirmación con **número de pedido, total y número de factura**.
- **Mi cuenta:** direcciones (CRUD), favoritos (ahora ligados a la cuenta cuando hay sesión; conservan el modo local cuando no), **mis pedidos** con detalle expandible (items, estado, pago, envío/guía, factura) y su historial de estados.
- **Contacto:** el formulario existente (validación regex) ahora hace `POST /api/contacto`, con estados de carga/éxito/error accesibles.
- **Panel Admin (solo `role === 'admin'`):** pestañas accesibles (`role="tablist"`, flechas de teclado) para: Resumen, Productos (+variantes, imágenes), Categorías/Materiales, Pedidos (cambiar estado, confirmar pago, registrar envío, ver factura), Usuarios, **Proveedores, Compras, Inventario** (módulo nuevo), Mensajes de contacto, Parámetros, Auditoría. Tablas con `<caption>`, `<th scope>`, paginación y modal de confirmación para acciones destructivas.
- **Manejo de errores de API** (ya existe `apiClient.js`): red caída, 401 (cerrar sesión y redirigir a login), 403, 404, 409, 422, 500, siempre con mensaje claro en región `aria-live`.
- **XSS:** nada de `innerHTML` con datos de la API sin escapar.
- **Accesibilidad:** semántica HTML5, un `h1` por vista, foco visible (outline dorado), foco atrapado y retorno de foco en modales, `Esc` para cerrar, contraste AA (`#8b6508` sobre blanco), `prefers-reduced-motion`, responsive 480/768/1024.

---

## 8. ORDEN DE EJECUCIÓN CON CHECKPOINTS

| Fase | Trabajo | Checkpoint (ejecútalo) |
|---|---|---|
| 0 | Cuestionario | Respuestas recibidas |
| 1 | **Auditoría del estado actual:** instala dependencias, levanta el servidor con SQLite y corre el smoke test **antes de tocar nada** (línea base). Revisa que el frontend carga. | Línea base documentada en `docs/DECISIONES.md` |
| 2 | PostgreSQL: Docker o Supabase, `.env`, `schema.prisma` nuevo (modelo ER completo + compras), migración inicial limpia, migración de CHECKs/secuencias/RLS/auditoría, seed | `prisma migrate` aplicado; seed crea 5 categorías, 25 productos con variantes, 2 usuarios, punto de emisión |
| 3 | Reescribir `server/models/*` para el nuevo esquema (BigInt→Number, Decimal→Number); mantener contrato de §6 | `GET /api/productos` devuelve 25 con `precio`, `stock`, `variantes` |
| 4 | Pedidos con variantes + pago simulado + envío + factura + historial + auditoría en una transacción | Pedido de prueba crea todas las filas y descuenta stock |
| 5 | Endpoints nuevos P1 (direcciones, carrito, favoritos, contacto, catálogo admin, parámetros, auditoría, admin tablas) | `curl`/smoke con 401/403/200 correctos |
| 6 | **Módulo de compras** (tablas, endpoints, recepción que suma stock, bajo-stock) | Compra `recibida` incrementa stock una sola vez (idempotencia probada) |
| 7 | Smoke test ampliado (§9) **todo en PASS** | `docs/evidencias/smoke-test.txt` en UTF-8 |
| 8 | Frontend: variantes, checkout con dirección/pago/facturación, mi cuenta, contacto, admin ampliado | Flujo completo comprar → pedido → factura visible |
| 9 | Accesibilidad + pruebas del frontend (Playwright headless si es instalable; si no, lista manual en README + `docs/BLOQUEOS.md`) | Capturas en `docs/evidencias/` |
| 10 | P2 si queda tiempo | — |
| 11 | README Reto 2, `.env.example`, limpieza, zip, `REPORTE_FINAL.md` | Zip verificado sin secretos ni `node_modules` |

---

## 9. PRUEBAS Y EVIDENCIAS

Amplía `server/scripts/smoke-test.js` (Node, `fetch` nativo, contra el servidor y la BD **reales**). Mantén los 21 casos existentes (adaptados al nuevo contrato) y agrega:

- Pedido con dirección + método de pago crea `pedido`, `pedido_items` (con snapshots), `pago`, `envio` (con `direccion_snapshot`), `factura` (número `001-001-9 dígitos`, `clave_acceso` de 49 caracteres) e `historial`; el stock baja.
- Dos pedidos concurrentes sobre la última unidad: **solo uno** tiene éxito (el otro recibe error controlado).
- Dos facturas seguidas: `secuencial` consecutivo y sin repetir.
- Usuario A no puede ver ni modificar la dirección/pedido/carrito del usuario B (**IDOR → 403/404**).
- `PATCH /api/pedidos/:id/estado` como user → 403; como admin cancelar un pedido repone el stock.
- Registro con `role`/`rol_id` en el body → queda como `user`.
- `usuarios` listados por admin **sin** `password_hash`; nada devuelve `token_hash`.
- **Compras:** user normal → 403 en `/api/compras` y `/api/proveedores`; admin crea proveedor y compra en `borrador`; no puede recibir una compra `cancelada`; al pasar a `recibida` el stock sube exactamente `cantidad`; recibir de nuevo **no** suma otra vez; no se puede editar una compra `recibida`; `bajo-stock` lista la variante correcta.
- Auditoría: las operaciones anteriores dejan filas en `auditoria`.
- Validaciones: entradas inválidas → `400/422` con respuesta consistente, sin stacktrace.
- Contacto: `POST /api/contacto` público válido → 201; inválido → 422; admin lo ve y lo marca leído.

**Salida a archivo en UTF-8:** el script debe escribir su reporte con `fs.writeFileSync(ruta, texto, 'utf8')` (no redirecciones de PowerShell, que generan UTF-16). Guarda `docs/evidencias/smoke-test.txt` y ejemplos reales de request/response en `docs/evidencias/ejemplos-endpoints.md` (**sin tokens ni contraseñas reales**: enmascara).

Scripts de npm (en `server/package.json`, compatibles con Windows): `dev`, `start`, `db:migrate`, `db:deploy`, `db:seed`, `db:reset` (con confirmación explícita `CONFIRM_RESET=yes`), `test`, `frontend`.

---

## 10. README.md (reescribir por completo)

Debe incluir, bien redactado:
1. Descripción del sistema y stack.
2. **Arquitectura MVC** del frontend y del backend, con árbol de carpetas y el flujo de una petición (vista → controlador → modelo → API → ruta → middleware → controlador → modelo Prisma → BD).
3. **Diagrama ER** (Mermaid `erDiagram` con las entidades de §4 y §5) y explicación breve de cada grupo (usuarios, catálogo, carrito/favoritos, pedidos/pagos, facturación/envío, soporte/sistema, **compras**).
4. **Cómo ejecutar paso a paso desde cero en Windows/PowerShell**: requisitos, BD (Docker o Supabase), copiar `.env.example` → `.env`, `npm install`, migrar, seed, arrancar backend, servir frontend en el puerto del CORS, URLs, credenciales de prueba (solo de ejemplo, no las reales).
5. **Tabla de endpoints y roles requeridos** (reto + nuevos + compras).
6. **Medidas de seguridad y ≥ 3 riesgos OWASP** con archivo/línea concreta de la mitigación: A01 Broken Access Control (roles, propiedad de recursos/IDOR, RLS), A02/A07 (bcrypt, JWT con expiración, rate limit, mensajes genéricos), A03 Injection (Prisma parametrizado + validación, anti-XSS en frontend), A04 Insecure Design (el servidor recalcula precios, transacciones, stock atómico), A05 Security Misconfiguration (CORS whitelist, helmet, errores sin stacktrace, RLS en Supabase).
7. Resultado de las **7 pruebas mínimas** y de las pruebas ampliadas, con enlaces a `docs/evidencias/`.
8. Variables de entorno (`.env.example` explicado), accesibilidad aplicada, decisiones (BigInt, pagos simulados, clave de acceso simulada, compras = reposición de stock), limitaciones y mejoras futuras, cómo desplegar.

`.env.example` con **valores falsos**: `PORT`, `DATABASE_URL`, `DIRECT_URL` (si Supabase), `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `NODE_ENV`, `HTTPS`, `BCRYPT_ROUNDS`, credenciales de seed y, si aplica, `POSTGRES_PASSWORD`.

---

## 11. ENTREGA Y LIMPIEZA

1. Mueve `PROMPT_RETO2_OPENCODE.md` y este archivo a `docs/prompts/` (o exclúyelos del zip).
2. `.gitignore` debe cubrir `node_modules/`, `server/.env`, `.env`, `server/certs/`, `*.zip`, `*.log`, `server/prisma/*.db*`.
3. Genera **`Reto2_Apellido_Nombre.zip`** con: `frontend/`, `server/` (con `prisma/schema.prisma`, `migrations/`, `seed.js`), `server/.env.example`, `docker-compose.yml` (si aplica), `docs/`, `README.md`. **Excluye** `node_modules/`, `server/.env`, certificados, `.git` y la base SQLite.
4. Verifica con `unzip -l` / `tar -tf` (o PowerShell `Expand-Archive` a una carpeta temporal) que no haya `.env`, `node_modules` ni secretos (`grep`/`Select-String` por patrones de las claves reales del `.env`), y que el zip pese pocos MB.
5. Escribe `REPORTE_FINAL.md`: ✅/❌ por requisito del reto original, por entidad del ER y por el módulo de compras; resultado real de las pruebas; cómo levantar todo en pocos comandos; credenciales de prueba generadas; decisiones, bloqueos y planes B; y qué debe revisar o completar el estudiante a mano.

---

## 12. DEFINICIÓN DE "TERMINADO"

- [ ] Prisma en **PostgreSQL** con **todas** las tablas del diagrama (§4) + compras (§5), migración inicial limpia, CHECKs, secuencias, auditoría y (si Supabase) RLS activo en todas las tablas.
- [ ] Seed idempotente: 5 categorías, materiales, 25 productos con variantes e imágenes, 2 usuarios, punto de emisión, dirección de ejemplo, parámetros.
- [ ] Endpoints del reto original intactos y funcionando con el nuevo modelo (contrato §6).
- [ ] Pedido completo en una transacción: items con snapshots, pago simulado, envío, factura numerada, historial, auditoría, stock descontado de forma atómica.
- [ ] Módulo de compras completo (proveedores, compras, items, recepción que suma stock una sola vez, bajo-stock) con sus pantallas de admin.
- [ ] Seguridad: JWT, roles, CORS whitelist, bcrypt, validación/sanitización, errores sin stacktrace, IDOR bloqueado, anti mass-assignment, rate limit.
- [ ] Frontend MVC: catálogo con variantes, carrito persistente y sincronizado, login obligatorio para comprar, checkout con dirección/pago/facturación, mi cuenta, contacto, panel admin ampliado.
- [ ] Accesibilidad verificada (teclado, foco, ARIA, contraste, responsive) y manejo de errores 401/403/500/red.
- [ ] Las **7 pruebas mínimas** y las ampliadas en PASS, con evidencia en UTF-8 y capturas (o lista manual si no fue posible).
- [ ] README nuevo, `.env.example` sin secretos, zip final verificado (sin `.env` ni `node_modules`), `REPORTE_FINAL.md`.

**Empieza ahora con la FASE 0.**
