// routes/carrito.js — carrito persistido en el servidor (usuario autenticado)
import { Router } from 'express';
import { obtener, sincronizar, agregar, quitar, vaciar } from '../controllers/carritoController.js';
import { validarCarritoSync, validarItemCarrito, validarIdVariante } from '../middleware/validators.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, obtener);
// Sincronización del carrito local (localStorage) al iniciar sesión
router.put('/', authRequired, validarCarritoSync, sincronizar);
router.post('/items', authRequired, validarItemCarrito, agregar);
router.delete('/items/:varianteId', authRequired, validarIdVariante, quitar);
router.delete('/', authRequired, vaciar);

export default router;
