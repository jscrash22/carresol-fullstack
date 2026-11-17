// errorHandler.js — manejo de errores centralizado (nunca expone stacktrace ni internals de Prisma)
import { ApiError, CODIGOS } from '../utils/respuestas.js';
import { logger } from '../utils/logger.js';

// Traduce códigos conocidos de Prisma (y errores nativos de PostgreSQL en cause)
// a respuestas HTTP controladas
function desdePrisma(error) {
  const pg = error?.cause?.code;
  switch (error.code) {
    case 'P2002':
      return new ApiError(CODIGOS.CONFLICTO, 'Ya existe un registro con ese valor único.');
    case 'P2025':
      return new ApiError(CODIGOS.NO_ENCONTRADO, 'El registro no existe.');
    case 'P2003':
      return new ApiError(CODIGOS.VALIDACION, 'El registro está referenciado por otros datos (no se puede eliminar).');
    default:
      // 23514 = violación de CHECK, 23505 = valor único duplicado, 23503 = FK violada
      if (pg === '23514') {
        return new ApiError(CODIGOS.REGLA_NEGOCIO,
          'La operación viola una regla de la base de datos (revisa stock, cantidades o importes).');
      }
      if (pg === '23505') {
        return new ApiError(CODIGOS.CONFLICTO, 'Ya existe un registro con ese valor único.');
      }
      if (pg === '23503') {
        return new ApiError(CODIGOS.VALIDACION, 'Hay datos relacionados que impiden la operación.');
      }
      return null;
  }
}

export function noEncontrado(req, res) {
  return res.status(404).json({
    ok: false,
    error: { codigo: 'NO_ENCONTRADO', mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  let err = error instanceof ApiError ? error : desdePrisma(error);

  if (!err) {
    // Error no controlado: se registra el detalle completo, pero nunca se expone al cliente
    logger.error(`Error interno en ${req.method} ${req.originalUrl}`, error);
    err = new ApiError(CODIGOS.INTERNO, 'Error interno del servidor. Intenta de nuevo más tarde.');
  } else {
    logger.warn(`${req.method} ${req.originalUrl} → ${err.status} ${err.codigo}: ${err.message}`);
  }

  const cuerpo = { ok: false, error: { codigo: err.codigo, mensaje: err.message } };
  if (err.detalles) cuerpo.error.detalles = err.detalles;
  return res.status(err.status).json(cuerpo);
}
