// contactoController.js — formulario de contacto público + bandeja admin
import * as contacto from '../models/contactoModel.js';
import { ok, ApiError, CODIGOS } from '../utils/respuestas.js';
import { logger } from '../utils/logger.js';

// POST /api/contacto — público (con o sin sesión)
export async function enviar(req, res, next) {
  try {
    // Si hay sesión, se asocia el mensaje a la cuenta (usuarioId del token, nunca del body)
    const usuarioId = req.usuario?.id ?? null;
    const mensaje = await contacto.crear({ ...req.body, usuarioId });
    logger.info(`Mensaje de contacto recibido de ${req.body.email}${usuarioId ? ` (usuario id ${usuarioId})` : ' (invitado)'}`);
    return ok(res, mensaje, 201);
  } catch (e) {
    return next(e);
  }
}

// GET /api/contacto — bandeja (solo admin)
export async function bandeja(req, res, next) {
  try {
    const leido = req.query.leido !== undefined ? req.query.leido === 'true' : undefined;
    return ok(res, await contacto.listar({ leido }));
  } catch (e) {
    return next(e);
  }
}

// PATCH /api/contacto/:id/leido — marcar como leído (solo admin)
export async function marcarLeido(req, res, next) {
  try {
    const m = await contacto.marcarLeido(req.params.id, req.usuario.id);
    if (!m) return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Mensaje no encontrado.'));
    return ok(res, m);
  } catch (e) {
    return next(e);
  }
}
