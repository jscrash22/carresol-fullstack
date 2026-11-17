// catalogoController.js — carga el catálogo desde la API, filtros y paginación
// Las tarjetas abren el DETALLE de producto (§7); el favorito lo gestiona
// carritoController para mantener los paneles en un solo orquestador.
import * as productosApi from '../models/productoModel.js';
import { toast } from '../views/uiComponents.js';
import * as vista from '../views/catalogoView.js';

const $ = (sel) => document.querySelector(sel);

let productos = [];
let categoriaActual = 'todos';
let paginaActual = 1;
let callbacks = { onVerDetalle: null, onToggleFav: null };

export function getProductos() {
  return [...productos];
}

export function inicializar({ onVerDetalle, onToggleFav }) {
  callbacks = { onVerDetalle, onToggleFav };
  vista.renderizarFiltros($('#filtros'), categoriaActual, (cat) => {
    categoriaActual = cat;
    paginaActual = 1;
    renderizar();
  });
}

export async function cargarCatalogo() {
  const grid = $('#grid-productos');
  vista.renderizarCargando(grid);
  try {
    productos = await productosApi.obtenerProductos();
    renderizar();
  } catch (err) {
    vista.renderizarError(grid, err.esRed
      ? 'No se pudo conectar con el servidor.'
      : err.message, () => cargarCatalogo());
    toast(err.message, 'error');
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
    renderizar();
    requestAnimationFrame(() => {
      const el = document.getElementById('catalogo');
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
}
