// routes/inventario.js — consultas de inventario (solo admin)
import { Router } from 'express';
import { stockBajo, movimientos } from '../controllers/comprasController.js';
import { validarInventarioQuery } from '../middleware/validators.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

// Variantes en stock mínimo (sugerencia de reposición)
router.get('/stock-bajo', authRequired, requireRole('admin'), stockBajo);
// Kardex: movimientos de venta/compra/ajuste/devolución
router.get('/movimientos', authRequired, requireRole('admin'), validarInventarioQuery, movimientos);

export default router;
