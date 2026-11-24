// catalogoController.js — carga el catálogo desde la API, filtros y paginación.
// Frescura (§4.2): stale-while-revalidate con una copia PÚBLICA en localStorage.
// La copia se pinta al instante; los datos frescos llegan en segundo plano.
// Carrito y checkout SIEMPRE revalidan con la API antes de comprar.
import * as productosApi from '../models/productoModel.js';
import { toast } from '../views/uiComponents.js';
import * as vista from '../views/catalogoView.js';
import { local, sesion, CLAVES } from '../models/almacenamiento.js';

const $ = (sel) => document.querySelector(sel);
const FRESCO_MS = 30 * 1000;
const CACHE_VERSION = 1;

let productos = [];
let categoriaActual = sesion.get(CLAVES.FILTRO_CATALOGO, 'todos') || 'todos';
let paginaActual = Number(sesion.get(CLAVES.PAGINA_CATALOGO, 1)) || 1;
let cargadoEn = 0;
let callbacks = { onVerDetalle: null, onToggleFav: null };

export function getProductos() {
  return [...productos];
}

export function datosAntiguos() {
  return !cargadoEn || Date.now() - cargadoEn > FRESCO_MS;
}

export function invalidarCatalogo() {
  window.dispatchEvent(new CustomEvent('carresol:catalogo-invalidado'));
}

function leerCopia() {
  const copia = local.json(CLAVES.CATALOGO_CACHE, null);
  if (!copia || copia.version !== CACHE_VERSION || !Array.isArray(copia.productos) || !copia.productos.length) {
    return null;
  }
  return copia;
}

function guardarCopia(lista) {
  local.set(CLAVES.CATALOGO_CACHE, {
    version: CACHE_VERSION,
    fecha: Date.now(),
    // Solo información pública del catálogo: nunca carrito, sesión ni datos personales.
    productos: lista,
  });
}

function marcarActualizando(activo) {
  const aviso = $('#catalogo-actualizando');
  if (aviso) aviso.hidden = !activo;
}

export function inicializar({ onVerDetalle, onToggleFav }) {
  callbacks = { onVerDetalle, onToggleFav };
  vista.renderizarFiltros($('#filtros'), categoriaActual, (cat) => {
    categoriaActual = cat;
    paginaActual = 1;
    sesion.set(CLAVES.FILTRO_CATALOGO, cat);
    sesion.set(CLAVES.PAGINA_CATALOGO, 1);
    renderizar();
  });

  // Pintar YA la estructura: copia anterior o esqueletos (nunca un spinner que
  // bloquea la vista). La revalidación llega justo después desde la API.
  const copia = leerCopia();
  if (copia) {
    productos = copia.productos;
    cargadoEn = copia.fecha || 0;
    renderizar();
    marcarActualizando(true);
  } else {
    vista.renderizarCargando($('#grid-productos'));
  }

  // Cualquier módulo (checkout, admin) puede pedir frescura sin acoplarse.
  window.addEventListener('carresol:catalogo-invalidado', () => {
    recargarCatalogo({ silencioso: true });
  });
}

// Revalida con la API. Si hay copia, se mantiene visible mientras llega la
// respuesta; si no hay copia, se muestran esqueletos.
export async function cargarCatalogo() {
  const grid = $('#grid-productos');
  if (!leerCopia()) vista.renderizarCargando(grid);
  else marcarActualizando(true);
  try {
    productos = await productosApi.obtenerProductos();
    cargadoEn = Date.now();
    guardarCopia(productos);
    renderizar();
    window.dispatchEvent(new CustomEvent('carresol:catalogo-actualizado', { detail: getProductos() }));
    return true;
  } catch (err) {
    if (!leerCopia()) {
      vista.renderizarError(grid, err.esRed
        ? 'No se pudo conectar con el servidor.'
        : err.message, () => cargarCatalogo());
      toast(err.message, 'error');
    } else {
      toast('No se pudo actualizar el catálogo; se muestra la última copia guardada.', 'info', 5000);
    }
    return false;
  } finally {
    marcarActualizando(false);
  }
}

// Recarga en segundo plano: sin spinner de pantalla completa ni avisos si sale
// bien (§4.2). Solo se muestra un aviso si falla una recarga silenciosa.
export async function recargarCatalogo({ silencioso = true } = {}) {
  marcarActualizando(true);
  try {
    productos = await productosApi.obtenerProductos();
    cargadoEn = Date.now();
    guardarCopia(productos);
    renderizar();
    window.dispatchEvent(new CustomEvent('carresol:catalogo-actualizado', { detail: getProductos() }));
    return true;
  } catch (err) {
    if (!silencioso) {
      toast(err.message || 'No se pudo actualizar el catálogo.', 'error');
    }
    return false;
  } finally {
    marcarActualizando(false);
  }
}

function renderizar() {
  const lista = categoriaActual === 'todos'
    ? productos
    : productos.filter((p) => p.categoria === categoriaActual);
  const { pagina, totalPaginas } = vista.paginar(lista, paginaActual);
  vista.renderizarProductos($('#grid-productos'), pagina, {
    onVerDetalle: callbacks.onVerDetalle,
    onToggleFav: callbacks.onToggleFav,
  });
  vista.renderizarPaginacion($('#paginacion'), totalPaginas, paginaActual, (n) => {
    paginaActual = n;
    sesion.set(CLAVES.PAGINA_CATALOGO, n);
    renderizar();
    requestAnimationFrame(() => {
      const el = document.getElementById('catalogo');
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
}
