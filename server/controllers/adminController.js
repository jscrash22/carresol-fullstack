// adminController.js — panel de administración (ampliado al modelo ER real)
import * as admin from '../models/adminModel.js';
import * as catalogo from '../models/catalogoModel.js';
import * as auditoriaModel from '../models/auditoriaModel.js';
import * as parametros from '../models/parametroModel.js';
import { ok, ApiError, CODIGOS } from '../utils/respuestas.js';
import { logger } from '../utils/logger.js';

export async function usuarios(req, res, next) {
  try {
    // listarUsuarios NUNCA incluye passwordHash (ver models/usuarioModel.js)
    return ok(res, await admin.listarUsuarios());
  } catch (e) {
    return next(e);
  }
}

// PATCH /api/admin/usuarios/:id — activar/desactivar y/o cambiar rol
export async function actualizarUsuario(req, res, next) {
  try {
    const usuario = await admin.cambiarUsuario(req.params.id, req.body, req.usuario.id);
    if (!usuario) return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Usuario no encontrado.'));
    logger.info(`Usuario #${usuario.id} actualizado por el admin #${req.usuario.id}`);
    return ok(res, usuario);
  } catch (e) {
    return next(e);
  }
}

export async function pedidos(req, res, next) {
  try {
    return ok(res, await admin.todosLosPedidos({ estado: req.query.estado }));
  } catch (e) {
    return next(e);
  }
}

export async function detalles(req, res, next) {
  try {
    return ok(res, await admin.todosLosDetalles());
  } catch (e) {
    return next(e);
  }
}

export async function resumen(req, res, next) {
  try {
    return ok(res, await admin.resumen());
  } catch (e) {
    return next(e);
  }
}

// ---------- Catálogo: categorías y materiales ----------
export async function categorias(req, res, next) {
  try {
    return ok(res, await catalogo.listarCategorias(req.query.inactivas === 'true'));
  } catch (e) {
    return next(e);
  }
}

export async function crearCategoria(req, res, next) {
  try {
    const c = await catalogo.crearCategoria(req.body);
    logger.info(`Categoría creada: ${c.nombre}`);
    return ok(res, c, 201);
  } catch (e) {
    return next(e);
  }
}

export async function actualizarCategoria(req, res, next) {
  try {
    const c = await catalogo.actualizarCategoria(req.params.id, req.body);
    if (!c) return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Categoría no encontrada.'));
    return ok(res, c);
  } catch (e) {
    return next(e);
  }
}

export async function materiales(req, res, next) {
  try {
    return ok(res, await catalogo.listarMateriales(req.query.inactivas === 'true'));
  } catch (e) {
    return next(e);
  }
}

export async function crearMaterial(req, res, next) {
  try {
    const m = await catalogo.crearMaterial(req.body);
    logger.info(`Material creado: ${m.nombre}`);
    return ok(res, m, 201);
  } catch (e) {
    return next(e);
  }
}

export async function actualizarMaterial(req, res, next) {
  try {
    const m = await catalogo.actualizarMaterial(req.params.id, req.body);
    if (!m) return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Material no encontrado.'));
    return ok(res, m);
  } catch (e) {
    return next(e);
  }
}

// ---------- Auditoría y parámetros ----------
export async function auditoria(req, res, next) {
  try {
    const { tabla, accion, usuarioId, page, limit } = req.query;
    return ok(res, await auditoriaModel.listar({ tabla, accion, usuarioId, page, limit }));
  } catch (e) {
    return next(e);
  }
}

export async function listarParametros(req, res, next) {
  try {
    return ok(res, await parametros.listar());
  } catch (e) {
    return next(e);
  }
}

export async function actualizarParametro(req, res, next) {
  try {
    const p = await parametros.actualizar(req.params.clave, req.body.valor, req.body.descripcion);
    logger.info(`Parámetro '${req.params.clave}' actualizado a '${req.body.valor}'`);
    return ok(res, p);
  } catch (e) {
    return next(e);
  }
}
