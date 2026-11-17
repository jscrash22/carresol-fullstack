// rateLimit.js — límites de peticiones para rutas sensibles (login y registro)
import rateLimit from 'express-rate-limit';
import { fallo, CODIGOS } from '../utils/respuestas.js';

function limiteAuth() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 20, // 20 intentos por ventana por IP
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: 'Demasiados intentos.',
    handler: (req, res) =>
      fallo(res, CODIGOS.LIMITE.status, CODIGOS.LIMITE.codigo,
        'Demasiados intentos desde esta IP. Espera 15 minutos y vuelve a intentar.'),
  });
}

// Recuperación de contraseña: más estricto que login/registro (genera tokens)
function limiteRecuperacion() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10, // 10 por ventana por IP
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) =>
      fallo(res, CODIGOS.LIMITE.status, CODIGOS.LIMITE.codigo,
        'Demasiadas solicitudes de recuperación. Espera 15 minutos y vuelve a intentar.'),
  });
}

export const limiteLogin = limiteAuth();
export const limiteRegistro = limiteAuth();
export const limiteReset = limiteRecuperacion();
