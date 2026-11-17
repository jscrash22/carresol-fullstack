// usuarioModel.js — acceso a datos de usuarios (modelo ER real)
// Los ids BigInt de la BD se convierten a Number al salir del modelo:
// la API responde números JSON normales y el JWT firma un sub numérico.
import { prisma, prismaSinAuditoria } from './db.js';
import { ApiError, CODIGOS } from '../utils/respuestas.js';
import { TX_LARGA } from '../utils/transaccion.js';

const INCLUIR_ROL = { rol: true };

// Nunca se expone passwordHash fuera del modelo
export function limpio(usuario) {
  if (!usuario) return null;
  return {
    id: Number(usuario.id),
    nombre: usuario.nombre,
    telefono: usuario.telefono,
    email: usuario.email,
    cedula: usuario.cedula,
    emailVerificado: usuario.emailVerificado,
    activo: usuario.activo,
    role: usuario.rol?.nombre ?? 'user',
    ultimoLogin: usuario.ultimoLogin,
    createdAt: usuario.createdAt,
  };
}

export async function rolPorNombre(nombre) {
  return prisma.rol.findUnique({ where: { nombre } });
}

export async function crearUsuario({ nombre, email, passwordHash, telefono, cedula }) {
  // Anti mass-assignment: el rol NUNCA viene del cliente; un registro nuevo
  // siempre nace como 'user' (el admin se asigna solo vía seed o BD).
  const rol = await rolPorNombre('user');
  return prisma.usuario.create({
    data: { nombre, email, passwordHash, telefono, cedula, rolId: rol.id },
    include: INCLUIR_ROL,
  });
}

export async function buscarPorEmail(email) {
  return prisma.usuario.findUnique({ where: { email }, include: INCLUIR_ROL });
}

export async function usuarioPorId(id) {
  return prisma.usuario.findUnique({ where: { id: BigInt(id) }, include: INCLUIR_ROL });
}

export async function listarUsuarios({ page = 1, limit = 50 } = {}) {
  const usuarios = await prisma.usuario.findMany({
    orderBy: { id: 'asc' },
    include: { rol: true, _count: { select: { pedidos: true } } },
    skip: (page - 1) * limit,
    take: limit,
  });
  return usuarios.map((u) => ({ ...limpio(u), totalPedidos: u._count.pedidos }));
}

/**
 * Activa/desactiva un usuario y/o cambia su rol (solo admin).
 * Salvaguardas: nadie puede desactivarse ni quitarse el rol a sí mismo, y el
 * sistema nunca puede quedarse sin un administrador activo. Toda la operación
 * (cambio + auditoría, sin passwordHash) ocurre en una sola transacción.
 * authRequired ya comprueba `activo` en cada petición: una cuenta desactivada
 * pierde el acceso en la siguiente llamada con su token anterior.
 */
export async function cambiarUsuario(id, cambios, adminId) {
  const idUsuario = BigInt(id);
  const objetivo = await prisma.usuario.findUnique({ where: { id: idUsuario }, include: INCLUIR_ROL });
  if (!objetivo) return null;

  const rolActual = objetivo.rol?.nombre ?? 'user';
  const activoNuevo = cambios.activo === undefined ? objetivo.activo : cambios.activo === true;
  const roleNuevo = cambios.role || rolActual;

  if (Number(objetivo.id) === Number(adminId)
      && (cambios.activo === false || (cambios.role && cambios.role !== 'admin'))) {
    throw new ApiError(CODIGOS.REGLA_NEGOCIO, 'Un administrador no puede desactivarse ni quitarse su propio rol.');
  }

  if (rolActual === 'admin' && (activoNuevo === false || roleNuevo !== 'admin')) {
    const rolAdmin = await rolPorNombre('admin');
    const activos = await prisma.usuario.count({ where: { rolId: rolAdmin.id, activo: true } });
    if (activos <= 1) {
      throw new ApiError(CODIGOS.REGLA_NEGOCIO, 'No se puede dejar el sistema sin un administrador activo.');
    }
  }

  const rol = await rolPorNombre(roleNuevo);
  const actualizado = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.update({
      where: { id: idUsuario },
      data: { activo: activoNuevo, rolId: rol.id },
      include: INCLUIR_ROL,
    });
    await tx.auditoria.create({
      data: {
        tabla: 'usuarios',
        registroId: String(idUsuario),
        accion: 'UPDATE',
        datosAnteriores: { id: Number(objetivo.id), activo: objetivo.activo, role: rolActual },
        datosNuevos: { id: Number(usuario.id), activo: usuario.activo, role: usuario.rol.nombre },
        usuarioId: BigInt(adminId),
      },
    });
    return usuario;
  }, TX_LARGA);

  return limpio(actualizado);
}

// Fuera de auditoría explícita: es un campo técnico de sesión (sin valor de negocio)
export async function actualizarUltimoLogin(id) {
  return prismaSinAuditoria.usuario.update({ where: { id }, data: { ultimoLogin: new Date() } });
}
