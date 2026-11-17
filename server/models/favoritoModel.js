// favoritoModel.js — favoritos por usuario (FK compuesta usuario+producto)
import { prisma } from './db.js';
import { limpio as productoLimpio, INCLUIR_COMPLETO } from './productoModel.js';
import { ApiError, CODIGOS } from '../utils/respuestas.js';

export async function listar(usuarioId) {
  const favoritos = await prisma.favorito.findMany({
    where: { usuarioId },
    include: { producto: { include: INCLUIR_COMPLETO } },
    orderBy: { id: 'desc' },
  });
  // Devuelve los productos favoritos con el mismo formato del catálogo
  return favoritos.map((f) => productoLimpio(f.producto));
}

export async function agregar(usuarioId, productoId) {
  const producto = await prisma.producto.findUnique({ where: { id: BigInt(productoId) } });
  if (!producto || !producto.activo) {
    throw new ApiError(CODIGOS.NO_ENCONTRADO, 'El producto no existe o está inactivo.');
  }
  const favorito = await prisma.favorito.upsert({
    where: { usuarioId_productoId: { usuarioId, productoId: producto.id } },
    update: {},
    create: { usuarioId, productoId: producto.id },
  });
  return { id: Number(favorito.id), productoId: Number(producto.id) };
}

export async function quitar(usuarioId, productoId) {
  const borrados = await prisma.favorito.deleteMany({
    where: { usuarioId, productoId: BigInt(productoId) },
  });
  return { eliminados: borrados.count };
}
