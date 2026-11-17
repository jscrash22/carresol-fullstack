// comprasController.js — módulo de compras: proveedores, órdenes e inventario (solo admin)
import * as compras from '../models/compraModel.js';
import { ok, ApiError, CODIGOS } from '../utils/respuestas.js';
import { logger } from '../utils/logger.js';

// ---------- Proveedores ----------
export async function listarProveedores(req, res, next) {
  try {
    const incluirInactivos = req.query.inactivos === 'true';
    return ok(res, await compras.listarProveedores({ incluirInactivos }));
  } catch (e) {
    return next(e);
  }
}

export async function crearProveedor(req, res, next) {
  try {
    const p = await compras.crearProveedor(req.body);
    logger.info(`Proveedor creado (id ${p.id}): ${p.nombre}`);
    return ok(res, p, 201);
  } catch (e) {
    return next(e);
  }
}

export async function actualizarProveedor(req, res, next) {
  try {
    const p = await compras.actualizarProveedor(req.params.id, req.body);
    if (!p) return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Proveedor no encontrado.'));
    return ok(res, p);
  } catch (e) {
    return next(e);
  }
}

export async function eliminarProveedor(req, res, next) {
  try {
    const p = await compras.eliminarProveedor(req.params.id);
    if (!p) return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Proveedor no encontrado.'));
    return ok(res, p);
  } catch (e) {
    return next(e);
  }
}

// ---------- Compras ----------
export async function listar(req, res, next) {
  try {
    return ok(res, await compras.listarCompras({ estado: req.query.estado }));
  } catch (e) {
    return next(e);
  }
}

export async function detalle(req, res, next) {
  try {
    const c = await compras.compraPorId(req.params.id);
    if (!c) return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Compra no encontrada.'));
    return ok(res, c);
  } catch (e) {
    return next(e);
  }
}

export async function crear(req, res, next) {
  try {
    const c = await compras.crearCompra(req.usuario.id, req.body);
    logger.info(`Compra #${c.numeroCompra} creada por ${req.usuario.email} al proveedor ${c.proveedor?.nombre} — total $${c.total.toFixed(2)}`);
    return ok(res, c, 201);
  } catch (e) {
    return next(e);
  }
}

export async function actualizar(req, res, next) {
  try {
    const c = await compras.actualizarCompra(req.params.id, req.usuario.id, req.body);
    if (!c) return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Compra no encontrada.'));
    return ok(res, c);
  } catch (e) {
    return next(e);
  }
}

export async function cambiarEstado(req, res, next) {
  try {
    const c = await compras.cambiarEstado(req.params.id, req.body.estado, req.usuario.id);
    if (!c) return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Compra no encontrada.'));
    logger.info(`Compra #${c.numeroCompra} → ${c.estado} (por ${req.usuario.email})${c.estado === 'recibida' ? ' — stock repuesto' : ''}`);
    return ok(res, c);
  } catch (e) {
    return next(e);
  }
}

// ---------- Inventario ----------
export async function stockBajo(req, res, next) {
  try {
    return ok(res, await compras.stockBajo());
  } catch (e) {
    return next(e);
  }
}

export async function movimientos(req, res, next) {
  try {
    const { varianteId, tipo } = req.query;
    return ok(res, await compras.movimientos({ varianteId, tipo }));
  } catch (e) {
    return next(e);
  }
}
