// catalogoView.js — vista del catálogo: filtros, grid, paginación y estados
import { crearProductoCard } from './productoCard.js';
import { spinner } from './uiComponents.js';
import { CATEGORIAS } from '../models/productoModel.js';

const POR_PAGINA = 8;

export function renderizarFiltros(contenedor, categoriaActual, onFiltrar) {
  contenedor.textContent = '';
  CATEGORIAS.forEach((cat) => {
    const b = document.createElement('button');
    b.className = `filtro${cat.id === categoriaActual ? ' activo' : ''}`;
    b.textContent = cat.etiqueta;
    b.dataset.categoria = cat.id;
    b.setAttribute('aria-pressed', String(cat.id === categoriaActual));
    b.addEventListener('click', () => onFiltrar(cat.id));
    contenedor.appendChild(b);
  });
}

export function renderizarCargando(grid) {
  grid.textContent = '';
  grid.appendChild(spinner('Cargando el catálogo…'));
}

export function renderizarError(grid, mensaje, onReintentar) {
  grid.textContent = '';
  const caja = document.createElement('div');
  caja.className = 'estado-error';
  caja.setAttribute('role', 'alert');
  const p = document.createElement('p');
  p.textContent = mensaje;
  const b = document.createElement('button');
  b.className = 'btn btn-dorado';
  b.textContent = 'Reintentar';
  b.addEventListener('click', onReintentar);
  caja.append(p, b);
  grid.appendChild(caja);
}

export function renderizarVacio(grid, texto) {
  grid.textContent = '';
  const p = document.createElement('p');
  p.className = 'mensaje-vacio';
  p.textContent = texto;
  grid.appendChild(p);
}

export function renderizarProductos(grid, pagina, { onVerDetalle, onToggleFav }) {
  grid.textContent = '';
  pagina.forEach((p) => {
    grid.appendChild(crearProductoCard(p, { onVerDetalle, onToggleFav }));
  });
}

export function renderizarPaginacion(nav, totalPaginas, paginaActual, onIr) {
  nav.textContent = '';
  if (totalPaginas <= 1) return;

  const crear = (texto, destino, deshabilitado, aria) => {
    const b = document.createElement('button');
    b.textContent = texto;
    b.disabled = deshabilitado;
    if (aria) b.setAttribute('aria-label', aria);
    if (!deshabilitado) b.addEventListener('click', () => onIr(destino));
    return b;
  };

  nav.appendChild(crear('« Anterior', paginaActual - 1, paginaActual === 1, 'Página anterior'));
  for (let i = 1; i <= totalPaginas; i++) {
    const b = crear(String(i), i, false, `Página ${i}`);
    b.classList.toggle('activo', i === paginaActual);
    b.setAttribute('aria-current', i === paginaActual ? 'page' : 'false');
    nav.appendChild(b);
  }
  nav.appendChild(crear('Siguiente »', paginaActual + 1, paginaActual === totalPaginas, 'Página siguiente'));
}

export function paginar(lista, paginaActual) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pagina = Math.min(paginaActual, totalPaginas);
  const inicio = (pagina - 1) * POR_PAGINA;
  return { pagina: lista.slice(inicio, inicio + POR_PAGINA), totalPaginas };
}
