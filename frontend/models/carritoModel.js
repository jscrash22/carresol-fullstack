// carritoModel.js — estado del carrito + persistencia (SOLO vía almacenamiento.js)
// El carrito guarda items POR VARIANTE (modelo ER real):
//   { varianteId, productoId, nombre, sku, material, medida, precio, stock, imagen, alt, cantidad }
// IMPORTANTE: al confirmar el pedido el servidor recalcula precios desde la BD;
// aquí el precio solo se usa para mostrar el estimado en el panel.
//
// Política §4.1: el carrito es de INVITADO mientras no hay sesión. Al iniciar
// sesión se fusiona SOLO si el dueño era `invitado`; si era otro usuario se
// descarta y se carga el del servidor. Al cerrar sesión se vacía si el dueño era
// un usuario, para que el carrito de A no acabe en la cuenta de B.
import { MAX_POR_VARIANTE } from '../config.js';
import { local, CLAVES, esClaveCarresol } from './almacenamiento.js';

const VERSION = 2; // versión del formato (dueño + variantes + imágenes múltiples)
const CLAVES_DE_CARRITO = new Set([
  CLAVES.CARRITO, CLAVES.CARRITO_FECHA, CLAVES.CARRITO_DUENO, CLAVES.CARRITO_VERSION,
]);

let carrito = [];
let ultimaActualizacion = null;
let avisos = [];

function persistir() {
  ultimaActualizacion = new Date().toISOString();
  local.set(CLAVES.CARRITO, carrito);
  local.set(CLAVES.CARRITO_FECHA, ultimaActualizacion);
  local.set(CLAVES.CARRITO_VERSION, VERSION);
}

export function urlImagenPrincipal(producto) {
  if (!producto) return null;
  if (producto.imagenes?.length) {
    return (producto.imagenes.find((i) => i.esPrincipal) ?? producto.imagenes[0])?.url ?? null;
  }
  return producto.imagen ?? null;
}

export function altImagenPrincipal(producto) {
  if (!producto) return '';
  if (producto.imagenes?.length) {
    return (producto.imagenes.find((i) => i.esPrincipal) ?? producto.imagenes[0])?.altText ?? '';
  }
  return producto.alt ?? '';
}

export function inicializarCarrito() {
  avisos = [];
  const version = Number(local.get(CLAVES.CARRITO_VERSION, 1));
  const datos = local.json(CLAVES.CARRITO, []);

  if (version !== VERSION) {
    const teniaDatos = Array.isArray(datos) && datos.length > 0;
    carrito = [];
    persistir();
    if (teniaDatos) avisos.push('Se descartó un carrito guardado con un formato antiguo. Vuelve a agregar tus productos.');
  } else {
    carrito = Array.isArray(datos) ? datos.filter((i) => i && i.varianteId) : [];
    ultimaActualizacion = local.get(CLAVES.CARRITO_FECHA, null);
  }

  if (!local.get(CLAVES.CARRITO_DUENO)) local.set(CLAVES.CARRITO_DUENO, 'invitado');
  return [...avisos];
}

export function getAvisosCarrito() {
  return [...avisos];
}

export function getCarrito() {
  return [...carrito];
}

export function getUltimaActualizacion() {
  return ultimaActualizacion;
}

export function getDueno() {
  return local.get(CLAVES.CARRITO_DUENO, 'invitado') || 'invitado';
}

export function setDueno(dueno) {
  local.set(CLAVES.CARRITO_DUENO, dueno || 'invitado');
}

// Cierre de sesión de un usuario: se borra el carrito local (era suyo) y se
// devuelve el estado a invitado. Nunca se toca el carrito del SERVIDOR.
export function vaciarPorCierreDeSesion() {
  carrito = [];
  setDueno('invitado');
  persistir();
}

export function contarUnidades() {
  return carrito.reduce((a, i) => a + Number(i.cantidad || 0), 0);
}

// Tope por variante: el MENOR entre 10 (tope del Reto 1) y el stock de la variante
export function topePorVariante(item) {
  return Math.min(MAX_POR_VARIANTE, Math.max(0, Number(item?.stock ?? MAX_POR_VARIANTE)));
}

export function agregarProducto(variante, { producto, cantidad = 1 } = {}) {
  if (!variante || !(Number(variante.precio) > 0)) {
    return { ok: false, mensaje: 'Variante con precio inválido. Operación rechazada.' };
  }
  const stock = Number(variante.stock ?? 0);
  const nombreProducto = producto?.nombre ?? variante.nombreProducto ?? 'Producto';
  if (stock <= 0) {
    return { ok: false, mensaje: `"${nombreProducto}" (${variante.material ?? ''} ${variante.medida ?? ''}) está agotado.` };
  }
  const existente = carrito.find((i) => Number(i.varianteId) === Number(variante.id));
  const tope = topePorVariante({ stock });
  const nuevaCant = (existente ? existente.cantidad : 0) + Number(cantidad);
  if (nuevaCant > tope) {
    return { ok: false, mensaje: `Máximo ${tope} unidades de esta variante (stock disponible: ${stock}).` };
  }
  if (existente) {
    existente.cantidad = nuevaCant;
    existente.stock = stock; // el stock siempre se refresca al agregar
  } else {
    carrito.push({
      varianteId: Number(variante.id),
      productoId: producto?.id ?? variante.productoId ?? null,
      nombre: nombreProducto,
      sku: variante.sku ?? null,
      material: variante.material ?? null,
      medida: variante.medida ?? null,
      precio: Number(variante.precio),
      stock,
      imagen: urlImagenPrincipal(producto),
      alt: altImagenPrincipal(producto) || nombreProducto,
      cantidad: Number(cantidad),
    });
  }
  persistir();
  return { ok: true };
}

export function cambiarCantidad(varianteId, delta) {
  const item = carrito.find((i) => Number(i.varianteId) === Number(varianteId));
  if (!item) return { ok: false };
  const nueva = Number(item.cantidad) + Number(delta);
  if (nueva <= 0) return eliminarProducto(varianteId);
  const tope = topePorVariante(item);
  if (nueva > tope) {
    return { ok: false, mensaje: `Máximo ${tope} unidades de esta variante (stock disponible: ${item.stock}).` };
  }
  item.cantidad = nueva;
  persistir();
  return { ok: true };
}

export function eliminarProducto(varianteId) {
  carrito = carrito.filter((i) => Number(i.varianteId) !== Number(varianteId));
  persistir();
  return { ok: true };
}

export function vaciarCarrito() {
  carrito = [];
  persistir();
  return { ok: true };
}

export function calcularTotales(iva = 0.15) {
  const subtotal = carrito.reduce((acc, i) => acc + Number(i.precio) * Number(i.cantidad), 0);
  const impuesto = subtotal * Number(iva);
  const total = subtotal + impuesto;
  return {
    subtotal, iva: impuesto, total,
    subtotalFmt: '$' + subtotal.toFixed(2),
    ivaFmt: '$' + impuesto.toFixed(2),
    totalFmt: '$' + total.toFixed(2),
  };
}

// Items listos para el servidor: SOLO ids y cantidades (§7: el backend recalcula)
export function itemsParaServidor() {
  return carrito.map((i) => ({ varianteId: i.varianteId, cantidad: i.cantidad }));
}

// Adopta el carrito devuelto por la API (PUT /api/carrito) tras iniciar sesión.
export function adoptarCarritoServidor(carritoServidor, productosCatalogo = [], dueno = null) {
  const porVariante = new Map();
  for (const p of productosCatalogo) {
    for (const v of p.variantes ?? []) porVariante.set(Number(v.id), { producto: p, variante: v });
  }
  carrito = (carritoServidor?.items ?? []).map((i) => {
    const conocido = porVariante.get(Number(i.varianteId));
    const stock = Number(i.stockDisponible ?? conocido?.variante?.stock ?? 0);
    return {
      varianteId: Number(i.varianteId),
      productoId: conocido?.producto?.id ?? null,
      nombre: i.nombreProducto ?? conocido?.producto?.nombre ?? 'Producto',
      sku: i.sku ?? conocido?.variante?.sku ?? null,
      material: i.material ?? conocido?.variante?.material ?? null,
      medida: i.medida ?? conocido?.variante?.medida ?? null,
      precio: Number(i.precioUnitario ?? conocido?.variante?.precio ?? 0),
      stock,
      imagen: urlImagenPrincipal(conocido?.producto),
      alt: altImagenPrincipal(conocido?.producto) || i.nombreProducto || 'Producto',
      // Nunca adoptar más unidades de las que hay: el servidor lo rechazaría.
      cantidad: Math.max(1, Math.min(Number(i.cantidad) || 1, topePorVariante({ stock }))),
    };
  });
  if (dueno) setDueno(dueno);
  persistir();
  return getCarrito();
}

// Sincroniza el carrito guardado con precios y stock ACTUALES de la API.
export function sincronizarConCatalogo(productosApi) {
  const avisosSync = [];
  const porVariante = new Map();
  const porProducto = new Map();
  for (const p of productosApi) {
    porProducto.set(p.id, p);
    for (const v of p.variantes ?? []) {
      porVariante.set(Number(v.id), { variante: v, producto: p });
    }
  }

  const sincronizado = [];
  for (const item of carrito) {
    const actual = porVariante.get(Number(item.varianteId));
    const producto = actual?.producto ?? porProducto.get(item.productoId);
    if (!actual) {
      avisosSync.push(`"${item.nombre}" (${item.material ?? ''} ${item.medida ?? ''}) ya no está disponible y se quitó de tu carrito.`);
      continue;
    }
    const precio = Number(actual.variante.precio);
    const stock = Number(actual.variante.stock);
    if (precio !== Number(item.precio)) {
      avisosSync.push(`El precio de "${item.nombre}" (${actual.variante.material}) cambió de $${Number(item.precio).toFixed(2)} a $${precio.toFixed(2)}.`);
      item.precio = precio;
    }
    if (stock <= 0) {
      avisosSync.push(`"${item.nombre}" (${actual.variante.material}) está agotado y se quitó de tu carrito.`);
      continue;
    }
    if (Number(item.cantidad) > topePorVariante({ stock })) {
      avisosSync.push(`"${item.nombre}" (${actual.variante.material}) solo tiene ${stock} unidades; ajustamos tu carrito.`);
      item.cantidad = topePorVariante({ stock });
    }
    item.stock = stock;
    item.nombre = producto?.nombre ?? item.nombre;
    item.sku = actual.variante.sku;
    item.material = actual.variante.material;
    item.medida = actual.variante.medida;
    item.imagen = urlImagenPrincipal(producto) ?? item.imagen;
    item.alt = altImagenPrincipal(producto) || item.alt;
    sincronizado.push(item);
  }

  if (JSON.stringify(carrito) !== JSON.stringify(sincronizado)) {
    carrito = sincronizado;
    persistir();
  }
  return { avisos: avisosSync, cambios: avisosSync.length > 0 };
}

// Sincronización entre pestañas: el evento `storage` solo dispara en OTROS tabs.
export function escucharCambiosDeCarrito(callback) {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (e) => {
    if (!esClaveCarresol(e.key) || !CLAVES_DE_CARRITO.has(e.key.replace(/^carresol_/, ''))) return;
    inicializarCarrito();
    callback(getCarrito());
  });
}
