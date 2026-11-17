// routes/pedidos.js — checkout y gestión de pedidos
import { Router } from 'express';
import { confirmar, mis, todos, detalle, cambiarEstado, confirmarPago, registrarEnvio } from '../controllers/pedidosController.js';
import {
  validarPedido, validarIdPedido, validarEstadoPedido, validarEnvio, validarPedidosQuery,
} from '../middleware/validators.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

// OJO: /mis-pedidos va ANTES de /:id para que no lo capture el parámetro
router.post('/', authRequired, validarPedido, confirmar);
router.get('/mis-pedidos', authRequired, mis);

// Admin: todos los pedidos
router.get('/', authRequired, requireRole('admin'), validarPedidosQuery, todos);

// Detalle (propietario o admin; anti-IDOR en el modelo)
router.get('/:id', authRequired, validarIdPedido, detalle);

// Cambio de estado (usuario: solo cancelar los suyos; admin: todos)
router.patch('/:id/estado', authRequired, validarEstadoPedido, cambiarEstado);

// Admin: confirmar pago y registrar envío
router.patch('/:id/pago', authRequired, requireRole('admin'), validarIdPedido, confirmarPago);
router.patch('/:id/envio', authRequired, requireRole('admin'), validarEnvio, registrarEnvio);

export default router;
