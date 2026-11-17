// rateLimit.js — límites de peticiones para rutas sensibles.
//
// Configurables por entorno para una demo con toda una clase detrás de la misma IP:
//   RATE_LOGIN_MAX     (default 20, ventana 15 min; SOLO cuentan los fallos)
//   RATE_REGISTER_MAX  (default 20, ventana 1 hora)
//   RATE_CONTACTO_MAX  (default 10, ventana 1 hora)
//   RATE_RESET_MAX     (default 10, ventana 15 min)
import rateLimit from 'express-rate-limit';
import { fallo, CODIGOS } from '../utils/respuestas.js';

function maximo(nombre, valorPorDefecto) {
  const valor = Number(process.env[nombre]);
  return Number.isInteger(valor) && valor > 0 ? valor : valorPorDefecto;
}

function limite({ nombre, ventanaMs, maximoLlamadas, mensaje, opciones = {} }) {
  return rateLimit({
    windowMs: ventanaMs,
    limit: maximo(nombre, maximoLlamadas),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) =>
      fallo(res, CODIGOS.LIMITE.status, CODIGOS.LIMITE.codigo, mensaje),
    ...opciones,
  });
}

const QUINCE_MIN = 15 * 60 * 1000;
const UNA_HORA = 60 * 60 * 1000;
const MSG_ESPERA = 'Demasiados intentos desde esta IP. Espera un momento y vuelve a intentar.';

// Login: un inicio de sesión CORRECTO no consume el cupo (skipSuccessfulRequests).
export const limiteLogin = limite({
  nombre: 'RATE_LOGIN_MAX',
  ventanaMs: QUINCE_MIN,
  maximoLlamadas: 20,
  mensaje: MSG_ESPERA,
  opciones: { skipSuccessfulRequests: true },
});

export const limiteRegistro = limite({
  nombre: 'RATE_REGISTER_MAX',
  ventanaMs: UNA_HORA,
  maximoLlamadas: 20,
  mensaje: MSG_ESPERA,
});

// Recuperación de contraseña: más estricto (genera tokens de un solo uso).
export const limiteReset = limite({
  nombre: 'RATE_RESET_MAX',
  ventanaMs: QUINCE_MIN,
  maximoLlamadas: 10,
  mensaje: 'Demasiadas solicitudes de recuperación. Espera 15 minutos y vuelve a intentar.',
});

// Contacto público: evita inundar la bandeja de mensajes.
export const limiteContacto = limite({
  nombre: 'RATE_CONTACTO_MAX',
  ventanaMs: UNA_HORA,
  maximoLlamadas: 10,
  mensaje: 'Demasiados mensajes de contacto. Espera una hora y vuelve a intentar.',
});
