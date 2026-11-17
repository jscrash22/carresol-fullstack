// auth.js — middleware de autenticación (JWT Bearer) y autorización por rol
//
// • El sub del JWT se firma como Number (los ids de la BD son BigInt y
//   JSON.stringify no soporta BigInt).
// • authRequired valida que el usuario SIGA activo en la BD (revocación de
//   sesiones) y deja el usuarioId en un AsyncLocalStorage que usa la auditoría
//   (models/db.js) para saber quién hizo cada cambio.
import jwt from 'jsonwebtoken';
import { ApiError, CODIGOS } from '../utils/respuestas.js';
import { logger } from '../utils/logger.js';
import { usuarioPorId } from '../models/usuarioModel.js';
// Mismo AsyncLocalStorage que usa models/db.js para la auditoría (instancia única)
import { contextoAuditoria } from '../models/db.js';

const SECRETO = process.env.JWT_SECRET;
const EXPIRACION = process.env.JWT_EXPIRES_IN || '2h';

if (!SECRETO) {
  logger.error('JWT_SECRET no definido en server/.env — el servidor no puede firmar tokens');
  throw new Error('Falta JWT_SECRET en el entorno');
}

// Firma explícita con algoritmo HS256 y expiración configurable
export function firmarToken(usuario) {
  return jwt.sign(
    {
      sub: Number(usuario.id),
      email: usuario.email,
      nombre: usuario.nombre,
      role: usuario.rol?.nombre ?? usuario.role,
    },
    SECRETO,
    { algorithm: 'HS256', expiresIn: EXPIRACION },
  );
}

// Exige cabecera Authorization: Bearer <token> válida y no vencida
export function authRequired(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const [esquema, token] = cabecera.split(' ');
  if (esquema !== 'Bearer' || !token) {
    return next(new ApiError(CODIGOS.NO_AUTORIZADO, 'Debes iniciar sesión: falta el token Bearer.'));
  }

  jwt.verify(token, SECRETO, { algorithms: ['HS256'] }, async (error, payload) => {
    if (error) {
      return next(new ApiError(CODIGOS.NO_AUTORIZADO, 'No autorizado: el token es inválido. Inicia sesión de nuevo.'));
    }

    // El usuario debe seguir existiendo y activo (permite desactivar cuentas sin esperar a que venza el JWT)
    const usuario = await usuarioPorId(payload.sub);
    if (!usuario) {
      return next(new ApiError(CODIGOS.NO_AUTORIZADO, 'La cuenta ya no existe.'));
    }
    if (!usuario.activo) {
      return next(new ApiError(CODIGOS.PROHIBIDO, 'La cuenta está desactivada.'));
    }

    req.usuario = {
      id: Number(usuario.id),
      nombre: usuario.nombre,
      email: usuario.email,
      role: usuario.rol.nombre,
    };

    // La auditoría (models/db.js) lee usuarioId de este contexto por petición
    return contextoAuditoria.run({ usuarioId: req.usuario.id }, () => next());
  });
}

// Como authRequired pero NUNCA falla: si hay token válido deja req.usuario y
// si no (o si es inválido) continúa como invitado. Para rutas públicas que
// pueden comportarse distinto para admins (p. ej. ?inactivos=true).
export function authOpcional(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const [esquema, token] = cabecera.split(' ');
  if (esquema !== 'Bearer' || !token) return next();

  jwt.verify(token, SECRETO, { algorithms: ['HS256'] }, async (error, payload) => {
    if (error) return next(); // token inválido → invitado, sin bloquear la ruta
    try {
      const usuario = await usuarioPorId(payload.sub);
      if (!usuario || !usuario.activo) return next();
      req.usuario = {
        id: Number(usuario.id),
        nombre: usuario.nombre,
        email: usuario.email,
        role: usuario.rol.nombre,
      };
      return contextoAuditoria.run({ usuarioId: req.usuario.id }, () => next());
    } catch {
      return next();
    }
  });
}

// Restringe la ruta a los roles indicados (usar SIEMPRE después de authRequired)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.role)) {
      logger.warn(`Acceso denegado (${req.usuario?.email}) a ${req.method} ${req.originalUrl}: rol "${req.usuario?.role ?? 'invitado'}"`);
      return next(new ApiError(CODIGOS.PROHIBIDO, 'No tienes permisos para realizar esta acción.'));
    }
    return next();
  };
}
