// favoritosController.js — favoritos del usuario autenticado
import * as favoritos from '../models/favoritoModel.js';
import { ok } from '../utils/respuestas.js';

export async function listar(req, res, next) {
  try {
    return ok(res, await favoritos.listar(req.usuario.id));
  } catch (e) {
    return next(e);
  }
}

export async function agregar(req, res, next) {
  try {
    return ok(res, await favoritos.agregar(req.usuario.id, req.body.productoId), 201);
  } catch (e) {
    return next(e);
  }
}

export async function quitar(req, res, next) {
  try {
    return ok(res, await favoritos.quitar(req.usuario.id, req.params.productoId));
  } catch (e) {
    return next(e);
  }
}
