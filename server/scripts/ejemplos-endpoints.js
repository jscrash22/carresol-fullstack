// ejemplos-endpoints.js — genera docs/evidencias/ejemplos-endpoints.md con
// requests/responses REALES contra el servidor y la BD reales (§9 del prompt).
//
// REGLA DE SEGURIDAD: los tokens JWT y las contraseñas se ENMASCARAN antes de
// escribir el archivo; nunca quedan secretos reales en la evidencia.
// Uso: levanta el backend (npm start) y luego:  node scripts/ejemplos-endpoints.js
import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_USER_PASSWORD === undefined ? undefined : process.env.SEED_ADMIN_PASSWORD;
const USER_EMAIL = process.env.SEED_USER_EMAIL;
const USER_PASSWORD = process.env.SEED_USER_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !USER_EMAIL || !USER_PASSWORD) {
  console.error('Faltan credenciales de seed en server/.env');
  process.exit(1);
}

// ---------- Enmascarado y recorte ----------
const enmascarar = (texto) => String(texto)
  .replaceAll(USER_PASSWORD, '<CONTRASEÑA_REAL_EN_.ENV>')
  .replaceAll(ADMIN_PASSWORD, '<CONTRASEÑA_REAL_EN_.ENV>');

// Recorta arreglos largos para que el ejemplo sea legible (indica el total real)
function resumir(valor, maxItems = 2, profundidad = 0) {
  if (Array.isArray(valor)) {
    const cabeza = valor.slice(0, maxItems).map((v) => resumir(v, maxItems, profundidad + 1));
    if (valor.length > maxItems) cabeza.push(`… (${valor.length} elementos en total)`);
    return cabeza;
  }
  if (valor && typeof valor === 'object') {
    const salida = {};
    for (const [k, v] of Object.entries(valor)) salida[k] = resumir(v, maxItems, profundidad + 1);
    return salida;
  }
  return valor;
}

const lineas = [];
function ejemplo(titulo, metodo, ruta, cabeceras, cuerpo, respuesta) {
  lineas.push(`## ${titulo}\n`);
  lineas.push('```http');
  lineas.push(`${metodo} ${ruta}`);
  if (cabeceras?.token) lineas.push('Authorization: Bearer <JWT_OMITIDO>');
  lineas.push('Content-Type: application/json');
  if (cuerpo) lineas.push('', enmascarar(JSON.stringify(cuerpo, null, 2)));
  lineas.push('```', '');
  lineas.push('```json');
  lineas.push(enmascarar(JSON.stringify(resumir(respuesta), null, 2)));
  lineas.push('```', '');
}

async function llamar(metodo, ruta, { token, cuerpo } = {}) {
  const res = await fetch(BASE + ruta, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

// ---------- Flujo real ----------
const loginAdmin = await llamar('POST', '/api/auth/login', {
  cuerpo: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
});
const tokenAdmin = loginAdmin.json?.data?.token;
ejemplo('Login de administrador (token enmascarado)', 'POST', '/api/auth/login', {},
  { email: ADMIN_EMAIL, password: '<CONTRASEÑA_REAL_EN_.ENV>' },
  { status: loginAdmin.status, ...loginAdmin.json, data: { ...loginAdmin.json.data, token: '<JWT_OMITIDO>' } });

const loginUser = await llamar('POST', '/api/auth/login', {
  cuerpo: { email: USER_EMAIL, password: USER_PASSWORD },
});
const tokenUser = loginUser.json?.data?.token;
ejemplo('Login de cliente (token enmascarado)', 'POST', '/api/auth/login', {},
  { email: USER_EMAIL, password: '<CONTRASEÑA_REAL_EN_.ENV>' },
  { status: loginUser.status, ...loginUser.json, data: { ...loginUser.json.data, token: '<JWT_OMITIDO>' } });

const catalogo = await llamar('GET', '/api/productos?categoria=anillos');
ejemplo('Catálogo público filtrado por categoría', 'GET', '/api/productos?categoria=anillos', {}, null,
  { status: catalogo.status, ...catalogo.json });

const detalle = await llamar('GET', '/api/productos/3');
ejemplo('Detalle de producto con variantes, materiales e imágenes', 'GET', '/api/productos/3', {}, null,
  { status: detalle.status, ...detalle.json });

const direccion = await llamar('POST', '/api/direcciones', {
  token: tokenUser,
  cuerpo: {
    alias: 'Casa Ejemplo',
    destinatario: 'Cliente De Prueba',
    telefono: '0991234567',
    provincia: 'Pichincha',
    ciudad: 'Quito',
    callePrincipal: 'Av. América',
    numeracion: 'N12-34',
    esPredeterminada: true,
  },
});
const idDireccion = direccion.json?.data?.id;
ejemplo('Crear dirección de envío (autenticado)', 'POST', '/api/direcciones', { token: tokenUser },
  direccion.json && { alias: 'Casa Ejemplo', destinatario: 'Cliente De Prueba', telefono: '0991234567',
    provincia: 'Pichincha', ciudad: 'Quito', callePrincipal: 'Av. América', numeracion: 'N12-34',
    esPredeterminada: true },
  { status: direccion.status, ...direccion.json });

// Producto con stock suficiente para el ejemplo de pedido
const lista = await llamar('GET', '/api/productos');
const productoEjemplo = (lista.json?.data ?? []).find((p) => p.stock >= 3 && p.variantes?.[0]?.stock >= 3);
const varianteEjemplo = productoEjemplo?.variantes?.[0];

const pedido = await llamar('POST', '/api/pedidos', {
  token: tokenUser,
  cuerpo: {
    items: [{ varianteId: varianteEjemplo?.id, cantidad: 1 }],
    direccionId: idDireccion,
    metodoPago: 'tarjeta',
    facturacion: { tipoIdentificacion: 'consumidor_final' },
  },
});
const idPedido = pedido.json?.data?.id;
ejemplo('Confirmar pedido (transacción completa: items + pago + envío + factura + historial)',
  'POST', '/api/pedidos', { token: tokenUser },
  { items: [{ varianteId: varianteEjemplo?.id, cantidad: 1 }], direccionId: idDireccion,
    metodoPago: 'tarjeta', facturacion: { tipoIdentificacion: 'consumidor_final' } },
  { status: pedido.status, ...pedido.json });

const misPedidos = await llamar('GET', '/api/pedidos/mis-pedidos', { token: tokenUser });
ejemplo('Mis pedidos (autenticado)', 'GET', '/api/pedidos/mis-pedidos', { token: tokenUser }, null,
  { status: misPedidos.status, ...misPedidos.json });

const cambioEstado = await llamar('PATCH', `/api/pedidos/${idPedido}/estado`, {
  token: tokenAdmin, cuerpo: { estado: 'preparando', comentario: 'Ejemplo de la evidencia' },
});
ejemplo('Admin cambia el estado del pedido (crea fila de historial)',
  'PATCH', `/api/pedidos/${idPedido}/estado`, { token: tokenAdmin },
  { estado: 'preparando', comentario: 'Ejemplo de la evidencia' },
  { status: cambioEstado.status, ...cambioEstado.json });

const ruc = `17${String(Date.now()).slice(-9)}02`;
const proveedor = await llamar('POST', '/api/proveedores', {
  token: tokenAdmin,
  cuerpo: { nombre: 'Distribuidora Ejemplo S.A.', ruc, email: 'ventas@dist-ejemplo.com', telefono: '022334455' },
});
const idProveedor = proveedor.json?.data?.id;
ejemplo('Admin crea proveedor (módulo de compras)', 'POST', '/api/proveedores', { token: tokenAdmin },
  { nombre: 'Distribuidora Ejemplo S.A.', ruc, email: 'ventas@dist-ejemplo.com', telefono: '022334455' },
  { status: proveedor.status, ...proveedor.json });

const compra = await llamar('POST', '/api/compras', {
  token: tokenAdmin,
  cuerpo: { proveedorId: idProveedor, items: [{ varianteId: varianteEjemplo?.id, cantidad: 2, costoUnitario: 4.5 }] },
});
const idCompra = compra.json?.data?.id;
await llamar('PATCH', `/api/compras/${idCompra}/estado`, { token: tokenAdmin, cuerpo: { estado: 'ordenada' } });
const compraRecibida = await llamar('PATCH', `/api/compras/${idCompra}/estado`, {
  token: tokenAdmin, cuerpo: { estado: 'recibida' },
});
ejemplo('Recepción de compra (suma stock una sola vez + movimientos de inventario)',
  'PATCH', `/api/compras/${idCompra}/estado`, { token: tokenAdmin }, { estado: 'recibida' },
  { status: compraRecibida.status, ...compraRecibida.json });

const bajo = await llamar('GET', '/api/inventario/stock-bajo', { token: tokenAdmin });
ejemplo('Inventario: variantes en stock mínimo', 'GET', '/api/inventario/stock-bajo', { token: tokenAdmin }, null,
  { status: bajo.status, ...bajo.json });

const aud = await llamar('GET', '/api/admin/auditoria?limit=5', { token: tokenAdmin });
ejemplo('Auditoría (últimas 5 filas)', 'GET', '/api/admin/auditoria?limit=5', { token: tokenAdmin }, null,
  { status: aud.status, ...aud.json });

const contacto = await llamar('POST', '/api/contacto', {
  cuerpo: { nombre: 'Visitante Ejemplo', email: 'visitante@correo.com',
    mensaje: 'Mensaje de ejemplo para la evidencia de endpoints.' },
});
ejemplo('Contacto público (sin sesión)', 'POST', '/api/contacto', {},
  { nombre: 'Visitante Ejemplo', email: 'visitante@correo.com',
    mensaje: 'Mensaje de ejemplo para la evidencia de endpoints.' },
  { status: contacto.status, ...contacto.json });

const noHallado = await llamar('GET', '/api/productos/999999999');
ejemplo('Error consistente de recurso inexistente (sin stacktrace)', 'GET', '/api/productos/999999999', {}, null,
  { status: noHallado.status, ...noHallado.json });

// ---------- Escritura del archivo (UTF-8, sin BOM) ----------
const aqui = dirname(fileURLToPath(import.meta.url));
const rutaSalida = join(aqui, '..', '..', 'docs', 'evidencias', 'ejemplos-endpoints.md');
const encabezado = [
  '# Ejemplos reales de request/response (§9)',
  '',
  `Generados automáticamente contra \`${BASE}\` y la base PostgreSQL real el ${new Date().toISOString()}.`,
  '',
  '**Enmascarado por seguridad:** los JWT se sustituyen por `<JWT_OMITIDO>` y las contraseñas por `<CONTRASEÑA_REAL_EN_.ENV>`. Los arreglos largos se recortan indicando el total real.',
  '',
  '---',
  '',
];
try {
  mkdirSync(dirname(rutaSalida), { recursive: true });
  writeFileSync(rutaSalida, `${encabezado.concat(lineas).join('\n')}\n`, 'utf8');
  console.log(`OK: ${rutaSalida}`);
} catch (e) {
  console.error(`No se pudo escribir: ${e.message}`);
  process.exit(1);
}
