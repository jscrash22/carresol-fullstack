// pedidosController.js — checkout transaccional + gestión de pedidos
import * as pedidos from '../models/pedidoModel.js';
import { ok, fallo, ApiError, CODIGOS } from '../utils/respuestas.js';
import { logger } from '../utils/logger.js';

// POST /api/pedidos — confirmar el carrito y crear el pedido completo
export async function confirmar(req, res, next) {
  try {
    const pedido = await pedidos.crearPedido(req.usuario.id, req.body);
    logger.info(`Pedido #${pedido.numeroPedido} (id ${pedido.id}) creado por ${req.usuario.email} — total $${pedido.total.toFixed(2)}, factura ${pedido.factura?.numero}`);
    return ok(res, pedido, 201);
  } catch (e) {
    return next(e);
  }
}

// GET /api/pedidos/mis-pedidos — pedidos del usuario autenticado
export async function mis(req, res, next) {
  try {
    const lista = await pedidos.misPedidos(req.usuario.id);
    return ok(res, lista);
  } catch (e) {
    return next(e);
  }
}

// GET /api/pedidos — todos los pedidos (solo admin)
export async function todos(req, res, next) {
  try {
    const lista = await pedidos.todosLosPedidos({ estado: req.query.estado });
    return ok(res, lista);
  } catch (e) {
    return next(e);
  }
}

// GET /api/pedidos/:id — detalle (propietario o admin; anti-IDOR en el modelo)
export async function detalle(req, res, next) {
  try {
    const pedido = await pedidos.pedidoPorId(req.params.id, {
      usuarioId: req.usuario.id,
      esAdmin: req.usuario.role === 'admin',
    });
    if (!pedido) {
      return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Pedido no encontrado.'));
    }
    return ok(res, pedido);
  } catch (e) {
    return next(e);
  }
}

// PATCH /api/pedidos/:id/estado — cambio de estado
// (admin: todos; usuario: solo cancelar los suyos antes del envío)
export async function cambiarEstado(req, res, next) {
  try {
    const esAdmin = req.usuario.role === 'admin';

    // Verificación de pertenencia (anti-IDOR) para usuarios no admin
    const pedido = await pedidos.pedidoPorId(req.params.id, {
      usuarioId: req.usuario.id,
      esAdmin,
    });
    if (!pedido) {
      return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Pedido no encontrado.'));
    }

    if (!esAdmin && req.body.estado !== 'cancelado') {
      return fallo(res, CODIGOS.PROHIBIDO.status, CODIGOS.PROHIBIDO.codigo,
        'Solo puedes cancelar tus propios pedidos; el resto de estados los gestiona la tienda.');
    }

    const actualizado = await pedidos.cambiarEstado(
      req.params.id, req.body.estado, req.usuario.id, req.body.comentario,
    );
    if (!actualizado) {
      return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Pedido no encontrado.'));
    }
    logger.info(`Pedido #${actualizado.numeroPedido} → ${actualizado.estado} (por ${req.usuario.email})`);
    return ok(res, actualizado);
  } catch (e) {
    return next(e);
  }
}

// PATCH /api/pedidos/:id/pago — confirmar pago (admin)
export async function confirmarPago(req, res, next) {
  try {
    const actualizado = await pedidos.confirmarPago(req.params.id, req.usuario.id);
    if (!actualizado) {
      return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Pedido no encontrado.'));
    }
    logger.info(`Pago del pedido #${actualizado.numeroPedido} confirmado por ${req.usuario.email}`);
    return ok(res, actualizado);
  } catch (e) {
    return next(e);
  }
}

// PATCH /api/pedidos/:id/envio — registrar/despachar envío (admin)
export async function registrarEnvio(req, res, next) {
  try {
    const actualizado = await pedidos.registrarEnvio(req.params.id, req.body, req.usuario.id);
    if (!actualizado) {
      return next(new ApiError(CODIGOS.NO_ENCONTRADO, 'Pedido no encontrado.'));
    }
    logger.info(`Envío del pedido #${actualizado.numeroPedido} actualizado (${actualizado.envio?.estado})`);
    return ok(res, actualizado);
  } catch (e) {
    return next(e);
  }
}
