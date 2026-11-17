// parametroModel.js — parámetros del sistema (IVA, moneda, envío, facturación)
import { prisma } from './db.js';

export function limpio(p) {
  return { clave: p.clave, valor: p.valor, descripcion: p.descripcion, updatedAt: p.updatedAt };
}

export async function listar() {
  const parametros = await prisma.parametroSistema.findMany({ orderBy: { clave: 'asc' } });
  return parametros.map(limpio);
}

export async function obtener(clave) {
  const p = await prisma.parametroSistema.findUnique({ where: { clave } });
  return p?.valor ?? null;
}

export async function actualizar(clave, valor, descripcion) {
  const p = await prisma.parametroSistema.upsert({
    where: { clave },
    update: { valor, descripcion: descripcion ?? undefined },
    create: { clave, valor, descripcion: descripcion ?? null },
  });
  return limpio(p);
}
