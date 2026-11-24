// productoCard.js — tarjeta de producto reutilizable (catálogo y favoritos)
// Construida 100% con DOM APIs: previene XSS ante datos de la API.
// Muestra categoría, rango de precios e imagen principal (§7); la compra por
// variante se hace desde el detalle ("Ver detalle").
import { rangoPrecios } from '../models/productoModel.js';
import { esFavorito } from '../models/favoritosModel.js';
import { urlImagenPrincipal, altImagenPrincipal } from '../models/carritoModel.js';
import { etiquetaStock } from '../models/stockModel.js';

export function crearProductoCard(producto, { onVerDetalle, onToggleFav, modoFavoritos = false } = {}) {
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('aria-label', producto.nombre);

  // Imagen con alt descriptivo y fallback de error
  const img = document.createElement('img');
  img.src = urlImagenPrincipal(producto) || '';
  img.alt = altImagenPrincipal(producto) || producto.nombre;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = 500;
  img.height = 400;
  img.addEventListener('error', () => {
    img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400"><rect width="500" height="400" fill="%23d4af37"/><text x="50%" y="50%" fill="white" font-size="24" text-anchor="middle">Carresol</text></svg>';
  });
  img.addEventListener('click', (e) => onVerDetalle?.(producto, e.currentTarget));
  img.setAttribute('role', 'button');
  img.tabIndex = 0;
  img.setAttribute('aria-label', `Ver detalle de ${producto.nombre}`);
  img.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onVerDetalle?.(producto, e.currentTarget); }
  });

  const cuerpo = document.createElement('div');
  cuerpo.className = 'card__cuerpo';

  const categoria = document.createElement('p');
  categoria.className = 'card__categoria';
  categoria.textContent = producto.categoriaNombre || producto.categoria || '';

  const h3 = document.createElement('h3');
  h3.textContent = producto.nombre;

  const desc = document.createElement('p');
  desc.textContent = producto.descripcion || '';

  const precio = document.createElement('p');
  precio.className = 'precio';
  precio.textContent = rangoPrecios(producto);

  const stock = document.createElement('p');
  const estadoStock = etiquetaStock(producto.stock, 5);
  stock.className = `stock ${estadoStock.clase}`.trim();
  const nVariantes = (producto.variantes ?? []).length;
  stock.textContent = estadoStock.texto + (nVariantes > 1 ? ` · ${nVariantes} variantes` : '');

  const acciones = document.createElement('div');
  acciones.className = 'acciones';

  const btnVer = document.createElement('button');
  btnVer.className = 'btn btn-dorado';
  btnVer.textContent = 'Ver detalle';
  btnVer.setAttribute('aria-label', `Ver detalle de ${producto.nombre}`);
  btnVer.disabled = estadoStock.agotado && !nVariantes; // sin variantes visibles no hay nada que elegir
  btnVer.addEventListener('click', (e) => onVerDetalle?.(producto, e.currentTarget));
  acciones.appendChild(btnVer);

  if (!modoFavoritos) {
    const btnFav = document.createElement('button');
    btnFav.className = `btn-fav${esFavorito(producto.id) ? ' activo' : ''}`;
    btnFav.textContent = esFavorito(producto.id) ? '♥' : '♡';
    btnFav.setAttribute('aria-label', `Marcar ${producto.nombre} como favorito`);
    btnFav.setAttribute('aria-pressed', String(esFavorito(producto.id)));
    btnFav.addEventListener('click', async () => {
      btnFav.disabled = true;
      try {
        const ahora = await onToggleFav(producto);
        btnFav.textContent = ahora ? '♥' : '♡';
        btnFav.classList.toggle('activo', ahora);
        btnFav.setAttribute('aria-pressed', String(ahora));
      } catch { /* el error ya se notifica al usuario */ }
      btnFav.disabled = false;
    });
    card.appendChild(btnFav);
  } else {
    const btnQuitar = document.createElement('button');
    btnQuitar.className = 'btn btn-mini btn-rojo';
    btnQuitar.textContent = 'Quitar';
    btnQuitar.setAttribute('aria-label', `Quitar ${producto.nombre} de favoritos`);
    btnQuitar.addEventListener('click', async () => {
      btnQuitar.disabled = true;
      try { await onToggleFav(producto); } catch { /* el error ya se notifica al usuario */ }
      btnQuitar.disabled = false;
    });
    acciones.appendChild(btnQuitar);
  }

  cuerpo.append(categoria, h3, desc, precio, stock, acciones);
  card.append(img, cuerpo);
  return card;
}
