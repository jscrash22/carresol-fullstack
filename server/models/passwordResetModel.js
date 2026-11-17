// passwordResetModel.js — tokens de recuperación de contraseña (P2)
// Tabla password_reset_tokens del ER. Reglas:
// • La BD guarda SOLO el hash SHA-256 del token (nunca el token en claro).
// • Expira a los 30 minutos y es de un solo uso (usado_at).
// • Al pedir uno nuevo se invalidan los anteriores sin usar del mismo usuario.
// Los ids BigInt salen del modelo como Number (contrato de la API).
import crypto from 'node:crypto';
import { prisma } from './db.js';

const MINUTOS_VALIDEZ = 30;

const hashear = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Crea un token de recuperación para el usuario y devuelve el token en claro
// (solo para enviárselo por correo; aquí no hay servicio de correo).
export async function crearTokenReset(usuarioId) {
  // Un solo token vivo por usuario: invalida los pendientes anteriores
  await prisma.passwordResetToken.updateMany({
    where: { usuarioId, usadoAt: null },
    data: { usadoAt: new Date() },
  });
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashear(token),
      usuarioId,
      expiraAt: new Date(Date.now() + MINUTOS_VALIDEZ * 60 * 1000),
    },
  });
  return token;
}

// Consume el token (un solo uso) y cambia la contraseña del usuario en una
// transacción. Devuelve el id del usuario o null si el token no existe,
// ya se usó o expiró (el hash único lo identifica).
export async function usarTokenReset(token, passwordHash) {
  const tokenHash = hashear(token);
  return prisma.$transaction(async (tx) => {
    const registro = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!registro || registro.usadoAt || registro.expiraAt < new Date()) return null;
    await tx.passwordResetToken.update({
      where: { tokenHash },
      data: { usadoAt: new Date() },
    });
    await tx.usuario.update({
      where: { id: registro.usuarioId },
      data: { passwordHash },
    });
    return Number(registro.usuarioId);
  });
}
