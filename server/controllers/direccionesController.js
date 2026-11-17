// direccionesController.js — CRUD de direcciones de envío (propias del usuario)
import * as direcciones from '../models/direccionModel.js';
import { ok, ApiError, CODIGOS } from '../utils/respuestas.js';

export async function listar(req, res, next) {
  try {
    return ok(res, await direcciones.listar(req.usuario.id));
  } catch (e) {
    return next(e);
  }
}

export async function crear(req, res, next) {
  try {
    const d = await direcciones.crear(req.usuario.id, req.body);
    return ok(res, d, 201);
  } catch (e) {
    return next(e);
  }
}

export async function actualizar(req, res, next) {
  try {
    const d = await direcciones.actualizar(req.usuario.id, req.params.id, req.body);
    if (!d) return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Dirección no encontrada.'));
    return ok(res, d);
  } catch (e) {
    return next(e);
  }
}

export async function eliminar(req, res, next) {
  try {
    const d = await direcciones.eliminar(req.usuario.id, req.params.id);
    if (!d) return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Dirección no encontrada.'));
    return ok(res, d);
  } catch (e) {
    return next(e);
  }
}
