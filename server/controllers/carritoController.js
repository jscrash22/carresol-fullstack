// carritoController.js — carrito persistido en el servidor (usuario autenticado)
import * as carrito from '../models/carritoModel.js';
import { ok } from '../utils/respuestas.js';

export async function obtener(req, res, next) {
  try {
    return ok(res, await carrito.obtener(req.usuario.id));
  } catch (e) {
    return next(e);
  }
}

// PUT /api/carrito — sincroniza el carrito local del navegador con el servidor
export async function sincronizar(req, res, next) {
  try {
    return ok(res, await carrito.sincronizar(req.usuario.id, req.body.items ?? []));
  } catch (e) {
    return next(e);
  }
}

// POST /api/carrito/items — agrega (o incrementa) una variante
export async function agregar(req, res, next) {
  try {
    return ok(res, await carrito.agregarItem(req.usuario.id, req.body), 201);
  } catch (e) {
    return next(e);
  }
}

// DELETE /api/carrito/items/:varianteId — quita una variante del carrito
export async function quitar(req, res, next) {
  try {
    return ok(res, await carrito.quitarItem(req.usuario.id, req.params.varianteId));
  } catch (e) {
    return next(e);
  }
}

// DELETE /api/carrito — vacía el carrito
export async function vaciar(req, res, next) {
  try {
    return ok(res, await carrito.vaciar(req.usuario.id));
  } catch (e) {
    return next(e);
  }
}
