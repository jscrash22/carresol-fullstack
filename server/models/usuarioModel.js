// usuarioModel.js — acceso a datos de usuarios (modelo ER real)
// Los ids BigInt de la BD se convierten a Number al salir del modelo:
// la API responde números JSON normales y el JWT firma un sub numérico.
import { prisma, prismaSinAuditoria } from './db.js';

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

// Fuera de auditoría explícita: es un campo técnico de sesión (sin valor de negocio)
export async function actualizarUltimoLogin(id) {
  return prismaSinAuditoria.usuario.update({ where: { id }, data: { ultimoLogin: new Date() } });
}
