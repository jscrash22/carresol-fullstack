// compraModel.js — módulo de compras: proveedores + órdenes de compra + inventario
//
// Interpretación confirmada en la FASE 0 (docs/DECISIONES.md): "compras" son las
// compras a PROVEEDORES que reponen el stock de variantes.
//  • Estados: borrador → ordenada → recibida (+ cancelada desde borrador/ordenada).
//  • La recepción suma stock EXACTAMENTE UNA VEZ (idempotente) y escribe
//    movimientos_inventario con tipo 'compra'.
//  • Los totales siempre los calcula el servidor; el costo unitario del cliente
//    solo se acepta en la creación/edición del borrador (dato comercial, no de seguridad).
import { prisma } from './db.js';
import { Prisma } from '@prisma/client';
import { ApiError, CODIGOS } from '../utils/respuestas.js';

const INCLUIR_COMPRA = {
  proveedor: true,
  usuario: { select: { id: true, nombre: true, email: true } },
  items: { include: { variante: { include: { material: true, producto: true } } } },
};

// ---------- Proveedores ----------
export function proveedorLimpio(p) {
  return {
    id: Number(p.id),
    nombre: p.nombre,
    ruc: p.ruc,
    email: p.email,
    telefono: p.telefono,
    direccion: p.direccion,
    contacto: p.contacto,
    activo: p.activo,
    createdAt: p.createdAt,
  };
}

export async function listarProveedores({ incluirInactivos = false } = {}) {
  const proveedores = await prisma.proveedor.findMany({
    where: incluirInactivos ? undefined : { activo: true },
    orderBy: { id: 'asc' },
  });
  return proveedores.map(proveedorLimpio);
}

export async function crearProveedor(body) {
  try {
    const p = await prisma.proveedor.create({ data: recoger(body) });
    return proveedorLimpio(p);
  } catch (e) {
    if (e.code === 'P2002') {
      throw new ApiError(CODIGOS.CONFLICTO, 'Ya existe un proveedor con ese RUC.');
    }
    throw e;
  }
}

export async function actualizarProveedor(id, body) {
  const existente = await prisma.proveedor.findUnique({ where: { id: BigInt(id) } });
  if (!existente) return null;
  try {
    const p = await prisma.proveedor.update({ where: { id: existente.id }, data: recoger(body) });
    return proveedorLimpio(p);
  } catch (e) {
    if (e.code === 'P2002') {
      throw new ApiError(CODIGOS.CONFLICTO, 'Ya existe un proveedor con ese RUC.');
    }
    throw e;
  }
}

export async function eliminarProveedor(id) {
  const existente = await prisma.proveedor.findUnique({ where: { id: BigInt(id) } });
  if (!existente) return null;
  const tieneCompras = await prisma.compra.count({ where: { proveedorId: existente.id } }) > 0;
  if (tieneCompras) {
    await prisma.proveedor.update({ where: { id: existente.id }, data: { activo: false } });
    return { eliminado: true, logico: true, id: Number(existente.id) };
  }
  await prisma.proveedor.delete({ where: { id: existente.id } });
  return { eliminado: true, logico: false, id: Number(existente.id) };
}

function recoger(body) {
  const datos = {};
  for (const campo of ['nombre', 'ruc', 'email', 'telefono', 'direccion', 'contacto', 'activo']) {
    if (body[campo] !== undefined) datos[campo] = body[campo];
  }
  return datos;
}

// ---------- Compras ----------
export function compraLimpia(c) {
  return {
    id: Number(c.id),
    numeroCompra: Number(c.numeroCompra),
    proveedorId: Number(c.proveedorId),
    proveedor: c.proveedor ? { id: Number(c.proveedor.id), nombre: c.proveedor.nombre, ruc: c.proveedor.ruc } : null,
    usuario: c.usuario ? { id: Number(c.usuario.id), nombre: c.usuario.nombre, email: c.usuario.email } : null,
    estado: c.estado,
    numeroFacturaProveedor: c.numeroFacturaProveedor,
    subtotal: Number(c.subtotal),
    ivaPorcentaje: Number(c.ivaPorcentaje),
    ivaValor: Number(c.ivaValor),
    total: Number(c.total),
    moneda: c.moneda,
    fechaCompra: c.fechaCompra,
    fechaRecepcion: c.fechaRecepcion,
    notas: c.notas,
    createdAt: c.createdAt,
    items: (c.items ?? []).map((i) => ({
      id: Number(i.id),
      varianteId: Number(i.varianteId),
      sku: i.sku,
      nombreProducto: i.nombreProducto,
      cantidad: i.cantidad,
      costoUnitario: Number(i.costoUnitario),
      subtotal: Number(i.subtotal),
      stockActual: i.variante?.stock ?? null,
    })),
  };
}

function normalizarItems(itemsBody) {
  const vistos = new Map();
  for (const item of itemsBody ?? []) {
    const id = Number(item.varianteId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(CODIGOS.VALIDACION, 'Cada item de compra necesita varianteId válido.');
    }
    if (vistos.has(id)) {
      throw new ApiError(CODIGOS.VALIDACION, 'No repitas la misma variante en la compra: ajusta la cantidad.');
    }
    vistos.set(id, { cantidad: item.cantidad, costoUnitario: new Prisma.Decimal(item.costoUnitario) });
  }
  return vistos;
}

async function calcularLineas(tx, items) {
  const ids = [...items.keys()].map((n) => BigInt(n));
  const variantes = await tx.variante.findMany({
    where: { id: { in: ids } },
    include: { material: true, producto: true },
  });
  const porId = new Map(variantes.map((v) => [Number(v.id), v]));

  let subtotal = new Prisma.Decimal(0);
  const lineas = [...items.entries()].map(([varianteId, { cantidad, costoUnitario }]) => {
    const v = porId.get(varianteId);
    if (!v) throw new ApiError(CODIGOS.NO_ENCONTRADO, `La variante con id ${varianteId} no existe.`);
    const subtotalLinea = costoUnitario.mul(cantidad);
    subtotal = subtotal.add(subtotalLinea);
    return { v, cantidad, costoUnitario, subtotal: subtotalLinea };
  });

  const ivaPct = new Prisma.Decimal(
    (await tx.parametroSistema.findUnique({ where: { clave: 'iva_porcentaje' } }))?.valor ?? '15',
  );
  const ivaValor = subtotal.mul(ivaPct).div(100);
  return { lineas, subtotal, ivaPct, ivaValor, total: subtotal.add(ivaValor) };
}

export async function listarCompras({ estado } = {}) {
  const compras = await prisma.compra.findMany({
    where: estado ? { estado } : undefined,
    orderBy: { id: 'desc' },
    include: INCLUIR_COMPRA,
  });
  return compras.map(compraLimpia);
}

export async function compraPorId(id) {
  const c = await prisma.compra.findUnique({
    where: { id: BigInt(id) },
    include: INCLUIR_COMPRA,
  });
  return c ? compraLimpia(c) : null;
}

// Crear compra en estado borrador (no mueve stock todavía)
export async function crearCompra(usuarioId, body) {
  const items = normalizarItems(body.items);

  return prisma.$transaction(async (tx) => {
    const proveedor = await tx.proveedor.findUnique({ where: { id: BigInt(body.proveedorId) } });
    if (!proveedor || !proveedor.activo) {
      throw new ApiError(CODIGOS.NO_ENCONTRADO, 'El proveedor no existe o está inactivo.');
    }

    const moneda = (await tx.parametroSistema.findUnique({ where: { clave: 'moneda' } }))?.valor ?? 'USD';
    const { lineas, subtotal, ivaPct, ivaValor, total } = await calcularLineas(tx, items);

    const compra = await tx.compra.create({
      data: {
        proveedorId: proveedor.id,
        usuarioId,
        estado: 'borrador',
        numeroFacturaProveedor: body.numeroFacturaProveedor ?? null,
        subtotal,
        ivaPorcentaje: ivaPct,
        ivaValor,
        total,
        moneda,
        fechaCompra: new Date(),
        notas: body.notas ?? null,
      },
    });

    await tx.compraItem.createMany({
      data: lineas.map(({ v, cantidad, costoUnitario, subtotal: subtotalLinea }) => ({
        compraId: compra.id,
        varianteId: v.id,
        sku: v.sku,
        nombreProducto: v.producto.nombre,
        cantidad,
        costoUnitario,
        subtotal: subtotalLinea,
      })),
    });

    return tx.compra.findUnique({ where: { id: compra.id }, include: INCLUIR_COMPRA });
  }).then(compraLimpia);
}

// Editar items/encabezado solo mientras esté en borrador
export async function actualizarCompra(id, usuarioId, body) {
  const existente = await prisma.compra.findUnique({ where: { id: BigInt(id) } });
  if (!existente) return null;
  if (existente.estado !== 'borrador') {
    throw new ApiError(CODIGOS.REGLA_NEGOCIO, 'Solo se puede editar una compra en estado borrador.');
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new ApiError(CODIGOS.VALIDACION, 'La compra necesita al menos un item.');
  }
  const items = normalizarItems(body.items);

  return prisma.$transaction(async (tx) => {
    let proveedorId = existente.proveedorId;
    if (body.proveedorId !== undefined) {
      const proveedor = await tx.proveedor.findUnique({ where: { id: BigInt(body.proveedorId) } });
      if (!proveedor || !proveedor.activo) {
        throw new ApiError(CODIGOS.NO_ENCONTRADO, 'El proveedor no existe o está inactivo.');
      }
      proveedorId = proveedor.id;
    }

    const { lineas, subtotal, ivaPct, ivaValor, total } = await calcularLineas(tx, items);

    await tx.compraItem.deleteMany({ where: { compraId: existente.id } });
    await tx.compraItem.createMany({
      data: lineas.map(({ v, cantidad, costoUnitario, subtotal: subtotalLinea }) => ({
        compraId: existente.id,
        varianteId: v.id,
        sku: v.sku,
        nombreProducto: v.producto.nombre,
        cantidad,
        costoUnitario,
        subtotal: subtotalLinea,
      })),
    });
    await tx.compra.update({
      where: { id: existente.id },
      data: {
        proveedorId,
        numeroFacturaProveedor: body.numeroFacturaProveedor ?? existente.numeroFacturaProveedor,
        notas: body.notas ?? existente.notas,
        subtotal,
        ivaPorcentaje: ivaPct,
        ivaValor,
        total,
      },
    });

    return tx.compra.findUnique({ where: { id: existente.id }, include: INCLUIR_COMPRA });
  }).then(compraLimpia);
}

const TRANSICIONES_COMPRA = {
  borrador: ['ordenada', 'cancelada'],
  ordenada: ['recibida', 'cancelada'],
  recibida: [],
  cancelada: [],
};

// Cambio de estado. La recepción (recibida) suma stock UNA sola vez (idempotente:
// recibida→recibida no es una transición permitida) y registra movimientos tipo 'compra'.
export async function cambiarEstado(id, estadoNuevo, usuarioId) {
  return prisma.$transaction(async (tx) => {
    const compra = await tx.compra.findUnique({
      where: { id: BigInt(id) },
      include: { items: true },
    });
    if (!compra) return null;

    const permitidas = TRANSICIONES_COMPRA[compra.estado] ?? [];
    if (!permitidas.includes(estadoNuevo)) {
      throw new ApiError(CODIGOS.REGLA_NEGOCIO,
        `Transición no permitida: de "${compra.estado}" a "${estadoNuevo}".`);
    }

    if (estadoNuevo === 'recibida') {
      for (const item of compra.items) {
        await tx.variante.update({
          where: { id: item.varianteId },
          data: {
            stock: { increment: item.cantidad },
            costo: item.costoUnitario, // último costo de reposición
          },
        });
        await tx.movimientoInventario.create({
          data: {
            varianteId: item.varianteId,
            tipo: 'compra',
            cantidad: item.cantidad,
            referenciaTipo: 'compra',
            referenciaId: String(compra.id),
            usuarioId,
          },
        });
      }
    }

    const actualizada = await tx.compra.update({
      where: { id: compra.id },
      data: {
        estado: estadoNuevo,
        fechaRecepcion: estadoNuevo === 'recibida' ? new Date() : compra.fechaRecepcion,
      },
    });

    return tx.compra.findUnique({ where: { id: actualizada.id }, include: INCLUIR_COMPRA });
  }).then((c) => (c ? compraLimpia(c) : null));
}

// ---------- Inventario ----------
// Variantes que alcanzaron su stock mínimo (sugerencia de reposición)
export async function stockBajo({ limit = 100 } = {}) {
  const variantes = await prisma.variante.findMany({
    where: { activo: true, stock: { lte: prisma.variante.fields.stockMinimo } },
    include: { material: true, producto: { include: { categoria: true } } },
    orderBy: { stock: 'asc' },
    take: limit,
  });
  return variantes.map((v) => ({
    id: Number(v.id),
    sku: v.sku,
    nombreProducto: v.producto.nombre,
    categoria: v.producto.categoria?.slug ?? null,
    material: v.material?.nombre ?? null,
    medida: v.medida,
    stock: v.stock,
    stockMinimo: v.stockMinimo,
    sugerido: Math.max(10 - v.stock, 10), // sugerencia simple: reponer hasta 10
  }));
}

export async function movimientos({ varianteId, tipo, limit = 200 } = {}) {
  const where = {};
  if (varianteId) where.varianteId = BigInt(varianteId);
  if (tipo) where.tipo = tipo;
  const filas = await prisma.movimientoInventario.findMany({
    where,
    orderBy: { id: 'desc' },
    take: limit,
    include: {
      variante: { include: { producto: true } },
      usuario: { select: { id: true, nombre: true, email: true } },
    },
  });
  return filas.map((m) => ({
    id: Number(m.id),
    sku: m.variante?.sku ?? null,
    nombreProducto: m.variante?.producto?.nombre ?? null,
    tipo: m.tipo,
    cantidad: m.cantidad,
    referenciaTipo: m.referenciaTipo,
    referenciaId: m.referenciaId,
    usuario: m.usuario ? { id: Number(m.usuario.id), nombre: m.usuario.nombre } : null,
    createdAt: m.createdAt,
  }));
}
