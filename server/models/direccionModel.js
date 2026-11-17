// direccionModel.js — direcciones de envío del usuario (propiedad verificada: anti-IDOR)
import { prisma } from './db.js';
import { ApiError, CODIGOS } from '../utils/respuestas.js';

export function limpia(d) {
  return {
    id: Number(d.id),
    alias: d.alias,
    destinatario: d.destinatario,
    telefono: d.telefono,
    provincia: d.provincia,
    ciudad: d.ciudad,
    callePrincipal: d.callePrincipal,
    calleSecundaria: d.calleSecundaria,
    numeracion: d.numeracion,
    referencia: d.referencia,
    codigoPostal: d.codigoPostal,
    esPredeterminada: d.esPredeterminada,
    activa: d.activa,
    createdAt: d.createdAt,
  };
}

const CAMPOS = ['alias', 'destinatario', 'telefono', 'provincia', 'ciudad', 'callePrincipal',
  'calleSecundaria', 'numeracion', 'referencia', 'codigoPostal'];

export async function listar(usuarioId) {
  const direcciones = await prisma.direccion.findMany({
    where: { usuarioId, activa: true },
    orderBy: [{ esPredeterminada: 'desc' }, { id: 'asc' }],
  });
  return direcciones.map(limpia);
}

export async function crear(usuarioId, body) {
  return prisma.$transaction(async (tx) => {
    // Solo UNA dirección predeterminada por usuario
    if (body.esPredeterminada) {
      await tx.direccion.updateMany({
        where: { usuarioId, esPredeterminada: true },
        data: { esPredeterminada: false },
      });
    }
    const direccion = await tx.direccion.create({
      data: { usuarioId, ...recoger(body), esPredeterminada: body.esPredeterminada === true },
    });
    return direccion;
  }).then(limpia);
}

export async function actualizar(usuarioId, id, body) {
  const existente = await prisma.direccion.findUnique({ where: { id: BigInt(id) } });
  if (!existente || !existente.activa) return null;
  if (Number(existente.usuarioId) !== Number(usuarioId)) {
    throw new ApiError(CODIGOS.PROHIBIDO, 'Esa dirección no pertenece a tu cuenta.');
  }
  return prisma.$transaction(async (tx) => {
    if (body.esPredeterminada === true) {
      await tx.direccion.updateMany({
        where: { usuarioId, esPredeterminada: true },
        data: { esPredeterminada: false },
      });
    }
    return tx.direccion.update({ where: { id: existente.id }, data: recoger(body, true) });
  }).then(limpia);
}

// Borrado lógico (activa = false): los pedidos históricos mantienen su FK
export async function eliminar(usuarioId, id) {
  const existente = await prisma.direccion.findUnique({ where: { id: BigInt(id) } });
  if (!existente || !existente.activa) return null;
  if (Number(existente.usuarioId) !== Number(usuarioId)) {
    throw new ApiError(CODIGOS.PROHIBIDO, 'Esa dirección no pertenece a tu cuenta.');
  }
  await prisma.direccion.update({ where: { id: existente.id }, data: { activa: false, esPredeterminada: false } });
  return { eliminado: true, id: Number(existente.id) };
}

function recoger(body, parcial = false) {
  const datos = {};
  for (const campo of CAMPOS) {
    if (body[campo] !== undefined) datos[campo] = body[campo];
    else if (!parcial && campo !== 'calleSecundaria' && campo !== 'referencia' && campo !== 'codigoPostal') {
      datos[campo] = '';
    }
  }
  if (body.esPredeterminada !== undefined) datos.esPredeterminada = body.esPredeterminada === true;
  return datos;
}
