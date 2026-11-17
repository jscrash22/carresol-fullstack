// auditoriaModel.js — consulta del registro de auditoría (solo admin)
import { prisma } from './db.js';

export function limpio(a) {
  return {
    id: Number(a.id),
    tabla: a.tabla,
    registroId: a.registroId,
    accion: a.accion,
    datosAnteriores: a.datosAnteriores,
    datosNuevos: a.datosNuevos,
    usuario: a.usuario ? { id: Number(a.usuario.id), nombre: a.usuario.nombre, email: a.usuario.email } : null,
    createdAt: a.createdAt,
  };
}

export async function listar({ tabla, accion, usuarioId, page = 1, limit = 100 } = {}) {
  const where = {};
  if (tabla) where.tabla = tabla;
  if (accion) where.accion = accion;
  if (usuarioId) where.usuarioId = BigInt(usuarioId);

  const numero = Math.max(1, Number(page) || 1);
  const porPagina = Math.min(200, Math.max(1, Number(limit) || 100));

  const [total, filas] = await prisma.$transaction([
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (numero - 1) * porPagina,
      take: porPagina,
      include: { usuario: { select: { id: true, nombre: true, email: true } } },
    }),
  ]);
  return { total, page: numero, limit: porPagina, filas: filas.map(limpio) };
}
