// carritoModel.js — carrito persistido en el servidor (por usuario logueado)
// El frontend mantiene un carrito local (localStorage) y lo sincroniza al
// iniciar sesión; al confirmar un pedido el backend lo vacía (ver pedidoModel).
import { prisma } from './db.js';
import { ApiError, CODIGOS } from '../utils/respuestas.js';

const INCLUIR_ITEMS = {
  items: {
    include: { variante: { include: { material: true, producto: true } } },
    orderBy: { id: 'asc' },
  },
};

function itemLimpio(i) {
  return {
    id: Number(i.id),
    varianteId: Number(i.varianteId),
    cantidad: i.cantidad,
    precioUnitario: Number(i.precioUnitario),
    sku: i.variante?.sku ?? null,
    nombreProducto: i.variante?.producto?.nombre ?? null,
    material: i.variante?.material?.nombre ?? null,
    medida: i.variante?.medida ?? null,
    stockDisponible: i.variante?.stock ?? 0,
  };
}

export function carritoLimpio(c) {
  const items = (c?.items ?? []).map(itemLimpio);
  return {
    items,
    cantidadItems: items.length,
    unidades: items.reduce((s, i) => s + i.cantidad, 0),
    subtotal: items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0),
    actualizadoEn: c?.updatedAt ?? null,
  };
}

async function obtenerOCrear(usuarioId) {
  return prisma.carrito.upsert({
    where: { usuarioId },
    update: {},
    create: { usuarioId },
    include: INCLUIR_ITEMS,
  });
}

export async function obtener(usuarioId) {
  const carrito = await obtenerOCrear(usuarioId);
  return carritoLimpio(carrito);
}

// Sincroniza el carrito local del navegador con el servidor (al iniciar sesión)
export async function sincronizar(usuarioId, items) {
  return prisma.$transaction(async (tx) => {
    const carrito = await tx.carrito.upsert({
      where: { usuarioId },
      update: {},
      create: { usuarioId },
    });

    await tx.carritoItem.deleteMany({ where: { carritoId: carrito.id } });

    for (const item of items) {
      const variante = await tx.variante.findUnique({
        where: { id: BigInt(item.varianteId) },
        include: { producto: true },
      });
      if (!variante || !variante.activo || !variante.producto.activo) {
        throw new ApiError(CODIGOS.NO_ENCONTRADO, `La variante ${item.varianteId} ya no está disponible.`);
      }
      if (variante.stock < item.cantidad) {
        throw new ApiError(CODIGOS.REGLA_NEGOCIO,
          `Stock insuficiente: solo hay ${variante.stock} unidades de "${variante.producto.nombre}" (${variante.sku}). Elige una cantidad entre 1 y ${variante.stock}.`,
          [{
            campo: `items[${item.varianteId}].cantidad`,
            mensaje: `Solo hay ${variante.stock} unidades disponibles de "${variante.producto.nombre}" (${variante.sku}).`,
            varianteId: Number(variante.id),
            sku: variante.sku,
            solicitado: item.cantidad,
            disponible: variante.stock,
          }]);
      }
      await tx.carritoItem.create({
        data: {
          carritoId: carrito.id,
          varianteId: variante.id,
          cantidad: item.cantidad,
          precioUnitario: variante.precio, // precio vigente del servidor, nunca del cliente
        },
      });
    }

    return tx.carrito.findUnique({ where: { id: carrito.id }, include: INCLUIR_ITEMS });
  }).then(carritoLimpio);
}

// Agrega o incrementa un item (usado por la vista de producto si hay sesión)
export async function agregarItem(usuarioId, { varianteId, cantidad = 1 }) {
  return prisma.$transaction(async (tx) => {
    const carrito = await tx.carrito.upsert({ where: { usuarioId }, update: {}, create: { usuarioId } });
    const variante = await tx.variante.findUnique({
      where: { id: BigInt(varianteId) },
      include: { producto: true },
    });
    if (!variante || !variante.activo || !variante.producto.activo) {
      throw new ApiError(CODIGOS.NO_ENCONTRADO, 'Esa variante ya no está disponible.');
    }

    const existente = await tx.carritoItem.findUnique({
      where: { carritoId_varianteId: { carritoId: carrito.id, varianteId: variante.id } },
    });
    const cantidadNueva = (existente?.cantidad ?? 0) + cantidad;
    if (cantidadNueva > variante.stock) {
      throw new ApiError(CODIGOS.REGLA_NEGOCIO,
        `Solo hay ${variante.stock} unidades disponibles de "${variante.producto.nombre}" (${variante.sku}). Ya tienes ${existente?.cantidad ?? 0} en tu carrito.`,
        [{
          campo: 'cantidad',
          mensaje: `Solo hay ${variante.stock} unidades disponibles de "${variante.producto.nombre}" (${variante.sku}).`,
          varianteId: Number(variante.id),
          sku: variante.sku,
          solicitado: cantidadNueva,
          disponible: variante.stock,
        }]);
    }
    if (existente) {
      await tx.carritoItem.update({
        where: { id: existente.id },
        data: { cantidad: cantidadNueva, precioUnitario: variante.precio },
      });
    } else {
      await tx.carritoItem.create({
        data: {
          carritoId: carrito.id,
          varianteId: variante.id,
          cantidad: cantidadNueva,
          precioUnitario: variante.precio,
        },
      });
    }
    return tx.carrito.findUnique({ where: { id: carrito.id }, include: INCLUIR_ITEMS });
  }).then(carritoLimpio);
}

export async function quitarItem(usuarioId, varianteId) {
  const carrito = await obtenerOCrear(usuarioId);
  await prisma.carritoItem.deleteMany({ where: { carritoId: carrito.id, varianteId: BigInt(varianteId) } });
  return obtener(usuarioId);
}

export async function vaciar(usuarioId) {
  const carrito = await obtenerOCrear(usuarioId);
  await prisma.carritoItem.deleteMany({ where: { carritoId: carrito.id } });
  return obtener(usuarioId);
}
