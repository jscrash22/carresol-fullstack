// routes/proveedores.js — CRUD de proveedores (solo admin)
import { Router } from 'express';
import { listarProveedores, crearProveedor, actualizarProveedor, eliminarProveedor } from '../controllers/comprasController.js';
import { validarProveedor, validarProveedorParcial, validarIdProveedor } from '../middleware/validators.js';
import { authRequired, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, requireRole('admin'), listarProveedores);
router.post('/', authRequired, requireRole('admin'), validarProveedor, crearProveedor);
router.put('/:id', authRequired, requireRole('admin'), validarIdProveedor, validarProveedorParcial, actualizarProveedor);
router.delete('/:id', authRequired, requireRole('admin'), validarIdProveedor, eliminarProveedor);

export default router;
