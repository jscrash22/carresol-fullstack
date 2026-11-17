// carritoView.js — vista del panel del carrito (accesible, foco atrapado por uiComponents)
// Los items son POR VARIANTE: nombre + material + medida/talla (§7).
import { formatearPrecio } from '../models/productoModel.js';
import { crearProductoCard } from './productoCard.js';

export function renderizarCarrito(contenedor, carrito, { onQuitar, onCambiarCantidad }) {
  contenedor.textContent = '';
  carrito.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'item-carrito';

    const img = document.createElement('img');
    img.src = item.imagen || '';
    img.alt = item.alt || item.nombre;

    const info = document.createElement('div');
    info.className = 'info';
    const nombre = document.createElement('strong');
    nombre.textContent = item.nombre;
    const detalle = document.createElement('p');
    detalle.className = 'item-detalle';
    const partes = [item.material, item.medida].filter(Boolean);
    detalle.textContent = partes.length ? partes.join(' · ') : (item.sku ?? '');
    const precio = document.createElement('p');
    precio.textContent = `${formatearPrecio(item.precio)} c/u`;

    const cantidad = document.createElement('div');
    cantidad.className = 'cantidad';
    const btnMenos = document.createElement('button');
    btnMenos.textContent = '−';
    btnMenos.setAttribute('aria-label', `Quitar una unidad de ${item.nombre} ${partes.join(' ')}`);
    btnMenos.addEventListener('click', () => onCambiarCantidad(item.varianteId, -1));
    const span = document.createElement('span');
    span.textContent = String(item.cantidad);
    span.setAttribute('aria-label', `${item.cantidad} unidades`);
    const btnMas = document.createElement('button');
    btnMas.textContent = '+';
    btnMas.disabled = item.cantidad >= item.stock; // tope implícito: stock de la variante
    btnMas.setAttribute('aria-label', `Agregar una unidad de ${item.nombre} ${partes.join(' ')}`);
    btnMas.addEventListener('click', () => onCambiarCantidad(item.varianteId, 1));
    cantidad.append(btnMenos, span, btnMas);

    info.append(nombre, detalle, precio, cantidad);

    const btnQuitar = document.createElement('button');
    btnQuitar.className = 'btn-quitar';
    btnQuitar.textContent = '🗑';
    btnQuitar.setAttribute('aria-label', `Eliminar ${item.nombre} ${partes.join(' ')} del carrito`);
    btnQuitar.addEventListener('click', () => onQuitar(item.varianteId));

    div.append(img, info, btnQuitar);
    contenedor.appendChild(div);
  });
}

export function actualizarTotales(totales) {
  const set = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
  };
  set('subtotal', totales.subtotalFmt);
  set('iva', totales.ivaFmt);
  set('total', totales.totalFmt);
}

export function mostrarFechaActualizacion(fechaISO) {
  const el = document.getElementById('fecha-actualizacion');
  if (el) el.textContent = fechaISO ? new Date(fechaISO).toLocaleString('es-EC') : '—';
}

export function actualizarContadorCarrito(n) {
  const set = (id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(n);
  };
  set('cart-count');
  set('cart-count-2');
}

// ---------- Vista de favoritos ----------
export function renderizarFavoritos(contenedor, vacioEl, favoritos, { onVerDetalle, onQuitar }) {
  contenedor.textContent = '';
  vacioEl.hidden = favoritos.length > 0;
  favoritos.forEach((p) => {
    contenedor.appendChild(crearProductoCard(p, {
      onVerDetalle,
      onToggleFav: onQuitar,
      modoFavoritos: true,
    }));
  });
}

export function actualizarContadorFavoritos(n) {
  const el = document.getElementById('fav-count');
  if (el) el.textContent = String(n);
}
