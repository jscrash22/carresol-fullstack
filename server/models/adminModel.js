// adminModel.js — vistas de administración (todas las tablas + resumen del negocio)
import { prisma } from './db.js';
import { listarUsuarios, cambiarUsuario } from './usuarioModel.js';
import { todosLosPedidos } from './pedidoModel.js';

export { listarUsuarios, cambiarUsuario, todosLosPedidos };

// Detalles de pedidos (vista admin de pedido_items con su variante)
export async function todosLosDetalles({ limit = 200 } = {}) {
  const detalles = await prisma.pedidoItem.findMany({
    orderBy: { id: 'desc' },
    take: limit,
    include: {
      variante: { select: { id: true, sku: true, stock: true } },
      pedido: { select: { id: true, estado: true, createdAt: true } },
    },
  });
  return detalles.map((d) => ({
    id: Number(d.id),
    pedidoId: Number(d.pedidoId),
    sku: d.sku,
    nombreProducto: d.nombreProducto,
    material: d.material,
    medida: d.medida,
    cantidad: d.cantidad,
    precioUnitario: Number(d.precioUnitario),
    subtotal: Number(d.subtotal),
    stockActual: d.variante?.stock ?? null,
    pedido: d.pedido ? { ...d.pedido, id: Number(d.pedido.id) } : null,
  }));
}

// Resumen del negocio: conteos de TODAS las tablas del ER + ventas
export async function resumen() {
  const [
    roles, usuarios, direcciones, categorias, materiales, productos, variantes,
    carritos, carritoItems, favoritos, pedidos, pedidoItems, pagos,
    facturas, envios, mensajes, proveedores, compras, compraItems,
    movimientos, auditorias, parametros,
  ] = await prisma.$transaction([
    prisma.rol.count(),
    prisma.usuario.count(),
    prisma.direccion.count({ where: { activa: true } }),
    prisma.categoria.count(),
    prisma.material.count(),
    prisma.producto.count({ where: { activo: true } }),
    prisma.variante.count({ where: { activo: true } }),
    prisma.carrito.count(),
    prisma.carritoItem.count(),
    prisma.favorito.count(),
    prisma.pedido.count(),
    prisma.pedidoItem.count(),
    prisma.pago.count(),
    prisma.factura.count(),
    prisma.envio.count(),
    prisma.mensajeContacto.count(),
    prisma.proveedor.count({ where: { activo: true } }),
    prisma.compra.count(),
    prisma.compraItem.count(),
    prisma.movimientoInventario.count(),
    prisma.auditoria.count(),
    prisma.parametroSistema.count(),
  ]);

  // Ventas totales (solo pedidos no cancelados) y pedidos por estado
  const ventasTotales = await prisma.pedido.aggregate({
    where: { estado: { not: 'cancelado' } },
    _sum: { total: true },
  });
  const porEstado = await prisma.pedido.groupBy({ by: ['estado'], _count: { _all: true } });

  return {
    tablas: {
      roles, usuarios, direcciones, categorias, materiales, productos, variantes,
      carritos, carritoItems, favoritos, pedidos, pedidoItems, pagos, facturas,
      envios, mensajes, proveedores, compras, compraItems, movimientos,
      auditorias, parametros,
    },
    ventasTotales: Number(ventasTotales._sum.total ?? 0),
    pedidosPorEstado: porEstado.map((e) => ({ estado: e.estado, total: e._count._all })),
    generadoEn: new Date().toISOString(),
  };
}
