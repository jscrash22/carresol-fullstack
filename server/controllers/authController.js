// authController.js — registro, login y sesión actual (modelo ER real)
import bcrypt from 'bcryptjs';
import { firmarToken } from '../middleware/auth.js';
import * as usuarios from '../models/usuarioModel.js';
import * as resetTokens from '../models/passwordResetModel.js';
import { ok, fallo, ApiError, CODIGOS } from '../utils/respuestas.js';
import { logger } from '../utils/logger.js';

const RONDAS = Number(process.env.BCRYPT_ROUNDS || 12);

export async function registrar(req, res, next) {
  try {
    const { nombre, email, password, telefono, cedula } = req.body;

    // Prevención de mass assignment: role NUNCA se toma del body
    const existente = await usuarios.buscarPorEmail(email);
    if (existente) {
      return fallo(res, CODIGOS.CONFLICTO.status, CODIGOS.CONFLICTO.codigo,
        'Ya existe una cuenta con ese correo electrónico.');
    }

    const passwordHash = await bcrypt.hash(password, RONDAS);
    // Un registro público SIEMPRE nace como rol 'user', venga lo que venga en el body
    const usuario = await usuarios.crearUsuario({
      nombre, email, passwordHash, telefono: telefono ?? null, cedula: cedula ?? null,
    });

    logger.info(`Nuevo usuario registrado: ${usuario.email}`);
    // Devuelve el usuario limpio + token para iniciar sesión de inmediato
    const token = firmarToken(usuario);
    return ok(res, { usuario: usuarios.limpio(usuario), token }, 201);
  } catch (e) {
    return next(e);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const usuario = await usuarios.buscarPorEmail(email);

    // Mensaje genérico: no revelar si el correo existe o no (enumeración de usuarios)
    if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
      logger.warn(`Intento de login fallido: ${email}`);
      return fallo(res, CODIGOS.NO_AUTORIZADO.status, CODIGOS.NO_AUTORIZADO.codigo,
        'Credenciales inválidas.');
    }
    if (!usuario.activo) {
      return fallo(res, CODIGOS.PROHIBIDO.status, CODIGOS.PROHIBIDO.codigo,
        'La cuenta está desactivada. Contacta al administrador.');
    }

    await usuarios.actualizarUltimoLogin(usuario.id);
    const token = firmarToken(usuario);
    logger.info(`Login correcto: ${usuario.email} (rol ${usuario.rol.nombre})`);
    return ok(res, { usuario: usuarios.limpio(usuario), token });
  } catch (e) {
    return next(e);
  }
}

export async function me(req, res, next) {
  try {
    const usuario = await usuarios.usuarioPorId(req.usuario.id);
    if (!usuario) {
      return next(new ApiError(CODIGOS.NO_AUTORIZADO, 'La sesión ya no es válida.'));
    }
    return ok(res, usuarios.limpio(usuario));
  } catch (e) {
    return next(e);
  }
}

// POST /api/auth/forgot-password (P2) — pide un token de recuperación.
// Respuesta idéntica exista o no el correo (anti enumeración de usuarios).
// Sin servicio de correo en el reto: en desarrollo se devuelve el token para
// poder probar el flujo; en producción viajaría en un correo real.
export async function solicitarReset(req, res, next) {
  try {
    const { email } = req.body;
    const usuario = await usuarios.buscarPorEmail(email);
    const datos = {
      mensaje: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
    };
    if (usuario) {
      const token = await resetTokens.crearTokenReset(usuario.id);
      logger.info(`Token de recuperación creado para ${usuario.email}`);
      // Solo fuera de producción (en producción iría únicamente por correo)
      if (process.env.NODE_ENV !== 'production') {
        datos.enlaceDesarrollo = `/#/recuperar?token=${token}`;
        datos.token = token;
      }
    } else {
      logger.info(`Solicitud de recuperación para un correo no registrado: ${email}`);
    }
    return ok(res, datos);
  } catch (e) {
    return next(e);
  }
}

// POST /api/auth/reset-password (P2) — restablece la contraseña con un token.
// El token se consume una sola vez (un solo uso) dentro de la misma transacción
// que actualiza la contraseña.
export async function restablecerPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const passwordHash = await bcrypt.hash(password, RONDAS);
    const usuarioId = await resetTokens.usarTokenReset(token, passwordHash);
    if (!usuarioId) {
      // Mensaje genérico: el token pudo no existir, expirar o ya usarse
      return fallo(res, CODIGOS.NO_AUTORIZADO.status, CODIGOS.NO_AUTORIZADO.codigo,
        'El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.');
    }
    logger.info(`Contraseña restablecida con token para el usuario ${usuarioId}`);
    return ok(res, { mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión con la nueva.' });
  } catch (e) {
    return next(e);
  }
}
