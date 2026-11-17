// routes/auth.js — rutas de autenticación
import { Router } from 'express';
import { registrar, login, me, solicitarReset, restablecerPassword } from '../controllers/authController.js';
import { validarRegistro, validarLogin, validarForgotPassword, validarResetPassword } from '../middleware/validators.js';
import { limiteLogin, limiteRegistro, limiteReset } from '../middleware/rateLimit.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/register', limiteRegistro, validarRegistro, registrar);
router.post('/login', limiteLogin, validarLogin, login);
router.get('/me', authRequired, me);
// P2 — recuperación de contraseña (token con hash en BD, 30 min, un solo uso)
router.post('/forgot-password', limiteReset, validarForgotPassword, solicitarReset);
router.post('/reset-password', limiteReset, validarResetPassword, restablecerPassword);

export default router;
