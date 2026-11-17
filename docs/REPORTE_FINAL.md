# 📋 REPORTE FINAL — Carresol Reto 2

Proyecto: e-commerce full stack de joyería con modelo ER real en PostgreSQL, módulo de
compras, frontend MVC adaptado y verificación completa. Este reporte cierra el trabajo por
fases descrito en `docs/prompts/PROMPT_CONTINUACION_OPENCODE.md`.

---

## 1. Requisitos originales del Reto 2

| Requisito | Estado | Evidencia |
|---|---|---|
| Frontend MVC en `/frontend/{models,views,controllers,assets}` + `index.html` semántico | ✅ | 7 controladores, 12 vistas, 9 modelos; `frontend/` |
| Backend MVC en `/server/{routes,controllers,models,middleware,prisma}` | ✅ | 11 routers, 9 controladores, 15 modelos, 5 middlewares |
| Persistencia relacional con Prisma (≥ Producto, Usuario, Pedido, PedidoDetalle) | ✅ | 27 modelos en `server/prisma/schema.prisma` (PostgreSQL) |
| `POST /api/auth/login` (devuelve JWT) y `POST /api/auth/register` | ✅ | Smoke 1-2, 11-13 |
| `GET /api/productos` y `GET /api/productos/:id` públicos | ✅ | Smoke 3-5 |
| `POST/PUT/DELETE /api/productos(/:id)` con JWT + admin | ✅ | Smoke 6-7, 33-35, 62 |
| `POST /api/pedidos` (JWT) | ✅ | Smoke 22-24 |
| `GET /api/pedidos/mis-pedidos` (JWT) | ✅ | Smoke 25 |
| `GET /api/pedidos` (JWT + admin) | ✅ | Smoke 27 (y 403 para user) |
| Seguridad: JWT Bearer, roles, CORS whitelist, bcrypt, validación/sanitización, errores sin stacktrace, logger | ✅ | `server/app.js`, `server/middleware/*`; smoke 9-10, 13, 61 |
| README con ≥ 3 riesgos OWASP y su mitigación | ✅ | `README.md`, sección «Seguridad» (5 riesgos con archivo/línea) |
| Catálogo desde la API en el frontend | ✅ | E2E 1-6 (paginación de 8 por página) |
| Carrito persistente (localStorage) | ✅ | E2E 7-10, 15 (sync con servidor al login) |
| Login obligatorio para comprar | ✅ | E2E 16 (`#/checkout` exige sesión) |
| Checkout que envía a `POST /api/pedidos` | ✅ | E2E 17-19 |
| Panel admin: CRUD productos + vista de todas las tablas, solo visible para admin | ✅ | E2E 32-36; 11 pestañas; 403 de user verificado (a11y F1) |
| Accesibilidad: HTML semántico, teclado, foco visible, labels, ARIA, contraste AA | ✅ | `docs/evidencias/accesibilidad.txt` (31 PASS) |
| Entregable `Reto2_Apellido_Nombre.zip` sin `node_modules` ni `.env` | ✅ | `Reto2_Carresol.zip` (renombrar con Apellido_Nombre, ver §6) |
| `.env.example` sin secretos y `README.md` completo | ✅ | `server/.env.example`, `README.md` |

### Las 7 pruebas mínimas (con evidencia)

| # | Prueba | Estado |
|---|---|---|
| 1 | Login admin → token JWT | ✅ smoke 1 |
| 2 | Crear producto (admin) | ✅ smoke 6 |
| 3 | User creando producto → 403 | ✅ smoke 7 |
| 4 | Catálogo visible en el frontend | ✅ E2E 1-2 |
| 5 | Carrito funciona y persiste | ✅ E2E 7-10, 15 |
| 6 | Confirmar pedido (user) → pedido en BD | ✅ smoke 22-24 y E2E 19 |
| 7 | Admin ve todos los pedidos | ✅ smoke 27 y E2E 34 |

---

## 2. Modelo ER (por entidad)

Migración inicial: `server/prisma/migrations/20261110212031_init_modelo_er` (DDL con ENUMs
nativos, CHECKs, índices y únicos). Seed idempotente: 5 categorías, materiales, 25
productos con variantes e imágenes, 2 usuarios, punto de emisión 001-001, dirección de
ejemplo y parámetros.

| Entidad | Estado | Notas |
|---|---|---|
| `roles` | ✅ | admin/user; el registro SIEMPRE crea `user` |
| `usuarios` | ✅ | `password_hash`, cédula validada (módulo 10), `email_verificado`, `ultimo_login`, bloqueo si `activo=false` |
| `password_reset_tokens` | ✅ | solo hash SHA-256, 30 min, un solo uso; smoke 65-70 |
| `direcciones` | ✅ | CRUD propio + predeterminada; snapshot en envíos |
| `categorias` | ✅ | CRUD admin + baja lógica |
| `materiales` | ✅ | CRUD admin + baja lógica |
| `productos` | ✅ | precio/stock derivados de variantes activas; baja lógica si tiene ventas |
| `producto_material` | ✅ | M:N del catálogo |
| `producto_imagen` | ✅ | imagen principal + galería |
| `variantes` | ✅ | SKU único, material × tipo/valor de medida, precio, stock, `stock_minimo` |
| `carritos` / `carrito_items` | ✅ | carrito servidor por variante; se vacía al confirmar pedido |
| `favoritos` | ✅ | por producto y usuario; frontend híbrido (invitado local) |
| `pedidos` | ✅ | totales congelados, estados con ENUM |
| `pedido_items` | ✅ | snapshots de nombre/SKU/precio al comprar |
| `pedido_historial_estados` | ✅ | traza completa de cambios |
| `pagos` | ✅ | pasarela simulada; tarjeta inmediata, resto pendiente hasta admin |
| `puntos_emision` | ✅ | secuencia de facturas por punto |
| `facturas` | ✅ | numeración `001-001-XXXXXXXXX` + clave de acceso de 49 dígitos simulada |
| `envios` | ✅ | snapshot de dirección + estados de envío |
| `mensaje_contacto` | ✅ | bandeja admin con leído/sin leer |
| `parametros_sistema` | ✅ | IVA 15%, costo de envío, secuenciales |
| `auditoria` | ✅ | tabla/registro/acción/datos y usuario vía `$extends` de Prisma |
| `proveedores` | ✅ | CRUD admin con RUC único |
| `compras` / `compra_items` | ✅ | módulo completo (ver §3) |
| `movimientos_inventario` | ✅ | kardex: venta, compra, ajuste, devolución |

---

## 3. Módulo de compras (reposición de inventario)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| CRUD de proveedores (RUC único, baja lógica) | ✅ | Smoke 45-47 |
| Crear compra en `borrador` con ítems por variante | ✅ | Smoke 48 |
| Editar compra (solo en `borrador`) | ✅ | Smoke 49 + regla 409 en 53b |
| Flujo `borrador → ordenada → recibida` (y `cancelada`) | ✅ | Smoke 50-53 |
| Recepción suma stock **exactamente una vez** (idempotente) | ✅ | Smoke 51-54 (repetir recibir → 409; stock igual) |
| Compra cancelada nunca suma stock | ✅ | Smoke 53c |
| Kardex `movimientos_inventario` con tipo `compra` | ✅ | Smoke 54 |
| Panel admin: pestaña Compras + recepción desde la UI | ✅ | E2E 34; captura `14-admin-compras.png` |
| Inventario: stock bajo (≤ `stock_minimo`) y kardex filtrable | ✅ | Smoke 55, E2E 35; captura `15-admin-inventario.png` |

---

## 4. Resultado real de las pruebas

Ejecutadas contra el backend y PostgreSQL reales (contraseñas nunca impresas):

- **Smoke test backend: 81 PASS / 0 FAIL** → `docs/evidencias/smoke-test.txt`
- **E2E frontend (Playwright headless, Edge del sistema): 37 PASS / 0 FAIL** →
  `docs/evidencias/e2e-frontend.txt`
- **Accesibilidad: 31 PASS / 0 FAIL** → `docs/evidencias/accesibilidad.txt`
  (teclado, foco, ARIA, contraste AA, responsive, error de red y 403)
- **18 capturas** de todas las vistas → `docs/evidencias/capturas/01-18-*.png`
- Línea base previa a la migración: `docs/evidencias/smoke-test-baseline.txt`
- Ejemplos de uso de la API: `docs/evidencias/ejemplos-endpoints.md`

---

## 5. Cómo levantar todo en pocos comandos

```powershell
# 1) BD (Docker) — o PostgreSQL local/Supabase
docker compose --env-file server/.env up -d

# 2) Secretos
cd server
Copy-Item .env.example .env   # editar DATABASE_URL, JWT_SECRET, SEED_*

# 3) Dependencias, migración y seed (idempotente)
npm install
npm run db:migrate
npm run db:seed

# 4) Backend + frontend (dos terminales)
npm start                      # API en http://localhost:3000
node scripts/serve-frontend.js # Tienda en http://localhost:5500

# 5) Pruebas
npm test                       # 81 PASS
```

---

## 6. Credenciales de prueba (generadas para el seed)

Usuarios creados por `npm run db:seed`. Las contraseñas **no se escriben en la
documentación**: viven solo en `server/.env` (`SEED_ADMIN_PASSWORD` y
`SEED_USER_PASSWORD`).

| Usuario | Correo | Contraseña | Rol |
|---|---|---|---|
| Admin Carresol | `admin@carresol.com` | `ver server/.env` | admin |
| Cliente Prueba | `cliente@carresol.com` | `ver server/.env` | user |

> Las contraseñas se **rotaron** para el despliegue en Supabase (generadas con
> `crypto.randomBytes`). Si necesitas las actuales, están en `server/.env` o en el
> archivo local `render-variables-SECRETO.md` del escritorio (bórralo al terminar).

> ⚠️ El zip del entregable se generó como **`Reto2_Carresol.zip`**: renómbralo a
> **`Reto2_Apellido_Nombre.zip`** con tus datos antes de entregarlo (no se solicitó el
> nombre durante el desarrollo; ver `docs/BLOQUEOS.md`, B02).

---

## 7. Decisiones, bloqueos y planes B

Decisiones por fase (detalle en `docs/DECISIONES.md`):

- **Plan B de BD (B03→B01):** PostgreSQL local (puerto 5432, BD `carresol`) en lugar de
  Supabase/SQL Server. Migrar a Supabase = editar `.env` + `npx prisma migrate deploy` +
  `npm run db:seed` + activar RLS (plan en `docs/legacy/rls_supabase.sql`).
- **BigInt → Number** y DECIMAL → Number al salir de los modelos (JSON plano).
- **Pago y facturación simulados** (sin pasarela real ni SRI); la clave de acceso de 49
  dígitos es generada.
- **Compras = reposición de stock**: flujo borrador→ordenada→recibida con recepción
  idempotente.
- **Carrito por variante** con tope `mín(10, stock)`; favoritos híbridos invitado/cuenta.
- **401 → evento `carresol:sesion-expirada`** en el frontend (aviso + redirección);
  la caída de la red NO cierra la sesión.
- **P2 implementados** (FASE 10): recuperación de contraseña completa + los que ya
  existían (cédula módulo 10, bloqueo por `activo=false`, `ultimo_login`).
- **Paginación del catálogo de 8 por página** (patrón del Reto 1 conservado; no es un bug).

Bloqueos y pendientes del estudiante (detalle en `docs/BLOQUEOS.md`):

- **B01**: activar RLS en Supabase al migrar (SQL listo en `docs/legacy/rls_supabase.sql`).
- **B02**: renombrar el zip con Apellido/Nombre.
- **B04**: Render u otro host al desplegar (instrucciones en el README, pendiente de
  cuenta del estudiante).

---

## 8. Qué debe revisar o completar el estudiante a mano

1. **Renombrar el zip** a `Reto2_Apellido_Nombre.zip` (B02).
2. **Si usa Supabase**: crear el proyecto, copiar las cadenas al `.env` y ejecutar el SQL
   de RLS (B01).
3. **Despliegue** en Render/Railway/Fly siguiendo el README (B04).
4. **Correo real** para la recuperación de contraseña (los endpoints están listos; en
   producción no se devuelve el token).
5. Revisar `docs/DECISIONES.md` y `docs/BLOQUEOS.md` antes de entregar: recogen todas las
   decisiones técnicas y sus porqués.
6. La BD local quedó con datos de prueba (pedidos, compras, mensajes y usuarios smoke de
  las verificaciones); el seed es idempotente y puede re-sembrarse sin limpiar nada.
