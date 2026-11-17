// routes/contacto.js — formulario de contacto (público) + bandeja (admin)
import { Router } from 'express';
import { enviar, bandeja, marcarLeido } from '../controllers/contactoController.js';
import { validarContacto, validarContactoQuery, validarIdMensaje } from '../middleware/validators.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { limiteContacto } from '../middleware/rateLimit.js';

const router = Router();

// Público: enviar mensaje (con o sin sesión)
router.post('/', limiteContacto, validarContacto, enviar);

// Admin: bandeja de mensajes
router.get('/', authRequired, requireRole('admin'), validarContactoQuery, bandeja);
router.patch('/:id/leido', authRequired, requireRole('admin'), validarIdMensaje, marcarLeido);

export default router;
