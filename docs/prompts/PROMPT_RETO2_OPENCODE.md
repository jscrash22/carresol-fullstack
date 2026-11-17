# 🚀 MISIÓN: Reto 2 — Carresol Full Stack MVC (Frontend + API + SQL Server + Seguridad)

Eres un ingeniero full stack senior trabajando de forma **autónoma**. Tu misión es convertir el proyecto **Carresol (Reto 1)**, que ya existe en este directorio, en una plataforma e-commerce full stack completa que cumpla **todos** los requisitos del Reto 2 de la materia *Desarrollo de Plataformas*.

El estudiante se va a dormir en cuanto responda tu cuestionario inicial. Cuando despierte quiere encontrar **todo terminado, probado y empaquetado**.

---

## 0. REGLAS DE OPERACIÓN (léelas primero)

1. **Pregunta solo una vez.** Ejecuta la **FASE 0** (cuestionario), espera las respuestas, y a partir de ahí **no vuelvas a preguntar nada**. Si algo es ambiguo, decide tú con el criterio más razonable y anótalo en `docs/DECISIONES.md`.
2. **No te detengas ante errores.** Diagnostica, corrige y sigue. Si algo es imposible de resolver (por ejemplo, Docker no disponible), aplica el **plan B** de este documento, déjalo anotado en `docs/BLOQUEOS.md` y continúa con el resto.
3. **No pidas confirmaciones** para instalar paquetes, crear archivos o correr comandos del proyecto.
4. **Secretos:** nunca imprimas contraseñas en logs, nunca los pongas en el README ni en commits. Solo van en `server/.env` (ignorado por git). Siempre mantén `server/.env.example` con valores falsos.
5. **No rompas el Reto 1:** conserva imágenes, estética (blanco/dorado, Playfair Display + Poppins), `productos.json` (se usa como fuente del seed) y la accesibilidad ya lograda.
6. **Verifica de verdad:** no declares algo terminado sin haberlo ejecutado. Levanta el servidor, haz las peticiones reales y guarda la evidencia.
7. Haz **commits por fase** si el directorio es un repo git (mensajes claros en español). No hagas `push` salvo que el cuestionario lo pida.
8. Todo el código, comentarios, README y mensajes de UI van **en español**.
9. Al terminar, escribe `REPORTE_FINAL.md` (ver sección 13).

---

## 1. CONTEXTO DEL PROYECTO EXISTENTE (Reto 1)

Antes de tocar nada, **inspecciona el directorio** y entiende lo que hay. Lo esperado:

- `index.html`, `assets/css/styles.css`, `assets/img/**` (25 imágenes en 5 categorías: relojes, anillos, collares, pulseras, aretes).
- `data/productos.json` (25 productos: id, nombre, categoria, precio, descripcion, imagen, alt).
- `js/` con módulos ES: `app.js`, `repo.js`, `view.js`, `cart.js`, `favoritos.js`, `storage.js`, `validaciones.js`.
- Persistencia en localStorage (carrito, favoritos), sessionStorage, IndexedDB (historial) y cookies.
- Ya tiene accesibilidad: skip link, foco visible, ARIA, panel de carrito con foco atrapado, menú hamburguesa, formulario de contacto con regex.

Nota: el README del Reto 1 dice "límite de 20 unidades" pero `cart.js` usa `MAX_POR_PRODUCTO = 10`. En el Reto 2 el tope por producto será **el menor entre 10 y el stock disponible**; documéntalo.

Si la ubicación real difiere (por ejemplo, el proyecto está dentro de una carpeta `carresol-main/`), adáptate y trabaja sobre la raíz correcta.

---

## 2. FASE 0 — CUESTIONARIO INICIAL (único momento para preguntar)

Antes de escribir una sola línea de código, haz **todas** estas preguntas **en un solo mensaje**, numeradas. Indica el valor por defecto de cada una para que el estudiante pueda responder "default" o "todo default".

**A. Datos del estudiante**
1. Apellido y Nombre para nombrar el zip (`Reto2_Apellido_Nombre.zip`). *(sin default, obligatorio)*

**B. Base de datos** (necesito conectarme a una)
1b. ¿Qué base de datos quieres usar? **(1) SQL Server en Docker local** *(default)*, **(2) SQL Server existente**, o **(3) Supabase (PostgreSQL en la nube)**. Si eliges la 3, **no preguntes por Docker** y aplica el **Apéndice A** de este documento; pídeme solo los dos datos que allí se indican.
2. (Solo opciones 1 y 2) ¿Tienes **Docker** instalado y funcionando? *(default: asumo que sí y levanto SQL Server 2022 en un contenedor propio con `docker compose`)*
3. Si **no** usas Docker: dame los datos de tu SQL Server existente: host, puerto, nombre de la base, usuario y contraseña, y si es local, Azure SQL u otro. *(solo si respondiste que no a la 2)*
4. ¿Qué sistema operativo usas? (Windows / macOS Intel / macOS Apple Silicon / Linux) *(default: detecto yo mismo con comandos)*

**C. Cuentas de la aplicación**
5. Credenciales del **usuario administrador** que sembraré en la BD (email y contraseña). *(default: `admin@carresol.com` / una contraseña fuerte que genero y te dejo en `REPORTE_FINAL.md`)*
6. Credenciales de un **usuario normal** de prueba. *(default: `cliente@carresol.com` / contraseña generada)*

**D. Red y despliegue**
7. Puerto del backend *(default: 3000)* y origen exacto desde el que servirás el frontend para CORS *(default: `http://localhost:5500`, el de Live Server; el frontend lo serviré yo también en ese puerto con un servidor estático para probar)*.
8. ¿Quieres el **extra de HTTPS** en desarrollo con certificado self-signed? *(default: sí, como opcional activable con `HTTPS=true` en `.env`)*
9. ¿Quieres que haga `git push` o despliegue en algún servicio (GitHub, Render, Railway, Azure)? Si sí, dame repo/URL y el método de autenticación o token. *(default: no, solo dejo todo listo en local)*

**Qué NO debes pedir** (los generas tú): `JWT_SECRET`, `JWT_EXPIRES_IN`, contraseña `sa` del contenedor Docker, contraseñas por defecto de seed. Genera secretos con `crypto.randomBytes`.

Cuando recibas las respuestas, confirma en **una sola línea** que empiezas y arranca. **Desde ese momento, cero preguntas.**

---

## 3. DECISIONES TÉCNICAS FIJAS

| Tema | Decisión |
|---|---|
| Runtime | Node.js LTS (verifica `node -v`; requiere ≥ 18) |
| Backend | Express, JavaScript con ES Modules o CommonJS (elige uno y sé consistente) |
| ORM | **Prisma**, provider `sqlserver`. **Fija Prisma en la versión 6.x** (`prisma@6` y `@prisma/client@6`) para evitar cambios incompatibles de configuración de versiones más nuevas. Lee la doc oficial de esa versión si dudas. |
| BD | **SQL Server 2022** (Docker: `mcr.microsoft.com/mssql/server:2022-latest`) |
| Auth | `jsonwebtoken` (JWT en `Authorization: Bearer <token>`) |
| Hash | `bcryptjs` (evita problemas de compilación nativa), cost factor ≥ 10 |
| Validación | `express-validator` (validar **y sanitizar** body, params y query) |
| Seguridad HTTP | `helmet`, `cors` con whitelist, `express-rate-limit` (al menos en login/register) |
| Logger | `server/utils/logger.js` propio (nivel, timestamp, método/URL/status/ms) usable como middleware |
| Frontend | JavaScript puro con módulos ES, **sin frameworks**, MVC real |
| Pruebas | Script de humo en Node (`fetch` nativo) que ejecuta los 7 escenarios obligatorios y guarda la salida |

**Plan B de base de datos:** si tras razonables intentos no logras levantar SQL Server (sin Docker, sin acceso), cambia a otro motor relacional **soportado por Prisma** (PostgreSQL local o, en último caso, SQLite), conserva el mismo modelo, documenta el cambio en `docs/BLOQUEOS.md` y deja listo el schema de SQL Server en `server/prisma/schema.sqlserver.prisma` para que el estudiante lo active cuando tenga la instancia. El reto permite "SQL Server u otro motor relacional".

---

## 4. ESTRUCTURA OBJETIVO

Reorganiza el repo así (mueve los archivos del Reto 1 con `git mv` si es posible):

```
/
├── README.md
├── REPORTE_FINAL.md
├── docker-compose.yml            # SQL Server (si aplica)
├── .gitignore                    # node_modules, .env, *.zip, certs/
├── docs/
│   ├── DECISIONES.md
│   ├── BLOQUEOS.md               # solo si hubo
│   └── evidencias/               # salidas reales de las pruebas
├── frontend/
│   ├── index.html
│   ├── config.js                 # API_BASE_URL
│   ├── assets/
│   │   ├── css/styles.css
│   │   └── img/...               # imágenes del Reto 1
│   ├── models/
│   │   ├── apiClient.js          # fetch centralizado: token, errores 401/403/500/red
│   │   ├── authModel.js
│   │   ├── productoModel.js
│   │   ├── carritoModel.js       # estado + localStorage
│   │   ├── pedidoModel.js
│   │   └── adminModel.js
│   ├── views/
│   │   ├── catalogoView.js
│   │   ├── productoCard.js       # componente reutilizable
│   │   ├── carritoView.js
│   │   ├── loginView.js
│   │   ├── pedidosView.js
│   │   ├── adminView.js
│   │   └── uiComponents.js       # alertas, modal accesible, toasts, spinners
│   └── controllers/
│       ├── appController.js      # arranque y navegación entre vistas
│       ├── authController.js
│       ├── catalogoController.js
│       ├── carritoController.js
│       ├── pedidoController.js
│       └── adminController.js
└── server/
    ├── package.json
    ├── .env.example
    ├── app.js                    # configura express
    ├── server.js                 # arranque (HTTP/HTTPS)
    ├── routes/                   # auth, productos, pedidos, admin
    ├── controllers/
    ├── models/                   # capa de acceso a datos con Prisma
    ├── middleware/               # auth, roles, cors, validators, errorHandler, rateLimit
    ├── utils/logger.js
    ├── scripts/smoke-test.js     # pruebas end-to-end
    └── prisma/
        ├── schema.prisma
        ├── migrations/
        └── seed.js
```

Conserva las funciones valiosas del Reto 1 (favoritos, formulario de contacto validado, filtros por categoría, menú hamburguesa) reubicándolas en la estructura MVC.

---

## 5. MODELO DE DATOS (Prisma)

Base de partida (ajusta lo necesario, pero respeta las entidades y campos mínimos del reto):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

model Producto {
  id          Int             @id @default(autoincrement())
  nombre      String          @db.NVarChar(120)
  descripcion String?         @db.NVarChar(500)
  categoria   String          @db.NVarChar(40)
  precio      Decimal         @db.Decimal(10, 2)
  stock       Int             @default(0)
  imagen      String?         @db.NVarChar(255)
  alt         String?         @db.NVarChar(200)
  createdAt   DateTime        @default(now())
  detalles    PedidoDetalle[]
}

model Usuario {
  id           Int      @id @default(autoincrement())
  nombre       String   @db.NVarChar(80)
  email        String   @unique @db.NVarChar(150)
  passwordHash String   @db.NVarChar(100)
  role         String   @default("user") @db.NVarChar(10)   // "admin" | "user"
  createdAt    DateTime @default(now())
  pedidos      Pedido[]
}

model Pedido {
  id        Int             @id @default(autoincrement())
  userId    Int
  total     Decimal         @db.Decimal(10, 2)
  createdAt DateTime        @default(now())
  usuario   Usuario         @relation(fields: [userId], references: [id])
  detalles  PedidoDetalle[]
}

model PedidoDetalle {
  id             Int      @id @default(autoincrement())
  pedidoId       Int
  productoId     Int
  cantidad       Int
  precioUnitario Decimal  @db.Decimal(10, 2)
  pedido         Pedido   @relation(fields: [pedidoId], references: [id], onDelete: Cascade)
  producto       Producto @relation(fields: [productoId], references: [id])
}
```

Notas importantes:
- SQL Server en Prisma **no soporta enums nativos**: `role` es `String` y se valida en la aplicación.
- `Decimal` llega como objeto/string desde Prisma: conviértelo a `Number` en la capa `models/` antes de responder JSON.
- Genera una migración real (`prisma migrate dev --name init`) y **commitéala** en `prisma/migrations/`.
- Si la base no existe, créala antes de migrar (por ejemplo con `docker exec ... sqlcmd`).
- `seed.js`: importa los 25 productos de `productos.json` asignando `stock` razonable (por ejemplo entre 5 y 30), crea el admin y el usuario de prueba con contraseñas hasheadas. El seed debe ser **idempotente** (usar `upsert`).

**Docker (si aplica):** `docker-compose.yml` con SQL Server 2022, puerto 1433, `ACCEPT_EULA=Y`, `MSSQL_SA_PASSWORD` fuerte generada (cumple complejidad de SQL Server), volumen persistente y healthcheck. En Mac con Apple Silicon, usa `platform: linux/amd64` o la imagen compatible y anótalo. Espera a que esté `healthy` antes de migrar. Cadena de conexión típica:

```
DATABASE_URL="sqlserver://localhost:1433;database=carresol;user=sa;password=TU_PASSWORD;trustServerCertificate=true;encrypt=true"
```

---

## 6. API REST

Prefijo `/api`. Respuestas JSON **consistentes**:

```json
{ "ok": true,  "data": ... }
{ "ok": false, "error": { "codigo": "VALIDACION", "mensaje": "...", "detalles": [ ... ] } }
```

### Auth
| Método | Ruta | Acceso | Notas |
|---|---|---|---|
| POST | `/api/auth/register` | público | Crea usuario con `role = "user"` **siempre** (ignora cualquier `role` enviado: previene *mass assignment*). Valida email, nombre y contraseña fuerte (mín. 8, mayúscula, minúscula, número). Email único (409 si existe). Devuelve usuario sin hash (y opcionalmente token). |
| POST | `/api/auth/login` | público | Devuelve `{ token, usuario: { id, nombre, email, role } }`. Mensaje genérico en fallo ("Credenciales inválidas"), sin revelar si el email existe. Rate limit. |
| GET | `/api/auth/me` | JWT | Extra: devuelve el usuario del token (útil para el frontend). |

### Productos
| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/productos` | público (soporta `?categoria=` opcional) |
| GET | `/api/productos/:id` | público |
| POST | `/api/productos` | JWT + admin |
| PUT | `/api/productos/:id` | JWT + admin |
| DELETE | `/api/productos/:id` | JWT + admin |

Reglas: validar `nombre`, `precio > 0`, `stock >= 0` entero, `categoria` en lista permitida. En DELETE, si el producto tiene detalles de pedido, responde `409` con mensaje claro (no 500) o haz borrado lógico; decide y documenta.

### Pedidos
| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/pedidos` | JWT (user/admin) |
| GET | `/api/pedidos/mis-pedidos` | JWT (user/admin) |
| GET | `/api/pedidos` | JWT + admin |

**`POST /api/pedidos` (crítico, diseño seguro):**
- Body: `{ "items": [ { "productoId": 1, "cantidad": 2 } ] }`.
- **El servidor NO confía en precios ni totales del cliente.** Lee los precios desde la BD, calcula `precioUnitario` y `total` en el servidor (incluye IVA solo si el frontend lo muestra; si lo incluyes, hazlo consistente y documéntalo).
- Valida: items no vacíos, cantidades enteras 1..10, productos existentes, **stock suficiente**.
- Usa una **transacción** de Prisma (`$transaction`): crea `Pedido` + `PedidoDetalle`, descuenta stock, todo o nada. Maneja la condición de carrera (descuento condicional con `updateMany` donde `stock >= cantidad` y verifica el conteo).
- Respuesta `201` con el pedido y sus detalles.

### Rutas de administración (para "vista administrador de todas las tablas")
Todas con JWT + admin:
- `GET /api/admin/usuarios` (**nunca** devolver `passwordHash`)
- `GET /api/admin/pedidos` (con usuario y detalles)
- `GET /api/admin/detalles` (PedidoDetalle con producto y pedido)
- `GET /api/admin/resumen` (conteos de cada tabla)

Los productos se gestionan con el CRUD de arriba.

---

## 7. SEGURIDAD (obligatorio)

- **JWT:** firma con `JWT_SECRET` del `.env`, expiración (por ejemplo 2h), algoritmo explícito `HS256`. Middleware `authRequired` y `requireRole('admin')`. Errores: `401` sin/ con token inválido o vencido, `403` rol insuficiente.
- **CORS:** whitelist desde `CORS_ORIGIN` (admite lista separada por comas). **Prohibido `*`**. Permite solo los métodos y headers necesarios.
- **bcrypt:** hash al registrar y sembrar; jamás texto plano; jamás devolver `passwordHash`.
- **Validación y sanitización:** `express-validator` en **todas** las rutas con entrada (body, params, query): `trim`, `escape` en campos de texto libre, `normalizeEmail`, tipos numéricos estrictos. Middleware único que convierte los errores de validación en la respuesta consistente con `422`/`400`.
- **Manejo de errores centralizado:** `errorHandler` captura todo; en producción **no** expone stacktrace ni mensajes internos de Prisma; registra el detalle en el logger. Maneja códigos de Prisma (`P2002` único, `P2025` no encontrado, etc.).
- **Extras de endurecimiento:** `helmet`, `express-rate-limit` en auth, límite de tamaño del body (`express.json({ limit: '10kb' })`), `x-powered-by` desactivado, 404 consistente.
- **HTTPS opcional:** con `HTTPS=true` genera/usa un certificado self-signed en `server/certs/` (ignorado por git) y arranca con `https`. Documenta cómo generarlo (por ejemplo con `openssl`) y cómo aceptar el certificado en el navegador.
- **Frontend:** al pintar datos provenientes de la API, **no uses `innerHTML` con datos sin escapar** (previene XSS). Usa `textContent` o una función de escape. El token se guarda en `sessionStorage` o `localStorage` (documenta la decisión y su riesgo frente a cookies httpOnly).

El README debe documentar **al menos 3 riesgos OWASP Top 10** con su mitigación real en este código. Sugeridos (con referencia a archivos concretos):
1. **A01 Broken Access Control** → `authRequired` + `requireRole`, verificación de propietario en `mis-pedidos`, registro sin elevación de rol.
2. **A02 Cryptographic Failures** / **A07 Identification and Authentication Failures** → bcrypt, JWT con expiración, rate limit en login, mensajes genéricos.
3. **A03 Injection** → Prisma parametrizado + validación/sanitización con express-validator; XSS mitigado en frontend.
4. (Extra) **A04 Insecure Design** → el servidor recalcula precios y valida stock dentro de una transacción.

---

## 8. FRONTEND (MVC real)

Reglas generales:
- Módulos ES, sin duplicar lógica de render. Las **vistas** solo pintan y reciben datos; los **controladores** manejan eventos y orquestan; los **modelos** hablan con la API y manejan estado.
- `apiClient.js` centraliza `fetch` con `async/await`: agrega `Authorization`, parsea la respuesta consistente, y lanza errores tipificados para **red caída, 401 (sesión vencida → cerrar sesión y redirigir al login), 403 (sin permisos), 404, 422 y 500**. Muestra siempre un mensaje claro al usuario (región `aria-live`), nunca falla en silencio.
- `config.js` define `API_BASE_URL` (default `http://localhost:3000/api`).
- Navegación entre vistas dentro de `index.html` (SPA simple por secciones, o hash router). Maneja el foco al cambiar de vista.

Funcionalidades mínimas:

1. **Catálogo** desde `GET /api/productos`: tarjetas con el componente reutilizable `productoCard`, filtros por categoría (del Reto 1), estado de carga y de error, muestra stock/agotado, botón "Agregar al carrito" (deshabilitado si no hay stock).
2. **Carrito persistente** (localStorage mínimo): agregar, quitar, aumentar/disminuir, subtotal/IVA/total, tope por producto = mín(10, stock). Conserva el panel accesible con foco atrapado del Reto 1. Al cargar, sincroniza con precios/stock actuales de la API y avisa si algo cambió.
3. **Login/registro:** formularios con labels, validación y errores accesibles (`aria-invalid`, `aria-describedby`). Muestra el usuario logueado y botón de cerrar sesión.
4. **Login obligatorio para comprar:** si no hay sesión y se pulsa "Confirmar pedido", **no se envía nada**; muestra mensaje accesible (`role="alert"`) y redirige a la vista de login, conservando el carrito y regresando al checkout tras iniciar sesión.
5. **Checkout:** `POST /api/pedidos` enviando solo `{ productoId, cantidad }`. Si OK: vaciar carrito, mostrar confirmación (modal o sección accesible con número de pedido y total). Si falla (stock insuficiente, etc.): mensaje claro y carrito intacto.
6. **Mis pedidos:** vista con el historial del usuario (`GET /api/pedidos/mis-pedidos`).
7. **Panel Admin** (solo visible/accesible si `role === 'admin'`, y además protegido por el backend):
   - CRUD de productos: tabla + formulario crear/editar en modal accesible + confirmación de borrado.
   - Vista de **todas las tablas**: pestañas accesibles (`role="tablist"`) para Productos, Usuarios, Pedidos y Detalles de pedido, y el resumen de conteos.
8. Mantén favoritos y formulario de contacto del Reto 1 funcionando.

---

## 9. ACCESIBILIDAD (obligatorio)

- HTML5 semántico: `header`, `nav`, `main`, `section`, `footer`; un solo `h1` por vista, jerarquía de encabezados coherente.
- Todo operable por teclado, orden de tabulación lógico, **foco visible** (conserva el outline dorado).
- Cada `input` con `label` asociado; errores con `aria-invalid` + `aria-describedby`.
- ARIA en lo dinámico: `aria-live="polite"` para estados, `role="alert"` para errores, modales con `role="dialog"`, `aria-modal="true"`, foco atrapado, cierre con `Esc` y retorno del foco al disparador. Pestañas del admin con patrón ARIA correcto y flechas de teclado.
- Tablas con `<caption>`, `<th scope>`.
- Contraste AA (usa el dorado oscuro `#8b6508` sobre blanco para texto).
- Responsive (480/768/1024 px), `prefers-reduced-motion` respetado.
- Imágenes con `alt` descriptivo (ya vienen en `productos.json`).

---

## 10. PRUEBAS Y EVIDENCIAS (obligatorio)

Crea `server/scripts/smoke-test.js` (Node, `fetch` nativo) que, contra el servidor **realmente levantado** y la BD real, ejecute y reporte PASS/FAIL de estos escenarios y de algunos negativos:

1. Login admin → obtiene token.
2. Crear producto como admin → `201`.
3. Login user → intenta crear producto → **`403`**.
4. `GET /api/productos` público → lista (≥ 25).
5. Sin token en ruta protegida → `401`.
6. Confirmar pedido como user → `201`, y verificación en BD (consulta Prisma o `GET mis-pedidos`) de `Pedido` + `PedidoDetalle` y stock descontado.
7. Admin ve **todos** los pedidos → incluye el del user; user normal en `GET /api/pedidos` → `403`.
8. Negativos extra: pedido con stock insuficiente → error controlado; registro con `role: "admin"` en el body → queda como `user`; email duplicado → `409`; validación fallida → `422/400`; `GET /api/admin/usuarios` no contiene `passwordHash`.

Guarda la salida completa en `docs/evidencias/smoke-test.txt` y ejemplos de requests/responses reales (puedes generarlos con `curl` y guardarlos en `docs/evidencias/ejemplos-endpoints.md`). Si puedes, verifica también el frontend con un navegador headless (por ejemplo Playwright) para comprobar que el catálogo carga, el carrito persiste tras recargar, el login es obligatorio para comprar y el panel admin solo aparece para admin; guarda capturas en `docs/evidencias/` e inclúyelas en el README. Si no es posible instalar un navegador headless, déjalo anotado en `docs/BLOQUEOS.md` y entrega en cambio una lista de verificación manual en el README.

Agrega scripts de npm: `npm run dev`, `npm start`, `npm run db:migrate`, `npm run db:seed`, `npm run db:reset`, `npm test` (smoke test).

---

## 11. README.md (obligatorio, en la raíz)

Debe incluir, bien redactado y con formato claro:

1. Descripción del sistema y stack.
2. Arquitectura MVC del frontend y del backend (con diagrama de carpetas y flujo de una petición: *vista → controlador → modelo → API → ruta → middleware → controlador → modelo Prisma → BD*).
3. Modelo de datos (diagrama ER en Mermaid o texto).
4. **Cómo ejecutar paso a paso** desde cero: requisitos, `docker compose up -d`, copiar `.env.example` a `.env`, `npm install`, migrar, seed, arrancar backend, servir frontend (Live Server o `npx serve`/`python -m http.server` en el puerto del CORS), credenciales de prueba (**las del seed solo si el estudiante lo autorizó; usa las de ejemplo, no pongas contraseñas reales**).
5. Tabla de **endpoints y roles requeridos**.
6. **Medidas de seguridad aplicadas** con al menos 3 riesgos OWASP y su mitigación (sección 7).
7. Ejemplos/capturas de endpoints probados y resultado de las 7 pruebas mínimas.
8. Variables de entorno (`.env.example` explicado).
9. Accesibilidad aplicada.
10. Limitaciones conocidas y mejoras futuras.

`.env.example` debe incluir (con valores de ejemplo, **sin secretos reales**): `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `NODE_ENV`, `HTTPS`, `BCRYPT_ROUNDS`, y las credenciales de seed.

---

## 12. ENTREGA

1. Verifica que `.env` real y `node_modules` **no** estén en el paquete.
2. Genera `Reto2_Apellido_Nombre.zip` (con el nombre que dio el estudiante) en la raíz del proyecto o un nivel arriba, que contenga: `frontend/`, `server/` (con `prisma/schema.prisma`, `migrations/` y `seed.js`), `server/.env.example`, `docker-compose.yml`, `docs/`, `README.md`.
3. Comprueba el contenido del zip con `unzip -l` y confirma que no contiene secretos (`grep` por patrones del `.env` real).

---

## 13. REPORTE FINAL (`REPORTE_FINAL.md`)

Al terminar, escribe un reporte corto y honesto para que el estudiante lo lea al despertar:

- ✅/❌ por cada requisito del reto (arquitectura, BD, endpoints, seguridad, frontend, accesibilidad, pruebas, entregables).
- Resultado de las 7 pruebas mínimas (PASS/FAIL real).
- **Cómo levantar todo en 3 comandos.**
- Credenciales de prueba generadas (admin y user) y el puerto/URL.
- Decisiones tomadas por tu cuenta, bloqueos y planes B aplicados, y cualquier cosa que el estudiante deba revisar o completar a mano (por ejemplo capturas manuales).
- Ruta del zip generado.

---

## 14. ORDEN DE EJECUCIÓN (con checkpoints)

Avanza en este orden. No pases a la siguiente fase sin cumplir el checkpoint.

| Fase | Trabajo | Checkpoint (verifícalo ejecutando) |
|---|---|---|
| 0 | Cuestionario inicial | Respuestas recibidas |
| 1 | Reorganizar a `frontend/` y `server/`, `.gitignore`, `package.json`, dependencias | `npm install` sin errores |
| 2 | BD: Docker/SQL Server, `.env`, `schema.prisma`, migración, seed | Migración aplicada; seed crea 25 productos y 2 usuarios |
| 3 | Backend: middleware, modelos, controladores, rutas, logger, errorHandler | Servidor arranca; `GET /api/productos` responde |
| 4 | Seguridad: JWT, roles, CORS, validación, rate limit, (HTTPS opcional) | `401`/`403` correctos con `curl` |
| 5 | `smoke-test.js` y corrida completa | Todas las pruebas en PASS |
| 6 | Frontend MVC: models, views, controllers, estilos | Catálogo carga desde la API |
| 7 | Carrito, login obligatorio, checkout, mis pedidos, panel admin | Flujo completo comprar → pedido en BD |
| 8 | Accesibilidad y revisión responsive | Revisión por teclado y atributos ARIA |
| 9 | Pruebas de frontend/capturas, evidencias | Archivos en `docs/evidencias/` |
| 10 | README, `.env.example`, zip, `REPORTE_FINAL.md` | Zip verificado sin secretos |

---

## 15. DEFINICIÓN DE "TERMINADO"

Solo puedes dar el trabajo por terminado cuando **todo** esto sea cierto y esté comprobado:

- [ ] Estructura MVC clara en frontend (`models/views/controllers/assets`) y backend (`routes/controllers/models/middleware/prisma`).
- [ ] Prisma con las 4 tablas, migración commiteada y seed funcional.
- [ ] Todos los endpoints del reto funcionan con los roles correctos (más los de admin para ver todas las tablas).
- [ ] bcrypt, JWT Bearer, CORS por whitelist (sin `*`), validación y sanitización, errores centralizados sin stacktrace, logger.
- [ ] Pedido guardado en BD con detalles, precios recalculados en servidor, stock descontado en transacción.
- [ ] Frontend: catálogo desde API, carrito persistente, login obligatorio para comprar, checkout, mis pedidos, panel admin con CRUD y vista de todas las tablas.
- [ ] Accesibilidad: semántica, teclado, foco visible, labels, ARIA en dinámicos, contraste.
- [ ] Manejo de errores de API en el frontend (red, 401, 403, 500).
- [ ] Las 7 pruebas mínimas en PASS con evidencia guardada.
- [ ] README completo con ≥ 3 riesgos OWASP, `.env.example` sin secretos, zip final verificado.
- [ ] `REPORTE_FINAL.md` escrito.

## APÉNDICE A — Variante Supabase (solo si el estudiante eligió la opción 3)

Todo el documento se mantiene igual **excepto** lo específico de SQL Server. Aplica estos cambios:

**Datos que debes pedir en la FASE 0 (y nada más sobre la BD):**
1. **Connection string del Pooler** (Supabase → *Connect* → *ORMs* → Prisma, modo *Transaction pooler*, puerto 6543).
2. **Connection string directa o Session pooler** (puerto 5432), usada solo para migraciones.
Aclara que la contraseña de la base debe ir tal cual la define el proyecto; si tiene caracteres especiales (`@ : / # ?`), **tú** la codificas en formato URL. No pidas `anon key` ni `service_role key`: no se usan, el backend habla con la BD por Prisma.

**Cambios técnicos:**
- `datasource db`: `provider = "postgresql"`, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`.
- `.env` / `.env.example`: `DATABASE_URL="postgresql://postgres.PROYECTO:PASSWORD@aws-X-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"` y `DIRECT_URL="postgresql://...:5432/postgres"` (valores falsos en el example).
- Quita todos los `@db.NVarChar(...)`: usa tipos nativos (`String`, `@db.VarChar(n)` opcional). Mantén `@db.Decimal(10, 2)`. En PostgreSQL **sí puedes** usar `enum Role { admin user }` en lugar de `String`; elige uno y documéntalo.
- **No** crees `docker-compose.yml` ni `schema.sqlserver.prisma`.
- Las migraciones (`prisma migrate dev` / `migrate deploy`) deben usar `DIRECT_URL`. Si la conexión directa falla por red (puede ser solo IPv6), usa la cadena del **Session pooler** (puerto 5432) como `DIRECT_URL` y anótalo en `docs/DECISIONES.md`.
- Dentro de `$transaction`, el pooler en modo transacción funciona con Prisma gracias a `?pgbouncer=true`; verifica que el flujo de pedidos funciona de verdad.

**Seguridad específica de Supabase (obligatorio, es un riesgo OWASP real):**
Supabase expone automáticamente las tablas del esquema `public` por una API REST pública. Si no se activa RLS, cualquiera con la `anon key` podría leer o modificar datos saltándose tu backend. Por eso:
- Añade a la migración SQL (o en una migración propia) `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` para **las 4 tablas** (`Producto`, `Usuario`, `Pedido`, `PedidoDetalle`), **sin crear políticas**. Prisma se conecta con el rol `postgres`, que ignora RLS, por lo que tu backend sigue funcionando y la API REST pública queda bloqueada.
- Verifica con la API REST de Supabase (usando una anon key de prueba **solo si el estudiante la proporciona; si no, omítelo y documéntalo**) o consultando `pg_tables.rowsecurity` que RLS quedó activo.
- Menciónalo en el README como medida de **A01 Broken Access Control / A05 Security Misconfiguration**.

**Otros ajustes:**
- La prueba de "pedido en BD" se hace igual (Prisma o `GET mis-pedidos`).
- `db:reset` debe pedir confirmación explícita por variable (`CONFIRM_RESET=yes`) para no borrar una BD en la nube por accidente.
- README: explica cómo crear el proyecto en Supabase, dónde copiar las dos cadenas de conexión y cómo correr migración y seed.
- En `REPORTE_FINAL.md` indica que el motor es PostgreSQL (Supabase) y por qué cumple "otro motor relacional" del enunciado.

---

**Empieza ahora con la FASE 0.**
