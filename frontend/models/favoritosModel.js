// favoritosModel.js — favoritos con doble modo (decisión de §7):
// • CON sesión: ligados a la cuenta (GET/POST/DELETE /api/favoritos); al iniciar
//   sesión se suben los favoritos locales y se adopta la lista del servidor.
// • SIN sesión: modo local del Reto 1 (localStorage, snapshot del producto).
import { api } from './apiClient.js';

const CLAVE = 'carresol_favoritos';

let favoritos = [];       // lista de productos favoritos (shape del catálogo)
let modoServidor = false; // true cuando hay sesión activa

export function inicializarFavoritos() {
  try {
    favoritos = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    if (!Array.isArray(favoritos)) favoritos = [];
  } catch (e) { favoritos = []; }
  modoServidor = false;
}

function persistirLocal() {
  try { localStorage.setItem(CLAVE, JSON.stringify(favoritos)); } catch (e) { /* nada */ }
}

export function getFavoritos() {
  return [...favoritos];
}

export function esFavorito(id) {
  return favoritos.some((p) => Number(p.id) === Number(id));
}

// Al iniciar sesión: sube los favoritos locales a la cuenta y adopta la lista
// del servidor como espejo local (siguen visibles al cerrar sesión).
export async function ligarAServidor() {
  modoServidor = true;
  const locales = [...favoritos];
  for (const p of locales) {
    try { await api.post('/favoritos', { productoId: p.id }); } catch { /* inactivo/borrado: se ignora */ }
  }
  try {
    favoritos = await api.get('/favoritos');
    persistirLocal();
  } catch { /* sin conexión: se mantiene el espejo local */ }
  return getFavoritos();
}

// Al cerrar sesión: vuelve al modo local (el espejo ya está en localStorage).
export function volverAModoLocal() {
  modoServidor = false;
}

export function enModoServidor() {
  return modoServidor;
}

// Alterna el estado de un producto. Devuelve una promesa que resuelve a
// true si quedó como favorito o false si se quitó.
export async function toggleFavorito(producto) {
  const eraFavorito = esFavorito(producto.id);
  if (modoServidor) {
    if (eraFavorito) {
      await api.delete(`/favoritos/${producto.id}`);
      favoritos = favoritos.filter((p) => Number(p.id) !== Number(producto.id));
    } else {
      await api.post('/favoritos', { productoId: producto.id });
      favoritos.push(producto); // snapshot hasta recargar la lista del servidor
    }
    persistirLocal();
    return !eraFavorito;
  }
  // Modo local (sin sesión): snapshot completo del producto para poder
  // abrir su detalle y elegir variante después.
  if (eraFavorito) {
    favoritos = favoritos.filter((p) => Number(p.id) !== Number(producto.id));
  } else {
    favoritos.push(producto);
  }
  persistirLocal();
  return !eraFavorito;
}
