// apiClient.js — fetch centralizado: token, parseo consistente y errores tipificados
// Tipos de error manejados: red caída, 401 (sesión vencida), 403, 404, 422, 500 y otros.
import { API_BASE_URL } from '../config.js';

const CLAVE_TOKEN = 'carresol_token';
const CLAVE_USUARIO = 'carresol_usuario';

// ---- Sesión (token en sessionStorage; decisión y riesgo documentados en el README) ----
export function guardarSesion(token, usuario) {
  try {
    sessionStorage.setItem(CLAVE_TOKEN, token);
    sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
  } catch (e) { console.error('No se pudo guardar la sesión:', e); }
}

export function leerSesion() {
  try {
    const token = sessionStorage.getItem(CLAVE_TOKEN);
    const usuario = JSON.parse(sessionStorage.getItem(CLAVE_USUARIO) || 'null');
    return token ? { token, usuario } : null;
  } catch (e) { return null; }
}

export function borrarSesion() {
  try {
    sessionStorage.removeItem(CLAVE_TOKEN);
    sessionStorage.removeItem(CLAVE_USUARIO);
  } catch (e) { /* nada */ }
}

export function getToken() {
  return sessionStorage.getItem(CLAVE_TOKEN);
}

// ---- Errores tipificados para que la UI siempre muestre un mensaje claro ----
export class ApiError extends Error {
  constructor(mensaje, { status, codigo, detalles } = {}) {
    super(mensaje);
    this.status = status || 0;
    this.codigo = codigo || 'SIN_CODIGO';
    this.detalles = detalles;
    // Red caída / servidor abajo: fallo de fetch (sin status) o código RED
    this.esRed = status === 0 || codigo === 'RED';
  }
}

// ---- Plan gratis de Render: la API se duerme tras ~15 min sin uso ----
// La primera petición puede tardar hasta ~1 min. Para los GET (idempotentes)
// se reintenta con espera creciente y se avisa en una región aria-live.
const ES_LOCAL = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
const REINTENTOS_GET = 3;
const ESPERAS_MS = [0, 4000, 12000]; // antes del 1.º, 2.º y 3.er intento
const TIEMPO_MAX_INTENTO_MS = 25000;

let avisoDespertar = null;

function mostrarAvisoDespertar() {
  if (typeof document === 'undefined') return;
  if (!avisoDespertar) {
    avisoDespertar = document.createElement('p');
    avisoDespertar.id = 'aviso-servidor-despertando';
    avisoDespertar.className = 'aviso-despertar';
    avisoDespertar.setAttribute('role', 'status');
    avisoDespertar.setAttribute('aria-live', 'polite');
    document.body.appendChild(avisoDespertar);
  }
  avisoDespertar.textContent = 'El servidor está despertando, puede tardar hasta un minuto…';
  avisoDespertar.hidden = false;
}

function ocultarAvisoDespertar() {
  if (avisoDespertar) {
    avisoDespertar.hidden = true;
    avisoDespertar.textContent = '';
  }
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

async function pedir(metodo, ruta, cuerpo) {
  const token = getToken();
  const puedeReintentar = metodo === 'GET' && !ES_LOCAL;
  const intentos = puedeReintentar ? REINTENTOS_GET : 1;
  let res = null;

  for (let intento = 0; intento < intentos; intento += 1) {
    if (intento > 0) {
      mostrarAvisoDespertar();
      await esperar(ESPERAS_MS[intento] || 12000);
    }
    try {
      res = await fetch(API_BASE_URL + ruta, {
        method: metodo,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        // Un intento no puede quedarse colgado indefinidamente mientras despierta.
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(TIEMPO_MAX_INTENTO_MS)
          : undefined,
      });
      break;
    } catch (e) {
      // Último intento: propagar el error de red tipificado
      if (intento === intentos - 1) {
        ocultarAvisoDespertar();
        throw new ApiError('No se pudo conectar con el servidor. Verifica que la API esté levantada.', { codigo: 'RED' });
      }
    }
  }
  ocultarAvisoDespertar();

  let json = null;
  try { json = await res.json(); } catch { /* cuerpo no JSON */ }

  if (res.ok && json?.ok) return json.data;

  const error = json?.error || {};
  const mensaje = error.mensaje || `Error ${res.status}`;

  if (res.status === 401) {
    // Sesión vencida o inválida: cerrar sesión local antes de propagar
    borrarSesion();
    // Aviso global para que el router redirija al login con un mensaje claro
    try { window.dispatchEvent(new CustomEvent('carresol:sesion-expirada')); } catch { /* sin DOM */ }
  }
  throw new ApiError(mensaje, { status: res.status, codigo: error.codigo, detalles: error.detalles });
}

export const api = {
  get: (ruta) => pedir('GET', ruta),
  post: (ruta, cuerpo) => pedir('POST', ruta, cuerpo),
  put: (ruta, cuerpo) => pedir('PUT', ruta, cuerpo),
  patch: (ruta, cuerpo) => pedir('PATCH', ruta, cuerpo),
  delete: (ruta) => pedir('DELETE', ruta),
};
