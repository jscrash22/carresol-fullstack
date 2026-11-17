// carritoModel.js — estado del carrito + persistencia en localStorage
// El carrito guarda items POR VARIANTE (modelo ER real):
//   { varianteId, productoId, nombre, sku, material, medida, precio, stock, imagen, alt, cantidad }
// IMPORTANTE: al confirmar el pedido el servidor recalcula precios desde la BD;
// aquí el precio solo se usa para mostrar el estimado en el panel.
import { MAX_POR_VARIANTE } from '../config.js';

const CLAVE = 'carresol_carrito';
const CLAVE_FECHA = 'carresol_carrito_fecha';

let carrito = [];
let ultimaActualizacion = null;

function persistir() {
  ultimaActualizacion = new Date().toISOString();
  try {
    localStorage.setItem(CLAVE, JSON.stringify(carrito));
    localStorage.setItem(CLAVE_FECHA, ultimaActualizacion);
  } catch (e) { console.error('No se pudo guardar el carrito:', e); }
}

export function inicializarCarrito() {
  try {
    carrito = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    if (!Array.isArray(carrito)) carrito = [];
    // Migración suave: items del Reto 1 (sin varianteId) se descartan con aviso
    const sinVariante = carrito.filter((i) => !i.varianteId);
    if (sinVariante.length) {
      carrito = carrito.filter((i) => i.varianteId);
      persistir();
    }
    ultimaActualizacion = localStorage.getItem(CLAVE_FECHA);
  } catch (e) { carrito = []; }
}

export function getCarrito() {
  return [...carrito];
}

export function getUltimaActualizacion() {
  return ultimaActualizacion;
}

export function contarUnidades() {
  return carrito.reduce((a, i) => a + i.cantidad, 0);
}

// Tope por variante: el MENOR entre 10 (tope del Reto 1) y el stock de la variante
export function topePorVariante(item) {
  return Math.min(MAX_POR_VARIANTE, item?.stock ?? MAX_POR_VARIANTE);
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
  const existente = carrito.find((i) => i.varianteId === variante.id);
  const tope = Math.min(MAX_POR_VARIANTE, stock);
  const nuevaCant = (existente ? existente.cantidad : 0) + cantidad;
  if (nuevaCant > tope) {
    return { ok: false, mensaje: `Máximo ${tope} unidades de esta variante (stock disponible: ${stock}).` };
  }
  if (existente) {
    existente.cantidad = nuevaCant;
  } else {
    carrito.push({
      varianteId: variante.id,
      productoId: producto?.id ?? variante.productoId ?? null,
      nombre: nombreProducto,
      sku: variante.sku ?? null,
      material: variante.material ?? null,
      medida: variante.medida ?? null,
      precio: Number(variante.precio),
      stock,
      imagen: producto?.imagen ?? null,
      alt: producto?.alt ?? nombreProducto,
      cantidad,
    });
  }
  persistir();
  return { ok: true };
}

export function cambiarCantidad(varianteId, delta) {
  const item = carrito.find((i) => i.varianteId === varianteId);
  if (!item) return { ok: false };
  const nueva = item.cantidad + delta;
  if (nueva <= 0) return eliminarProducto(varianteId);
  const tope = topePorVariante(item);
  if (nueva > tope) {
    return { ok: false, mensaje: `Máximo ${tope} unidades de esta variante.` };
  }
  item.cantidad = nueva;
  persistir();
  return { ok: true };
}

export function eliminarProducto(varianteId) {
  carrito = carrito.filter((i) => i.varianteId !== varianteId);
  persistir();
  return { ok: true };
}

export function vaciarCarrito() {
  carrito = [];
  persistir();
  return { ok: true };
}

export function calcularTotales(iva = 0.15) {
  const subtotal = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const impuesto = subtotal * iva;
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

// Adopta el carrito devuelto por la API (PUT /api/carrito) tras iniciar sesión,
// completando imagen/alt desde el catálogo si está disponible.
export function adoptarCarritoServidor(carritoServidor, productosCatalogo = []) {
  const porVariante = new Map();
  for (const p of productosCatalogo) {
    for (const v of p.variantes ?? []) porVariante.set(Number(v.id), { producto: p, variante: v });
  }
  carrito = (carritoServidor?.items ?? []).map((i) => {
    const conocido = porVariante.get(Number(i.varianteId));
    return {
      varianteId: Number(i.varianteId),
      productoId: conocido?.producto?.id ?? null,
      nombre: i.nombreProducto ?? conocido?.producto?.nombre ?? 'Producto',
      sku: i.sku ?? conocido?.variante?.sku ?? null,
      material: i.material ?? conocido?.variante?.material ?? null,
      medida: i.medida ?? conocido?.variante?.medida ?? null,
      precio: Number(i.precioUnitario ?? conocido?.variante?.precio ?? 0),
      stock: Number(i.stockDisponible ?? conocido?.variante?.stock ?? 0),
      imagen: conocido?.producto?.imagen ?? null,
      alt: conocido?.producto?.alt ?? i.nombreProducto ?? 'Producto',
      cantidad: i.cantidad,
    };
  });
  persistir();
  return getCarrito();
}

// Sincroniza el carrito guardado con precios y stock ACTUALES de la API
// (ahora por variante: cada variante se revalida individualmente).
// Devuelve { avisos } para que la UI informe si algo cambió.
export function sincronizarConCatalogo(productosApi) {
  const avisos = [];
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
      avisos.push(`"${item.nombre}" (${item.material ?? ''} ${item.medida ?? ''}) ya no está disponible y se quitó de tu carrito.`);
      continue;
    }
    if (actual.variante.precio !== item.precio) {
      avisos.push(`El precio de "${item.nombre}" (${actual.variante.material}) cambió de $${item.precio.toFixed(2)} a $${actual.variante.precio.toFixed(2)}.`);
      item.precio = actual.variante.precio;
    }
    if (actual.variante.stock <= 0) {
      avisos.push(`"${item.nombre}" (${actual.variante.material}) está agotado y se quitó de tu carrito.`);
      continue;
    }
    if (item.cantidad > actual.variante.stock) {
      avisos.push(`"${item.nombre}" (${actual.variante.material}) solo tiene ${actual.variante.stock} unidades; ajustamos tu carrito.`);
      item.cantidad = actual.variante.stock;
    }
    item.stock = actual.variante.stock;
    item.nombre = producto?.nombre ?? item.nombre;
    item.sku = actual.variante.sku;
    item.material = actual.variante.material;
    item.medida = actual.variante.medida;
    item.imagen = producto?.imagen ?? item.imagen;
    item.alt = producto?.alt ?? item.alt;
    sincronizado.push(item);
  }

  if (JSON.stringify(carrito) !== JSON.stringify(sincronizado)) {
    carrito = sincronizado;
    persistir();
  }
  return { avisos, cambios: avisos.length > 0 };
}
