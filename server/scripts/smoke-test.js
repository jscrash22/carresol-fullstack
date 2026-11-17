// smoke-test.js — pruebas de humo end-to-end contra el servidor REAL y la BD real
// Uso: primero levanta el backend (npm start en server/) y luego: npm test
// Lee credenciales de server/.env (nunca las imprime en la salida).
//
// Cubre las 7 pruebas mínimas del Reto 2 + el modelo ER completo:
// variantes, direcciones, carrito, favoritos, contacto, compras a proveedores,
// inventario, auditoría, facturación (001-001-X + clave de 49) y anti-IDOR.
// La salida completa se guarda en docs/evidencias/smoke-test-local.txt (UTF-8).
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const USER_EMAIL = process.env.SEED_USER_EMAIL;
const USER_PASSWORD = process.env.SEED_USER_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !USER_EMAIL || !USER_PASSWORD) {
  console.error('Faltan credenciales de seed en server/.env (SEED_ADMIN_*/SEED_USER_*)');
  process.exit(1);
}

// ---------- Reporte con evidencia en archivo (UTF-8) ----------
const aqui = dirname(fileURLToPath(import.meta.url));
const rutaEvidencia = join(aqui, '..', '..', 'docs', 'evidencias', 'smoke-test-local.txt');
const salida = [];
function imprimir(texto = '') {
  console.log(texto);
  salida.push(texto);
}

let pasadas = 0;
let fallidas = 0;
function reportar(nombre, condicion, detalle = '') {
  if (condicion) {
    pasadas++;
    imprimir(`PASS ✓ ${nombre}${detalle ? ' — ' + detalle : ''}`);
  } else {
    fallidas++;
    imprimir(`FAIL ✗ ${nombre}${detalle ? ' — ' + detalle : ''}`);
  }
}

async function peticion(metodo, ruta, { token, cuerpo } = {}) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* respuesta no JSON */ }
  return { status: res.status, json };
}

imprimir(`=== SMOKE TEST Carresol API — ${BASE} — ${new Date().toISOString()} ===`);
imprimir(`Backend: PostgreSQL real (modelo ER completo). Contraseñas: NO se imprimen.`);
imprimir('');

// ---------- 1-2. Login admin y user ----------
const loginAdmin = await peticion('POST', '/api/auth/login', {
  cuerpo: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
});
reportar('1. Login admin → 200 + token + rol admin',
  loginAdmin.status === 200 && loginAdmin.json?.ok && typeof loginAdmin.json.data.token === 'string'
  && loginAdmin.json.data.usuario.role === 'admin',
  `rol: ${loginAdmin.json?.data?.usuario?.role}`);
const tokenAdmin = loginAdmin.json?.data?.token;

const loginUser = await peticion('POST', '/api/auth/login', {
  cuerpo: { email: USER_EMAIL, password: USER_PASSWORD },
});
reportar('2. Login usuario → 200 + rol user',
  loginUser.status === 200 && loginUser.json?.data?.usuario?.role === 'user');
const tokenUser = loginUser.json?.data?.token;

// ---------- 3-6. Catálogo público (contrato §6 + variantes) ----------
const lista = await peticion('GET', '/api/productos');
const primero = lista.json?.data?.[0];
reportar('3. GET /api/productos público → ≥ 25 productos con variantes',
  lista.status === 200 && Array.isArray(lista.json?.data) && lista.json.data.length >= 25
  && Array.isArray(primero?.variantes) && primero.variantes.length >= 1
  && typeof primero.variantes[0].sku === 'string'
  && Number.isFinite(primero.variantes[0].precio),
  `total: ${lista.json?.data?.length}, variante 1: ${primero?.variantes?.[0]?.sku}`);

const anillos = await peticion('GET', '/api/productos?categoria=anillos');
reportar('4. Filtro por categoría anillos → 5 y solo anillos',
  anillos.status === 200 && anillos.json?.data?.length === 5
  && anillos.json.data.every((p) => p.categoria === 'anillos'));

const detalleProd = await peticion('GET', `/api/productos/${primero.id}`);
reportar('5. GET /api/productos/:id → detalle con materiales e imágenes',
  detalleProd.status === 200 && Array.isArray(detalleProd.json?.data?.materiales)
  && Array.isArray(detalleProd.json?.data?.imagenes));

const inexistente = await peticion('GET', '/api/productos/999999999');
reportar('6. Producto inexistente → 404 NO_ENCONTRADO',
  inexistente.status === 404 && inexistente.json?.error?.codigo === 'NO_ENCONTRADO');

// ---------- 7-8. Productos admin ----------
const productoPrueba = {
  nombre: 'Producto Smoke Test',
  descripcion: 'Producto efímero creado por la prueba de humo.',
  categoria: 'relojes',
  precio: 99.99,
  stock: 1,
  imagen: 'assets/img/relojes/reloj-carresol-minimal.jpg',
  alt: 'Producto de prueba del smoke test',
};
const crear = await peticion('POST', '/api/productos', { token: tokenAdmin, cuerpo: productoPrueba });
reportar('7. Admin crea producto (payload clásico §6) → 201 con variante automática',
  crear.status === 201 && crear.json?.ok && crear.json.data.id > 0
  && crear.json.data.variantes.length === 1 && crear.json.data.stock === 1
  && crear.json.data.precio === 99.99,
  `id: ${crear.json?.data?.id}, sku: ${crear.json?.data?.variantes?.[0]?.sku}`);
const idProductoPrueba = crear.json?.data?.id;
const idVariantePrueba = crear.json?.data?.variantes?.[0]?.id;

const crearComoUser = await peticion('POST', '/api/productos', { token: tokenUser, cuerpo: productoPrueba });
reportar('8. User crea producto → 403 PROHIBIDO',
  crearComoUser.status === 403 && crearComoUser.json?.error?.codigo === 'PROHIBIDO');

// ---------- 9-13. Autenticación negativa ----------
const sinToken = await peticion('POST', '/api/pedidos', { cuerpo: { items: [{ productoId: 1, cantidad: 1 }] } });
reportar('9. POST /api/pedidos sin token → 401',
  sinToken.status === 401 && sinToken.json?.error?.codigo === 'NO_AUTORIZADO');
const tokenBasura = await peticion('GET', '/api/pedidos/mis-pedidos', { token: 'no-es-un-token' });
reportar('10. Token inválido → 401', tokenBasura.status === 401);

const emailUser2 = `smoke2-${Date.now()}@carresol.com`;
const registro = await peticion('POST', '/api/auth/register', {
  cuerpo: { nombre: 'Usuario Intruso', email: emailUser2, password: 'ClaveForte123', role: 'admin' },
});
reportar('11. Registro con role:"admin" → queda user (anti mass-assignment)',
  registro.status === 201 && registro.json?.data?.usuario?.role === 'user',
  `rol real: ${registro.json?.data?.usuario?.role}`);
const tokenUser2 = registro.json?.data?.token;

const duplicado = await peticion('POST', '/api/auth/register', {
  cuerpo: { nombre: 'Duplicado', email: USER_EMAIL, password: 'ClaveForte123' },
});
reportar('12. Email duplicado → 409', duplicado.status === 409);

const invalido = await peticion('POST', '/api/auth/register', {
  cuerpo: { nombre: 'x', email: 'no-es-email', password: 'debil' },
});
reportar('13. Validación fallida → 422 con detalles por campo',
  invalido.status === 422 && Array.isArray(invalido.json?.error?.detalles)
  && invalido.json.error.detalles.every((d) => d.campo && d.mensaje),
  `${invalido.json?.error?.detalles?.length} campos inválidos`);

// ---------- 14-16. Direcciones ----------
const direccionNueva = {
  alias: 'Oficina Smoke',
  destinatario: 'Cliente De Prueba',
  telefono: '0998765432',
  provincia: 'Pichincha',
  ciudad: 'Quito',
  callePrincipal: 'Av. 6 de Diciembre',
  calleSecundaria: 'Y Wilson',
  numeracion: 'N27-112',
  referencia: 'Cerca del parque La Carolina',
  codigoPostal: '170135',
  esPredeterminada: true,
};
const crearDir = await peticion('POST', '/api/direcciones', { token: tokenUser, cuerpo: direccionNueva });
reportar('14. User crea dirección de envío → 201',
  crearDir.status === 201 && crearDir.json?.data?.id > 0 && crearDir.json?.data?.esPredeterminada === true);
const idDireccion = crearDir.json?.data?.id;

const dirs = await peticion('GET', '/api/direcciones', { token: tokenUser });
reportar('15. GET /api/direcciones → contiene la creada',
  dirs.status === 200 && dirs.json?.data?.some((d) => d.id === idDireccion));

const editarDir = await peticion('PUT', `/api/direcciones/${idDireccion}`, {
  token: tokenUser, cuerpo: { referencia: 'Edificio azul, junto a la farmacia' },
});
reportar('16. PUT /api/direcciones/:id parcial → 200',
  editarDir.status === 200 && editarDir.json?.data?.referencia === 'Edificio azul, junto a la farmacia');

// ---------- 17-20. Carrito persistido ----------
// Producto con stock suficiente para todo el flujo (variante específica)
const productoPedido = lista.json.data.find((p) => p.stock >= 6 && p.variantes[0]?.stock >= 6);
const variantePedido = productoPedido?.variantes?.[0];

const sync = await peticion('PUT', '/api/carrito', {
  token: tokenUser,
  cuerpo: { items: [{ varianteId: variantePedido.id, cantidad: 1 }] },
});
reportar('17. PUT /api/carrito (sincronización local) → 200 con 1 item',
  sync.status === 200 && sync.json?.data?.cantidadItems === 1);

const carrito = await peticion('GET', '/api/carrito', { token: tokenUser });
reportar('18. GET /api/carrito → mismo item con precio del servidor',
  carrito.status === 200 && carrito.json?.data?.items?.[0]?.varianteId === variantePedido.id
  && carrito.json.data.items[0].precioUnitario === variantePedido.precio);

const addItem = await peticion('POST', '/api/carrito/items', {
  token: tokenUser, cuerpo: { varianteId: variantePedido.id, cantidad: 1 },
});
reportar('19. POST /api/carrito/items → incrementa cantidad',
  addItem.status === 201 && addItem.json?.data?.items?.[0]?.cantidad === 2);

const quitarItem = await peticion('DELETE', `/api/carrito/items/${variantePedido.id}`, { token: tokenUser });
reportar('20. DELETE /api/carrito/items/:varianteId → quita el item',
  quitarItem.status === 200 && quitarItem.json?.data?.cantidadItems === 0);

// ---------- 21-24. Pedido completo (transacción §6) ----------
const pedidosAntes = await peticion('GET', '/api/pedidos', { token: tokenAdmin });
const maxPrevio = Math.max(0, ...(pedidosAntes.json?.data ?? []).map((p) => p.numeroPedido));

// Volvemos a dejar 1 unidad en el carrito: el pedido debe vaciarlo
await peticion('PUT', '/api/carrito', {
  token: tokenUser, cuerpo: { items: [{ varianteId: variantePedido.id, cantidad: 1 }] },
});

const cantidad = 2;
const subtotalEsperado = variantePedido.precio * cantidad;
const totalEsperado = (subtotalEsperado + 10) * 1.15; // envío 10 + IVA 15% (parámetros)
const pedido = await peticion('POST', '/api/pedidos', {
  token: tokenUser,
  cuerpo: {
    items: [{ varianteId: variantePedido.id, cantidad }],
    direccionId: idDireccion,
    metodoPago: 'tarjeta',
    notas: 'Pedido del smoke test',
    facturacion: {
      tipoIdentificacion: 'cedula',
      identificacion: '1701345678',
      razonSocial: 'Cliente De Prueba',
    },
  },
});
const pd = pedido.json?.data ?? {};
const casiIgual = (a, b) => Math.abs(a - b) < 0.01;
reportar('21a. Confirmar pedido → 201 con correlativo',
  pedido.status === 201 && pd.id > 0 && pd.numeroPedido > maxPrevio,
  `pedido #${pd.numeroPedido} (previo máx: ${maxPrevio})`);
reportar('21b. Items con snapshot (sku, nombre, precio del servidor)',
  pd.items?.length === 1 && pd.items[0].sku === variantePedido.sku
  && pd.items[0].precioUnitario === variantePedido.precio && pd.items[0].cantidad === cantidad,
  `${pd.items?.[0]?.sku} x${pd.items?.[0]?.cantidad} = $${pd.items?.[0]?.subtotal}`);
reportar('21c. Totales del servidor (subtotal + envío 10 + IVA 15%)',
  casiIgual(pd.subtotal, subtotalEsperado) && casiIgual(pd.costoEnvio, 10)
  && casiIgual(pd.ivaValor, (subtotalEsperado + 10) * 0.15) && casiIgual(pd.total, totalEsperado),
  `subtotal $${pd.subtotal} + envío $${pd.costoEnvio} + IVA $${pd.ivaValor} = $${pd.total}`);
reportar('21d. Factura numerada 001-001-X con clave de acceso de 49 dígitos',
  /^001-001-\d{9}$/.test(pd.factura?.numero ?? '') && /^\d{49}$/.test(pd.factura?.claveAcceso ?? ''),
  `${pd.factura?.numero}, clave: ${pd.factura?.claveAcceso?.slice(0, 12)}…`);
reportar('21e. Pago con tarjeta aprobado (pasarela simulada) → pedido pagado',
  pd.estado === 'pagado' && pd.pago?.estado === 'aprobado' && pd.pago?.metodo === 'tarjeta');
reportar('21f. Envío con snapshot de la dirección',
  pd.envio?.estado === 'pendiente' && pd.envio?.direccion?.destinatario === 'Cliente De Prueba'
  && pd.envio?.direccion?.ciudad === 'Quito');
const idPedido = pd.id;

const misPedidos = await peticion('GET', '/api/pedidos/mis-pedidos', { token: tokenUser });
reportar('22. GET mis-pedidos contiene el pedido con items y factura',
  misPedidos.status === 200
  && misPedidos.json?.data?.some((p) => p.id === idPedido && p.items?.length === 1 && p.factura?.numero));

const despues = await peticion('GET', `/api/productos/${productoPedido.id}`);
const varianteDespues = despues.json?.data?.variantes?.find((v) => v.id === variantePedido.id);
reportar('23. Stock descontado en BD',
  varianteDespues?.stock === variantePedido.stock - cantidad,
  `variante ${variantePedido.sku}: ${variantePedido.stock} → ${varianteDespues?.stock}`);

const carritoTrasPedido = await peticion('GET', '/api/carrito', { token: tokenUser });
reportar('24. Carrito del servidor vaciado tras el pedido',
  carritoTrasPedido.status === 200 && carritoTrasPedido.json?.data?.cantidadItems === 0);

// ---------- 25-31. Permisos, IDOR y reglas de negocio ----------
const todosAdmin = await peticion('GET', '/api/pedidos', { token: tokenAdmin });
reportar('25. Admin GET /api/pedidos → ve el pedido del user',
  todosAdmin.status === 200 && todosAdmin.json?.data?.some((p) => p.id === idPedido));
const todosUser = await peticion('GET', '/api/pedidos', { token: tokenUser });
reportar('26. User GET /api/pedidos → 403', todosUser.status === 403);

const userCambiaEstado = await peticion('PATCH', `/api/pedidos/${idPedido}/estado`, {
  token: tokenUser, cuerpo: { estado: 'preparando' },
});
reportar('26b. User cambia el estado de SU pedido → 403 (solo la tienda)',
  userCambiaEstado.status === 403 && userCambiaEstado.json?.error?.codigo === 'PROHIBIDO');

const propio = await peticion('GET', `/api/pedidos/${idPedido}`, { token: tokenUser });
reportar('27. User ve SU pedido por id → 200', propio.status === 200 && propio.json?.data?.id === idPedido);

const ajeno = await peticion('GET', `/api/pedidos/${idPedido}`, { token: tokenUser2 });
reportar('28. IDOR: otro usuario ve el pedido ajeno → 403 PROHIBIDO',
  ajeno.status === 403 && ajeno.json?.error?.codigo === 'PROHIBIDO');

const dirAjena = await peticion('POST', '/api/pedidos', {
  token: tokenUser2,
  cuerpo: { items: [{ varianteId: variantePedido.id, cantidad: 1 }], direccionId: idDireccion },
});
reportar('29. IDOR: user2 usa dirección de user1 → 403',
  dirAjena.status === 403 && dirAjena.json?.error?.codigo === 'PROHIBIDO');

const insuficiente = await peticion('POST', '/api/pedidos', {
  token: tokenUser,
  cuerpo: { items: [{ varianteId: idVariantePrueba, cantidad: 2 }] }, // el producto smoke tiene stock 1
});
reportar('30. Stock insuficiente → 409 REGLA_NEGOCIO',
  insuficiente.status === 409 && insuficiente.json?.error?.codigo === 'REGLA_NEGOCIO',
  insuficiente.json?.error?.mensaje?.slice(0, 70));

const itemsVacios = await peticion('POST', '/api/pedidos', { token: tokenUser, cuerpo: { items: [] } });
reportar('31. Pedido sin items → 422', itemsVacios.status === 422);

// ---------- 32-34. Ciclo de vida admin del pedido ----------
const preparando = await peticion('PATCH', `/api/pedidos/${idPedido}/estado`, {
  token: tokenAdmin, cuerpo: { estado: 'preparando', comentario: 'Smoke: en preparación' },
});
reportar('32. Admin cambia estado a preparando (+ historial)',
  preparando.status === 200 && preparando.json?.data?.estado === 'preparando'
  && preparando.json.data.historial?.length >= 2);

const despachar = await peticion('PATCH', `/api/pedidos/${idPedido}/envio`, {
  token: tokenAdmin,
  cuerpo: { estado: 'en_transito', transportista: 'SmokeExpress', numeroGuia: 'SE-1001' },
});
reportar('33. Admin despacha envío → pedido enviado con guía',
  despachar.status === 200 && despachar.json?.data?.estado === 'enviado'
  && despachar.json?.data?.envio?.numeroGuia === 'SE-1001'
  && despachar.json?.data?.envio?.estado === 'en_transito');

const entregado = await peticion('PATCH', `/api/pedidos/${idPedido}/estado`, {
  token: tokenAdmin, cuerpo: { estado: 'entregado' },
});
reportar('34. Admin marca entregado → historial completo',
  entregado.status === 200 && entregado.json?.data?.estado === 'entregado'
  && entregado.json.data.historial?.length >= 4,
  `${entregado.json?.data?.historial?.length} entradas de historial`);

// ---------- 35-37. Pago por transferencia + cancelación con reposición ----------
const pedido2 = await peticion('POST', '/api/pedidos', {
  token: tokenUser,
  cuerpo: { items: [{ varianteId: idVariantePrueba, cantidad: 1 }], metodoPago: 'transferencia' },
});
reportar('35. Pedido con transferencia → pendiente (sin pago)',
  pedido2.status === 201 && pedido2.json?.data?.estado === 'pendiente'
  && pedido2.json?.data?.pago?.estado === 'pendiente');
const idPedido2 = pedido2.json?.data?.id;

const sec1 = Number(pd.factura.numero.split('-')[2]);
const sec2 = Number(pedido2.json?.data?.factura?.numero?.split('-')[2]);
reportar('35b. Dos facturas seguidas → secuencial consecutivo y sin repetir',
  pedido2.json?.data?.factura?.numero !== pd.factura.numero && sec2 === sec1 + 1,
  `${pd.factura.numero} → ${pedido2.json?.data?.factura?.numero}`);

const confirmar = await peticion('PATCH', `/api/pedidos/${idPedido2}/pago`, { token: tokenAdmin });
reportar('36. Admin confirma pago → pedido pagado',
  confirmar.status === 200 && confirmar.json?.data?.estado === 'pagado'
  && confirmar.json?.data?.pago?.estado === 'aprobado');

const stockAntesDeCancelar = (await peticion('GET', `/api/productos/${idProductoPrueba}`))
  .json?.data?.variantes?.[0]?.stock;
const cancelar = await peticion('PATCH', `/api/pedidos/${idPedido2}/estado`, {
  token: tokenUser, cuerpo: { estado: 'cancelado' },
});
const stockTrasCancelar = (await peticion('GET', `/api/productos/${idProductoPrueba}`))
  .json?.data?.variantes?.[0]?.stock;
reportar('37. User cancela su pedido → stock repuesto y pago reembolsado',
  cancelar.status === 200 && cancelar.json?.data?.estado === 'cancelado'
  && stockTrasCancelar === stockAntesDeCancelar + 1
  && cancelar.json?.data?.pago?.estado === 'reembolsado',
  `stock ${stockAntesDeCancelar} → ${stockTrasCancelar}`);

// ---------- 37b-37c. Concurrencia sobre la última unidad + cancelación admin ----------
const dosALaVez = await Promise.all([
  peticion('POST', '/api/pedidos', {
    token: tokenUser, cuerpo: { items: [{ varianteId: idVariantePrueba, cantidad: 1 }] },
  }),
  peticion('POST', '/api/pedidos', {
    token: tokenUser, cuerpo: { items: [{ varianteId: idVariantePrueba, cantidad: 1 }] },
  }),
]);
const exitosos = dosALaVez.filter((r) => r.status === 201);
const rechazados = dosALaVez.filter((r) => r.status === 409);
reportar('37b. Dos pedidos SIMULTÁNEOS sobre la última unidad → pasa exactamente uno',
  exitosos.length === 1 && rechazados.length === 1
  && rechazados[0].json?.error?.codigo === 'REGLA_NEGOCIO',
  `uno 201, otro ${rechazados[0]?.status} (${rechazados[0]?.json?.error?.codigo})`);
const idPedidoConcurrido = exitosos[0]?.json?.data?.id;

const stockAntesAdmin = (await peticion('GET', `/api/productos/${idProductoPrueba}`))
  .json?.data?.variantes?.[0]?.stock;
const adminCancela = await peticion('PATCH', `/api/pedidos/${idPedidoConcurrido}/estado`, {
  token: tokenAdmin, cuerpo: { estado: 'cancelado', comentario: 'Smoke: cancelación por admin' },
});
const stockDespuesAdmin = (await peticion('GET', `/api/productos/${idProductoPrueba}`))
  .json?.data?.variantes?.[0]?.stock;
reportar('37c. Admin cancela un pedido → stock repuesto',
  adminCancela.status === 200 && adminCancela.json?.data?.estado === 'cancelado'
  && stockDespuesAdmin === stockAntesAdmin + 1,
  `stock ${stockAntesAdmin} → ${stockDespuesAdmin}`);

// ---------- 38-40. Favoritos ----------
const fav = await peticion('POST', '/api/favoritos', {
  token: tokenUser, cuerpo: { productoId: productoPedido.id },
});
reportar('38. User agrega favorito → 201', fav.status === 201);
const favs = await peticion('GET', '/api/favoritos', { token: tokenUser });
reportar('39. GET /api/favoritos → contiene el producto con variantes',
  favs.status === 200 && favs.json?.data?.some((p) => p.id === productoPedido.id
    && Array.isArray(p.variantes)));
const quitarFav = await peticion('DELETE', `/api/favoritos/${productoPedido.id}`, { token: tokenUser });
reportar('40. DELETE /api/favoritos/:productoId → 200',
  quitarFav.status === 200 && quitarFav.json?.data?.eliminados >= 1);

// ---------- 41-44. Contacto ----------
const contacto = await peticion('POST', '/api/contacto', {
  cuerpo: {
    nombre: 'Visitante Smoke',
    email: 'visitante.smoke@correo.com',
    telefono: '0991234567',
    mensaje: 'Hola, quisiera saber si hacen envíos a Cuenca. Gracias.',
    canalPreferido: 'email',
  },
});
reportar('41. POST /api/contacto público (sin sesión) → 201',
  contacto.status === 201 && contacto.json?.data?.leido === false);
const idMensaje = contacto.json?.data?.id;

const bandejaUser = await peticion('GET', '/api/contacto', { token: tokenUser });
reportar('42. User en bandeja de contacto → 403', bandejaUser.status === 403);

const bandeja = await peticion('GET', '/api/contacto', { token: tokenAdmin });
reportar('43. Admin ve la bandeja de mensajes',
  bandeja.status === 200 && bandeja.json?.data?.some((m) => m.id === idMensaje));

const leido = await peticion('PATCH', `/api/contacto/${idMensaje}/leido`, { token: tokenAdmin });
reportar('44. Admin marca el mensaje como leído',
  leido.status === 200 && leido.json?.data?.leido === true);

// ---------- 45-55. Módulo de compras (proveedores + reposición de stock) ----------
const ruc = `17${String(Date.now()).slice(-9)}01`;
const proveedor = await peticion('POST', '/api/proveedores', {
  token: tokenAdmin,
  cuerpo: {
    nombre: 'Importadora Smoke S.A.',
    ruc,
    email: 'ventas@importadora-smoke.com',
    telefono: '022345678',
    direccion: 'Av. Quito 1234, Quito',
    contacto: 'Sra. Ana Vende',
  },
});
reportar('45. Admin crea proveedor → 201',
  proveedor.status === 201 && proveedor.json?.data?.id > 0 && proveedor.json?.data?.activo === true);
const idProveedor = proveedor.json?.data?.id;

const rucDuplicado = await peticion('POST', '/api/proveedores', {
  token: tokenAdmin,
  cuerpo: { nombre: 'Proveedor Duplicado', ruc },
});
reportar('46. RUC duplicado → 409', rucDuplicado.status === 409);

const editarProv = await peticion('PUT', `/api/proveedores/${idProveedor}`, {
  token: tokenAdmin, cuerpo: { contacto: 'Sr. Juan Vende' },
});
reportar('47. Admin edita proveedor → 200',
  editarProv.status === 200 && editarProv.json?.data?.contacto === 'Sr. Juan Vende');

const proveedoresUser = await peticion('GET', '/api/proveedores', { token: tokenUser });
reportar('48. User en /api/proveedores → 403', proveedoresUser.status === 403);

const compra = await peticion('POST', '/api/compras', {
  token: tokenAdmin,
  cuerpo: {
    proveedorId: idProveedor,
    items: [{ varianteId: variantePedido.id, cantidad: 3, costoUnitario: 5 }],
    numeroFacturaProveedor: 'FAC-SMOKE-001',
    notas: 'Reposición del smoke test',
  },
});
reportar('49. Admin crea compra → 201 en borrador con totales del servidor',
  compra.status === 201 && compra.json?.data?.estado === 'borrador'
  && casiIgual(compra.json.data.subtotal, 15) && casiIgual(compra.json.data.ivaValor, 2.25)
  && casiIgual(compra.json.data.total, 17.25)
  && compra.json.data.items[0].sku === variantePedido.sku,
  `compra #${compra.json?.data?.numeroCompra}: $15 + IVA $2.25 = $${compra.json?.data?.total}`);
const idCompra = compra.json?.data?.id;

const editarCompra = await peticion('PUT', `/api/compras/${idCompra}`, {
  token: tokenAdmin,
  cuerpo: { items: [{ varianteId: variantePedido.id, cantidad: 4, costoUnitario: 5 }] },
});
reportar('50. Admin edita la compra en borrador → recalcula totales',
  editarCompra.status === 200 && casiIgual(editarCompra.json?.data?.total, 23)
  && editarCompra.json?.data?.items?.[0]?.cantidad === 4);

const ordenar = await peticion('PATCH', `/api/compras/${idCompra}/estado`, {
  token: tokenAdmin, cuerpo: { estado: 'ordenada' },
});
reportar('51. Compra borrador → ordenada', ordenar.status === 200 && ordenar.json?.data?.estado === 'ordenada');

const stockAntesCompra = varianteDespues ? varianteDespues.stock - cantidad : null; // tras el pedido 21
const stockRealAntes = (await peticion('GET', `/api/productos/${productoPedido.id}`))
  .json?.data?.variantes?.find((v) => v.id === variantePedido.id)?.stock;
const recibir = await peticion('PATCH', `/api/compras/${idCompra}/estado`, {
  token: tokenAdmin, cuerpo: { estado: 'recibida' },
});
const stockRealDespues = (await peticion('GET', `/api/productos/${productoPedido.id}`))
  .json?.data?.variantes?.find((v) => v.id === variantePedido.id)?.stock;
reportar('52. Recepción de la compra → stock +4 en BD y fecha de recepción',
  recibir.status === 200 && recibir.json?.data?.estado === 'recibida'
  && recibir.json?.data?.fechaRecepcion
  && stockRealDespues === stockRealAntes + 4,
  `variante ${variantePedido.sku}: ${stockRealAntes} → ${stockRealDespues}`);

const recibirOtraVez = await peticion('PATCH', `/api/compras/${idCompra}/estado`, {
  token: tokenAdmin, cuerpo: { estado: 'recibida' },
});
reportar('53. Segunda recepción → 409 (suma de stock EXACTAMENTE UNA vez)',
  recibirOtraVez.status === 409 && recibirOtraVez.json?.error?.codigo === 'REGLA_NEGOCIO',
  recibirOtraVez.json?.error?.mensaje?.slice(0, 60));

const editarRecibida = await peticion('PUT', `/api/compras/${idCompra}`, {
  token: tokenAdmin,
  cuerpo: { items: [{ varianteId: variantePedido.id, cantidad: 1, costoUnitario: 5 }] },
});
reportar('53b. Editar una compra recibida → 409 (solo se edita en borrador)',
  editarRecibida.status === 409 && editarRecibida.json?.error?.codigo === 'REGLA_NEGOCIO');

const compraCancelada = await peticion('POST', '/api/compras', {
  token: tokenAdmin,
  cuerpo: { proveedorId: idProveedor, items: [{ varianteId: variantePedido.id, cantidad: 1, costoUnitario: 5 }] },
});
const idCompraCancelada = compraCancelada.json?.data?.id;
await peticion('PATCH', `/api/compras/${idCompraCancelada}/estado`, {
  token: tokenAdmin, cuerpo: { estado: 'cancelada' },
});
const recibirCancelada = await peticion('PATCH', `/api/compras/${idCompraCancelada}/estado`, {
  token: tokenAdmin, cuerpo: { estado: 'recibida' },
});
reportar('53c. Recibir una compra CANCELADA → 409 (nunca suma stock)',
  compraCancelada.status === 201 && recibirCancelada.status === 409
  && recibirCancelada.json?.error?.codigo === 'REGLA_NEGOCIO');

const movs = await peticion('GET', `/api/inventario/movimientos?tipo=compra&varianteId=${variantePedido.id}`, {
  token: tokenAdmin,
});
reportar('54. Movimientos de inventario registran la compra (kardex)',
  movs.status === 200 && movs.json?.data?.some((m) => m.referenciaTipo === 'compra'
    && m.referenciaId === String(idCompra) && m.cantidad === 4));

const bajo = await peticion('GET', '/api/inventario/stock-bajo', { token: tokenAdmin });
reportar('55. GET /api/inventario/stock-bajo → variantes a reponer',
  bajo.status === 200 && Array.isArray(bajo.json?.data)
  && bajo.json.data.every((v) => v.stock <= v.stockMinimo && v.sugerido > 0),
  `${bajo.json?.data?.length} variantes en stock mínimo`);

// ---------- 56-60. Auditoría, parámetros y resumen ----------
const aud = await peticion('GET', '/api/admin/auditoria?tabla=productos&accion=INSERT', { token: tokenAdmin });
reportar('56. Auditoría registra el alta del producto smoke con usuario',
  aud.status === 200 && aud.json?.data?.filas?.some((f) => f.registroId === String(idProductoPrueba)
    && f.usuario?.id === loginAdmin.json.data.usuario.id),
  `${aud.json?.data?.total} filas de auditoría (productos INSERT)`);

const params = await peticion('GET', '/api/admin/parametros', { token: tokenAdmin });
reportar('57. GET /api/admin/parametros → IVA 15% y punto 001-001',
  params.status === 200
  && params.json?.data?.find((p) => p.clave === 'iva_porcentaje')?.valor === '15'
  && params.json?.data?.find((p) => p.clave === 'punto_emision_default')?.valor === '001');

const actualizarParam = await peticion('PUT', '/api/admin/parametros/costo_envio_default', {
  token: tokenAdmin, cuerpo: { valor: '10', descripcion: 'Costo de envío estándar (USD).' },
});
reportar('58. PUT /api/admin/parametros/:clave → 200',
  actualizarParam.status === 200 && actualizarParam.json?.data?.valor === '10');

const resumen = await peticion('GET', '/api/admin/resumen', { token: tokenAdmin });
const tablas = resumen.json?.data?.tablas;
reportar('59. Resumen del negocio → conteos de las 22 tablas del ER',
  resumen.status === 200 && typeof tablas?.pedidos === 'number'
  && tablas.pedidos >= 2 && tablas.compras >= 1 && tablas.proveedores >= 1
  && tablas.auditorias >= 1 && typeof tablas.facturas === 'number' && tablas.facturas >= 2
  && resumen.json.data.ventasTotales > 0,
  `pedidos: ${tablas?.pedidos}, compras: ${tablas?.compras}, ventas: $${resumen.json?.data?.ventasTotales?.toFixed(2)}`);

const usuariosAdmin = await peticion('GET', '/api/admin/usuarios', { token: tokenAdmin });
reportar('60. /api/admin/usuarios sin passwordHash',
  usuariosAdmin.status === 200
  && usuariosAdmin.json.data.every((u) => !('passwordHash' in u) && !('password' in u)),
  `usuarios: ${usuariosAdmin.json?.data?.length}`);

// ---------- 61. Errores consistentes ----------
const ruta404 = await peticion('GET', '/api/no-existe');
reportar('61. Ruta inexistente → 404 con forma de error consistente',
  ruta404.status === 404 && ruta404.json?.ok === false
  && ruta404.json?.error?.codigo === 'NO_ENCONTRADO' && !ruta404.json?.error?.stack);

// ---------- Limpieza ----------
const borrado = await peticion('DELETE', `/api/productos/${idProductoPrueba}`, { token: tokenAdmin });
reportar('62. Limpieza: DELETE del producto smoke → borrado LÓGICO (tiene ventas)',
  borrado.status === 200 && borrado.json?.data?.logico === true,
  `logico: ${borrado.json?.data?.logico} (el historial de pedido_items conserva la referencia)`);

// ---------- 63-64. Flag ?inactivos=true (extensión del panel admin, FASE 8) ----------
const listaPublica = await peticion('GET', '/api/productos');
const listaAdmin = await peticion('GET', '/api/productos?inactivos=true', { token: tokenAdmin });
reportar('63. ?inactivos=true con token admin incluye los productos inactivos',
  listaAdmin.status === 200
    && listaAdmin.json.data.length > listaPublica.json.data.length
    && listaAdmin.json.data.some((p) => p.id === idProductoPrueba && p.activo === false)
    && !listaPublica.json.data.some((p) => p.id === idProductoPrueba),
  `públicos: ${listaPublica.json.data.length}, con inactivos: ${listaAdmin.json.data.length}`);

const listaAnonima = await peticion('GET', '/api/productos?inactivos=true');
reportar('64. ?inactivos=true ANÓNIMO se ignora (la lista pública es de activos)',
  listaAnonima.status === 200
    && listaAnonima.json.data.length === listaPublica.json.data.length
    && !listaAnonima.json.data.some((p) => p.activo === false),
  `${listaAnonima.json.data.length} productos activos`);

// ---------- 65-70. Recuperación de contraseña (P2, FASE 10) ----------
// Se usa un usuario smoke nuevo para no alterar la contraseña del seed.
const emailReset = `reset-${Date.now()}@carresol.com`;
const registroReset = await peticion('POST', '/api/auth/register', {
  cuerpo: { nombre: 'Usuario Reset', email: emailReset, password: 'ClaveVieja123' },
});

const olvidada = await peticion('POST', '/api/auth/forgot-password', { cuerpo: { email: emailReset } });
const tokenEsValido = /^[0-9a-f]{64}$/.test(olvidada.json?.data?.token || '');
reportar('65. POST /api/auth/forgot-password → 200 con mensaje genérico + token (solo desarrollo)',
  registroReset.status === 201 && olvidada.status === 200
    && typeof olvidada.json?.data?.mensaje === 'string' && tokenEsValido,
  'token de 64 hex recibido (NO se imprime)');
const tokenReset = olvidada.json?.data?.token;

const olvidadaAjena = await peticion('POST', '/api/auth/forgot-password', {
  cuerpo: { email: `no-existe-${Date.now()}@carresol.com` },
});
reportar('66. Correo NO registrado → 200 con el MISMO mensaje (anti enumeración)',
  olvidadaAjena.status === 200 && olvidadaAjena.json?.data?.mensaje === olvidada.json?.data?.mensaje
    && !('token' in (olvidadaAjena.json?.data || {})),
  'sin datos del usuario en la respuesta');

const resetInvalido = await peticion('POST', '/api/auth/reset-password', {
  cuerpo: { token: '0'.repeat(64), password: 'ClaveNueva456' },
});
reportar('67. reset-password con token inventado → 401 genérico',
  resetInvalido.status === 401 && resetInvalido.json?.error?.codigo === 'NO_AUTORIZADO');

const resetValido = await peticion('POST', '/api/auth/reset-password', {
  cuerpo: { token: tokenReset, password: 'ClaveNueva456' },
});
const loginNueva = await peticion('POST', '/api/auth/login', {
  cuerpo: { email: emailReset, password: 'ClaveNueva456' },
});
reportar('68. reset-password con token válido → 200 y la nueva contraseña funciona',
  resetValido.status === 200 && loginNueva.status === 200 && loginNueva.json?.ok,
  'contraseña restablecida y login correcto');

const resetReutilizado = await peticion('POST', '/api/auth/reset-password', {
  cuerpo: { token: tokenReset, password: 'ClaveOtra789' },
});
reportar('69. El token es de UN SOLO USO: reutilizarlo → 401',
  resetReutilizado.status === 401);

const loginVieja = await peticion('POST', '/api/auth/login', {
  cuerpo: { email: emailReset, password: 'ClaveVieja123' },
});
reportar('70. La contraseña ANTERIOR ya no sirve → 401',
  loginVieja.status === 401 && loginVieja.json?.error?.codigo === 'NO_AUTORIZADO');

// ---------- Resultado final ----------
imprimir('');
imprimir('=========================================');
imprimir(`RESULTADO: ${pasadas} PASS / ${fallidas} FAIL`);
imprimir('=========================================');

try {
  mkdirSync(dirname(rutaEvidencia), { recursive: true });
  writeFileSync(rutaEvidencia, `${salida.join('\n')}\n`, 'utf8');
  console.log(`\nEvidencia guardada en: ${rutaEvidencia} (UTF-8)`);
} catch (e) {
  console.error(`No se pudo guardar la evidencia: ${e.message}`);
}
process.exit(fallidas > 0 ? 1 : 0);
