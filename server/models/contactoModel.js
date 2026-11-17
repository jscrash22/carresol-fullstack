// contactoModel.js — mensajes del formulario de contacto (soporte)
import { prisma } from './db.js';

export function limpio(m) {
  return {
    id: Number(m.id),
    nombre: m.nombre,
    email: m.email,
    telefono: m.telefono,
    mensaje: m.mensaje,
    canalPreferido: m.canalPreferido,
    leido: m.leido,
    leidoAt: m.leidoAt,
    createdAt: m.createdAt,
    usuario: m.usuario ? { id: Number(m.usuario.id), nombre: m.usuario.nombre, email: m.usuario.email } : null,
  };
}

export async function crear({ usuarioId, nombre, email, telefono, mensaje, canalPreferido }) {
  const m = await prisma.mensajeContacto.create({
    data: { usuarioId: usuarioId ?? null, nombre, email, telefono, mensaje, canalPreferido },
    include: { usuario: { select: { id: true, nombre: true, email: true } } },
  });
  return limpio(m);
}

export async function listar({ leido, page = 1, limit = 50 } = {}) {
  const mensajes = await prisma.mensajeContacto.findMany({
    where: leido === undefined ? undefined : { leido },
    orderBy: { id: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: { usuario: { select: { id: true, nombre: true, email: true } } },
  });
  return mensajes.map(limpio);
}

export async function marcarLeido(id, adminId) {
  const m = await prisma.mensajeContacto.findUnique({ where: { id: BigInt(id) } });
  if (!m) return null;
  if (m.leido) return limpio(m); // idempotente
  const actualizado = await prisma.mensajeContacto.update({
    where: { id: m.id },
    data: { leido: true, leidoAt: new Date(), leidoPor: adminId },
    include: { usuario: { select: { id: true, nombre: true, email: true } } },
  });
  return limpio(actualizado);
}
