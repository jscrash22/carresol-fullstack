// routes/productos.js — catálogo público (lectura) + CRUD admin (escritura)
import { Router } from 'express';
import { listar, obtener, crear, actualizar, eliminar } from '../controllers/productosController.js';
import { validarCategoriaQuery, validarIdProducto, validarProducto, validarProductoParcial } from '../middleware/validators.js';
import { authRequired, requireRole, authOpcional } from '../middleware/auth.js';

const router = Router();

// Público (authOpcional permite ?inactivos=true solo a admins)
router.get('/', authOpcional, validarCategoriaQuery, listar);
router.get('/:id', validarIdProducto, obtener);

// Admin
router.post('/', authRequired, requireRole('admin'), validarProducto, crear);
router.put('/:id', authRequired, requireRole('admin'), validarIdProducto, validarProductoParcial, actualizar);
router.delete('/:id', authRequired, requireRole('admin'), validarIdProducto, eliminar);

export default router;
