// configPublicaController.js — GET /api/config-publica (sin autenticación)
import { configuracionPublica } from '../models/configPublicaModel.js';
import { ok } from '../utils/respuestas.js';

export async function publica(req, res, next) {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    return ok(res, await configuracionPublica());
  } catch (e) {
    return next(e);
  }
}
