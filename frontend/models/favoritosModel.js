// favoritosModel.js — favoritos con doble modo (decisión de §7):
// • CON sesión: ligados a la cuenta (GET/POST/DELETE /api/favoritos); al iniciar
//   sesión se suben los favoritos locales SOLO si el dueño era `invitado`.
// • SIN sesión: modo local (localStorage, snapshot del producto).
// Todo el acceso a almacenamiento pasa por almacenamiento.js (§4.1).
import { api } from './apiClient.js';
import { local, CLAVES } from './almacenamiento.js';

let favoritos = [];       // lista de productos favoritos (shape del catálogo)
let modoServidor = false; // true cuando hay sesión activa

export function inicializarFavoritos() {
  const datos = local.json(CLAVES.FAVORITOS, []);
  favoritos = Array.isArray(datos) ? datos.filter((p) => p && p.id) : [];
  if (!local.get(CLAVES.FAVORITOS_DUENO)) local.set(CLAVES.FAVORITOS_DUENO, 'invitado');
  modoServidor = false;
  return getFavoritos();
}

function persistirLocal() {
  local.set(CLAVES.FAVORITOS, favoritos);
}

export function getFavoritos() {
  return [...favoritos];
}

export function esFavorito(id) {
  return favoritos.some((p) => Number(p.id) === Number(id));
}

export function getDueno() {
  return local.get(CLAVES.FAVORITOS_DUENO, 'invitado') || 'invitado';
}

export function setDueno(dueno) {
  local.set(CLAVES.FAVORITOS_DUENO, dueno || 'invitado');
}

// Cierre de sesión de un usuario: se descarta el espejo local (era suyo).
export function descartarPorCierreDeSesion() {
  favoritos = [];
  setDueno('invitado');
  persistirLocal();
}

export function recargarDesdeAlmacenamiento() {
  const datos = local.json(CLAVES.FAVORITOS, []);
  favoritos = Array.isArray(datos) ? datos.filter((p) => p && p.id) : [];
  return getFavoritos();
}

export function escucharCambios(callback) {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.endsWith(CLAVES.FAVORITOS)) {
      callback(recargarDesdeAlmacenamiento());
    }
  });
}

// Al iniciar sesión con dueño `invitado`: sube los favoritos locales a la cuenta
// y adopta la lista del servidor como espejo local.
export async function ligarAServidor() {
  modoServidor = true;
  const locales = [...favoritos];
  for (const p of locales) {
    try { await api.post('/favoritos', { productoId: p.id }); } catch { /* ya existe / inactivo */ }
  }
  try {
    favoritos = await api.get('/favoritos');
    persistirLocal();
  } catch { /* sin conexión: se mantiene el espejo local */ }
  return getFavoritos();
}

// Si el dueño era OTRO usuario, no se sube nada: se descarta y se adopta la
// lista del servidor para el usuario que acaba de entrar.
export async function adoptarDelServidor() {
  modoServidor = true;
  try {
    favoritos = await api.get('/favoritos');
  } catch {
    favoritos = [];
  }
  persistirLocal();
  return getFavoritos();
}

export function volverAModoLocal() {
  modoServidor = false;
}

export function enModoServidor() {
  return modoServidor;
}

export async function toggleFavorito(producto) {
  const eraFavorito = esFavorito(producto.id);
  if (modoServidor) {
    if (eraFavorito) {
      await api.delete(`/favoritos/${producto.id}`);
      favoritos = favoritos.filter((p) => Number(p.id) !== Number(producto.id));
    } else {
      await api.post('/favoritos', { productoId: producto.id });
      favoritos.push(producto);
    }
    persistirLocal();
    return !eraFavorito;
  }
  if (eraFavorito) {
    favoritos = favoritos.filter((p) => Number(p.id) !== Number(producto.id));
  } else {
    favoritos.push(producto);
  }
  persistirLocal();
  return !eraFavorito;
}
