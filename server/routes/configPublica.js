// routes/configPublica.js — configuración pública de solo lectura
import { Router } from 'express';
import { publica } from '../controllers/configPublicaController.js';

const router = Router();
router.get('/', publica);

export default router;
