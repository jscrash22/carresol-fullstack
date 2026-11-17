// routes/compras.js — órdenes de compra a proveedores (solo admin)
import { Router } from 'express';
import { listar, detalle, crear, actualizar, cambiarEstado } from '../controllers/comprasController.js';
import {
  validarCompra, validarCompraUpdate, validarEstadoCompra, validarComprasQuery, validarIdCompra,
} from '../middleware/validators.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, requireRole('admin'), validarComprasQuery, listar);
router.post('/', authRequired, requireRole('admin'), validarCompra, crear);
router.get('/:id', authRequired, requireRole('admin'), validarIdCompra, detalle);
// Solo en estado borrador (regla del modelo)
router.put('/:id', authRequired, requireRole('admin'), validarIdCompra, validarCompraUpdate, actualizar);
// borrador → ordenada → recibida / cancelada (recepción idempotente en el modelo)
router.patch('/:id/estado', authRequired, requireRole('admin'), validarEstadoCompra, cambiarEstado);

export default router;
