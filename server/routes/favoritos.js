// routes/favoritos.js — favoritos del usuario autenticado
import { Router } from 'express';
import { listar, agregar, quitar } from '../controllers/favoritosController.js';
import { validarFavorito, validarIdFavorito } from '../middleware/validators.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, listar);
router.post('/', authRequired, validarFavorito, agregar);
router.delete('/:productoId', authRequired, validarIdFavorito, quitar);

export default router;
