// productosController.js — CRUD de productos (público de lectura, admin de escritura)
import * as productos from '../models/productoModel.js';
import { ok, ApiError, CODIGOS } from '../utils/respuestas.js';
import { logger } from '../utils/logger.js';

export async function listar(req, res, next) {
  try {
    const { categoria, destacado, q } = req.query;
    // ?inactivos=true solo se honra para admins (la lista pública es de activos)
    const incluirInactivos = req.query.inactivos === 'true' && req.usuario?.role === 'admin';
    const lista = await productos.listarProductos({ categoria, destacado, q, incluirInactivos });
    return ok(res, lista);
  } catch (e) {
    return next(e);
  }
}

export async function obtener(req, res, next) {
  try {
    const p = await productos.obtenerProducto(req.params.id);
    if (!p) {
      return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Producto no encontrado.'));
    }
    return ok(res, p);
  } catch (e) {
    return next(e);
  }
}

export async function crear(req, res, next) {
  try {
    const p = await productos.crearProducto(req.body);
    logger.info(`Producto creado (id ${p.id}): ${p.nombre}`);
    return ok(res, p, 201);
  } catch (e) {
    return next(e);
  }
}

export async function actualizar(req, res, next) {
  try {
    const p = await productos.actualizarProducto(req.params.id, req.body);
    if (!p) {
      return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Producto no encontrado.'));
    }
    logger.info(`Producto actualizado (id ${p.id}): ${p.nombre}`);
    return ok(res, p);
  } catch (e) {
    return next(e);
  }
}

export async function eliminar(req, res, next) {
  try {
    const resultado = await productos.eliminarProducto(req.params.id);
    if (!resultado) {
      return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Producto no encontrado.'));
    }
    logger.info(`Producto eliminado (id ${resultado.id})${resultado.logico ? ' — borrado lógico (tiene ventas)' : ''}`);
    return ok(res, resultado);
  } catch (e) {
    return next(e);
  }
}
