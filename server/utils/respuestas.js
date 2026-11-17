// respuestas.js — forma consistente de todas las respuestas JSON de la API
export function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function fallo(res, status, codigo, mensaje, detalles) {
  const error = { codigo, mensaje };
  if (detalles) error.detalles = detalles;
  return res.status(status).json({ ok: false, error });
}

// Códigos de error estandarizados de la API
export const CODIGOS = {
  VALIDACION: { status: 422, codigo: 'VALIDACION' },
  NO_AUTORIZADO: { status: 401, codigo: 'NO_AUTORIZADO' },
  PROHIBIDO: { status: 403, codigo: 'PROHIBIDO' },
  NO_ENCONTRADO: { status: 404, codigo: 'NO_ENCONTRADO' },
  CONFLICTO: { status: 409, codigo: 'CONFLICTO' },
  REGLA_NEGOCIO: { status: 409, codigo: 'REGLA_NEGOCIO' },
  LIMITE: { status: 429, codigo: 'LIMITE' },
  INTERNO: { status: 500, codigo: 'INTERNO' },
};

export class ApiError extends Error {
  constructor({ status, codigo }, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}
