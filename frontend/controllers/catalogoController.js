// catalogoController.js — carga el catálogo desde la API, filtros y paginación.
// Frescura (§4.2): expone recargarCatalogo({ silencioso }), el evento
// `carresol:catalogo-invalidado` y registra cuándo se cargaron los datos.
// El estado de filtro/página vive en sessionStorage: una pestaña nueva arranca
// limpia; el hash sigue decidiendo la vista visible.
import * as productosApi from '../models/productoModel.js';
import { toast } from '../views/uiComponents.js';
import * as vista from '../views/catalogoView.js';
import { sesion, CLAVES } from '../models/almacenamiento.js';

const $ = (sel) => document.querySelector(sel);
const FRESCO_MS = 30 * 1000;

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

export function inicializar({ onVerDetalle, onToggleFav }) {
  callbacks = { onVerDetalle, onToggleFav };
  vista.renderizarFiltros($('#filtros'), categoriaActual, (cat) => {
    categoriaActual = cat;
    paginaActual = 1;
    sesion.set(CLAVES.FILTRO_CATALOGO, cat);
    sesion.set(CLAVES.PAGINA_CATALOGO, 1);
    renderizar();
  });

  // Cualquier módulo (checkout, admin) puede pedir frescura sin acoplarse.
  window.addEventListener('carresol:catalogo-invalidado', () => {
    recargarCatalogo({ silencioso: true });
  });
}

export async function cargarCatalogo() {
  const grid = $('#grid-productos');
  vista.renderizarCargando(grid);
  try {
    productos = await productosApi.obtenerProductos();
    cargadoEn = Date.now();
    renderizar();
    window.dispatchEvent(new CustomEvent('carresol:catalogo-actualizado', { detail: getProductos() }));
  } catch (err) {
    vista.renderizarError(grid, err.esRed
      ? 'No se pudo conectar con el servidor.'
      : err.message, () => cargarCatalogo());
    toast(err.message, 'error');
  }
}

// Recarga en segundo plano: sin spinner de pantalla completa ni avisos si sale
// bien (§4.2). Solo se muestra un aviso si falla una recarga silenciosa.
export async function recargarCatalogo({ silencioso = true } = {}) {
  try {
    productos = await productosApi.obtenerProductos();
    cargadoEn = Date.now();
    renderizar();
    window.dispatchEvent(new CustomEvent('carresol:catalogo-actualizado', { detail: getProductos() }));
    return true;
  } catch (err) {
    if (!silencioso) {
      toast(err.message || 'No se pudo actualizar el catálogo.', 'error');
    }
    return false;
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
