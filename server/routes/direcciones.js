// routes/direcciones.js — direcciones de envío del usuario autenticado
import { Router } from 'express';
import { listar, crear, actualizar, eliminar } from '../controllers/direccionesController.js';
import { validarIdDireccion, validarDireccion, validarDireccionParcial } from '../middleware/validators.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, listar);
router.post('/', authRequired, validarDireccion, crear);
router.put('/:id', authRequired, validarIdDireccion, validarDireccionParcial, actualizar);
router.delete('/:id', authRequired, validarIdDireccion, eliminar);

export default router;
