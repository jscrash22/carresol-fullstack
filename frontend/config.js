// config.js — configuración del frontend de Carresol

// URL base de la API en producción.
// EDITA esta constante cuando la API esté desplegada en Render, por ejemplo:
//   export const API_PROD_URL = 'https://carresol-api.onrender.com/api';
// Debe terminar en /api (sin barra final) y coincidir con CORS_ORIGIN del backend.
export const API_PROD_URL = 'https://carresol-api.onrender.com/api';

// En local (localhost o 127.0.0.1) se usa el backend de desarrollo; en cualquier
// otro host (GitHub Pages, dominio propio…) se usa la URL de producción.
const ES_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
export const API_BASE_URL = ES_LOCAL ? 'http://localhost:3000/api' : API_PROD_URL;

// IVA aplicado por el servidor al confirmar pedidos (debe coincidir con server/models/pedidoModel.js)
export const IVA = 0.15;

// Costo de envío estándar que muestra el checkout como ESTIMADO; el valor
// definitivo lo calcula el servidor (parámetro costo_envio_default).
export const ENVIO_ESTIMADO = 10;

// No hay tope fijo de 10: el límite lo decide el stock real de cada variante
// (frontend: carritoModel.js; backend: validators.js y pedidoModel.js).
