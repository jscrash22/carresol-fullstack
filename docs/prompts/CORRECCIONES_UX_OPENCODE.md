# 🎯 CORRECCIONES DE UX — Carresol Reto 2 (4 puntos, sin romper nada)

Eres un ingeniero full stack senior que trabaja de forma **autónoma** sobre **Carresol (Reto 2)**, ya desplegado: repo `jscrash22/carresol-fullstack` (rama `main`), frontend en GitHub Pages, API en Render (plan free), BD en Supabase. El estudiante probó el sitio y pidió **cuatro correcciones**. En cada punto ya se identificó la causa probable en el código: **confírmala reproduciéndola antes de cambiar nada**.

## 0. Reglas
1. **Cero preguntas.** Decide con criterio y anótalo en `docs/DECISIONES.md`.
2. **Secretos:** nunca imprimas ni escribas contraseñas, cadenas de conexión, `JWT_SECRET`, API keys ni tokens. No toques `server/.env`.
3. **No dañes lo existente:** contrato de la API (solo se **añade**), MVC, accesibilidad, estética blanco/dorado y las pruebas actuales (81 backend, 37 E2E, 31 accesibilidad, 29 del super prompt) deben seguir en PASS. Crea el tag `antes-ux` y trabaja en la rama `ux-correcciones`; fusiona a `main` solo si todo pasa. Si un cambio provoca regresión que no puedas arreglar, revierte ese commit y anótalo en `docs/BLOQUEOS.md`.
4. **No ensucies Supabase:** las pruebas de escritura usan datos `TEST-` (correos `test+…@carresol.test`, productos/variantes de prueba) y limpian solo lo suyo; **nunca** `db:reset` si hay datos reales.
5. Windows/PowerShell (`npm.cmd`/`npx.cmd` si hace falta). Commits pequeños en español; `push` a `main` al final (sin `--force`).
6. Todo texto de UI en español, accesible (`role`, `aria-*`, foco visible, contraste AA, `prefers-reduced-motion`).

---

## 1. Mensaje claro cuando se crea un usuario
**Hecho:** `authController.js` ya lanza `toast('Cuenta creada. ¡Bienvenido/a, …!')`, pero el `toast` aparece abajo a la izquierda, se desvanece rápido y la app navega enseguida, así que el usuario no lo percibe.
**Implementa:**
1. Mensaje **visible y persistente** en el propio formulario: bloque `role="status"` con ✅ **"Usuario creado correctamente"** y el nombre; que no desaparezca hasta que el usuario continúe o pasen ≥ 6 s.
2. Tras el registro (que hace login automático), **conserva el aviso** en la vista de destino (banner superior `aria-live="polite"`, con botón cerrar) para que no se pierda por la navegación.
3. Los errores de registro (correo duplicado 409, contraseña débil, cédula inválida) también deben mostrarse **dentro del formulario**, no solo como toast.
4. Reutiliza un componente común de avisos en `uiComponents.js` (sin duplicar lógica) y ajusta la posición del `toast` para que sea visible en móvil sin tapar botones.

## 2. Poder salir del detalle de producto (icono ✕)
**Hecho:** el modal de detalle ya crea un botón `✕` (`.btn-cerrar`), pero solo tiene `background: none` y `font-size: 1.25rem`, está posicionado `absolute` **dentro del contenido que se desplaza**, y por eso no se ve o se pierde al hacer scroll. Además, `submit` siempre cierra el modal.
**Implementa:**
1. **Botón de cierre visible**: icono ✕ en SVG dentro de un círculo con borde/fondo y contraste AA, objetivo táctil ≥ 44×44 px, **fijo (sticky/fixed) en la esquina superior derecha del modal** aunque haya scroll, con foco visible y `aria-label="Cerrar detalle de producto"`.
2. Cierre también con: **Esc**, **clic en el fondo oscuro** y un enlace/botón secundario **"Volver al catálogo"** al pie del modal (útil en móvil). Al cerrar, devuelve el foco a la tarjeta que lo abrió.
3. Crea el botón de cierre como **componente compartido** (`uiComponents.js`) y úsalo en todos los modales (detalle, login, carrito, formularios del admin) para mantener consistencia.

## 3. La página tarda en cargar al entrar
**Hipótesis (verifícala con mediciones):** el plan gratis de Render **se duerme** (arranque en frío de ~30–60 s) y, además, el arranque del frontend espera la API para pintar (solo muestra un spinner).
**Primero mide** con Playwright (con y sin la API "caliente", y con red lenta): tiempo hasta ver algo útil y hasta el catálogo. Guarda los números en `docs/evidencias/rendimiento.txt` (UTF-8) **antes y después**.
**Implementa (sin romper el stock en tiempo real del §4):**
1. **Pintar ya la estructura** (header, hero, filtros) y mostrar **tarjetas esqueleto** (skeleton) en lugar de un spinner, respetando `prefers-reduced-motion`.
2. **Caché del último catálogo** (stale-while-revalidate): guarda una copia con fecha y versión; en la siguiente visita pínta la copia al instante y **revalida en segundo plano**; marca discretamente "actualizando…" y aplica el stock fresco al llegar. El carrito y el checkout **siempre** revalidan con la API (no confíes en la copia para comprar). Registra la política en la tabla de almacenamiento del README (es información pública, sin datos personales).
3. **Despertar la API cuanto antes:** `<link rel="preconnect">` al origen de la API y una petición ligera a `/api/health` lanzada **al inicio del `<head>`** (antes de cargar los módulos); lanza en **paralelo** (`Promise.allSettled`) catálogo, `config-publica` y `/auth/me` en vez de en serie.
4. **Mensaje honesto de espera:** si la primera respuesta tarda > 3 s, muestra "El servidor está despertando… (≈ N s)" con `aria-live`, y reintento automático (ya existe parte; unifícalo).
5. **Imágenes:** `loading="lazy"` y `decoding="async"` en las tarjetas, `width`/`height` para evitar saltos de diseño, `fetchpriority="high"` solo en la imagen principal del hero; `modulepreload` de los módulos de arranque.
6. Documenta en README (Limitaciones) que el arranque en frío de Render es inherente al plan gratis y qué se hizo para que se **sienta** rápido. **No** pongas pings continuos para mantener la API despierta.

## 4. Sin tope de 10: la cantidad válida es el stock real
**Hechos:**
- `frontend/config.js` define `MAX_POR_VARIANTE = 10` y lo usan `carritoModel.js` (`topePorVariante`), `productoDetalleView.js` (`input.max`) y `checkoutView.js`.
- En el servidor, `middleware/validators.js` limita `items.*.cantidad` a **50** (pedidos y carrito; 500 en compras), lo que seguiría bloqueando compras grandes aunque haya stock.
- En el detalle, el formulario tiene `noValidate = true`; el `submit` llama a `onAgregar(...)` y **siempre** hace `cerrarModal(m)`: aunque el carrito rechace la cantidad (por ejemplo 2000), el modal se cierra y solo queda un toast.
**Implementa:**
1. **Elimina el tope fijo de 10:** `topePorVariante(item)` = **stock de la variante** (y descuenta lo que ya hay en el carrito). Quita `MAX_POR_VARIANTE` de `config.js` y de todos sus usos; `input.max` = stock.
2. **Validación dentro del modal, sin cerrarlo:** antes de agregar comprueba entero ≥ 1 y ≤ disponible. Si no cumple, **el modal permanece abierto** y se muestra un error en línea (`role="alert"`, `aria-invalid="true"`, `aria-describedby`, foco en el campo) con mensajes como:
   - "Solo hay **N** unidades disponibles de esta variante. Elige una cantidad entre 1 y N."
   - Si ya hay unidades en el carrito: "Ya tienes **X** en tu carrito; puedes agregar hasta **Y** más."
   - Si no es un número válido: "Ingresa una cantidad válida (entero mayor que 0)."
   Añade un botón de ayuda **"Usar el máximo (N)"**. Si el stock es 0: "Agotado" con el botón deshabilitado.
3. `onAgregar` debe **devolver el resultado** (`{ ok, mensaje }`); el modal **solo se cierra cuando `ok` es `true`** y muestra confirmación ("Agregado al carrito").
4. En el panel del carrito, los botones +/− siguen respetando el stock y, si la cantidad cambió en el servidor, avisa claramente qué se ajustó. (Opcional: permitir escribir la cantidad con la misma validación.)
5. **Servidor:** sube el tope "de cordura" de `items.*.cantidad` y `cantidad` (pedidos y carrito) a **10000**, pero **el límite real lo sigue marcando el stock**: si se pide más de lo disponible, responde `409` con el mensaje "Stock insuficiente: solo hay N unidades" y el detalle por item. Mantén las transacciones atómicas y el descuento condicional ya existentes. El frontend debe mostrar ese mensaje y reajustar el carrito.
6. Actualiza README y `DECISIONES.md`: "el tope por producto es el stock real; ya no existe el límite de 10 del Reto 1".

---

## 5. Pruebas (UTF-8: `fs.writeFileSync(..., 'utf8')`)
Agrega a E2E (idealmente contra la **API real** con datos `TEST-`, no solo simulada) y al smoke test:
1. Registro válido → aparece "Usuario creado correctamente" (visible, persiste ≥ 6 s y sobrevive a la navegación); correo duplicado → error en el formulario.
2. El botón ✕ del detalle es visible y clicable a 360 px de ancho y con scroll; Esc y clic en el fondo cierran; el foco vuelve a la tarjeta; "Volver al catálogo" cierra.
3. Rendimiento: con API lenta (retardo simulado de 5 s) se ven esqueletos en < 500 ms; en la segunda visita el catálogo aparece al instante desde la copia y luego se actualiza; compara antes/después en `rendimiento.txt`.
4. Cantidad: pedir **2000** de una variante con stock N → el modal **no se cierra** y muestra el mensaje con N; cantidad válida → se agrega y se cierra; con X ya en el carrito, pedir más de Y → mensaje "puedes agregar hasta Y más"; pedido de más de 10 unidades (con stock) → **se crea** correctamente (backend real); pedido de más que el stock → `409` con mensaje claro.
5. Regresión completa: backend (81), E2E (37), accesibilidad (31) y las 29 del super prompt siguen en PASS. Los casos de `forgot-password` salen como **SKIP** (no FAIL) cuando se corre contra producción.

## 6. Cierre
Actualiza README (almacenamiento: caché del catálogo; sin tope de 10; avisos) y `DECISIONES.md`; escaneo de secretos antes de cada commit; `git push origin main`; confirma que **GitHub Pages** y **Render** redespliegan y haz solo una verificación de **lectura** en línea (`/api/health`, `/api/productos`, carga del sitio). Regenera `Reto2_Apellido_Nombre.zip` con rutas `/` (tar o 7z), sin `.env`, `node_modules`, `.git` ni backups, y entrega un resumen final con ✅/❌ por punto y los números de rendimiento antes/después.

**Empieza ahora; no hagas preguntas.**