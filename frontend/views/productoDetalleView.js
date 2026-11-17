// productoDetalleView.js — modal accesible de detalle de producto (§7):
// selector de MATERIAL y MEDIDA/TALLA (variantes), stock por variante y botón
// "Agregar al carrito" deshabilitado si no hay stock. Foco atrapado y Esc.
import { formatearPrecio } from '../models/productoModel.js';
import { esFavorito } from '../models/favoritosModel.js';
import { abrirModal, cerrarModal } from './uiComponents.js';
import { MAX_POR_VARIANTE } from '../config.js';
import { urlImagenPrincipal, altImagenPrincipal } from '../models/carritoModel.js';
import { etiquetaStock } from '../models/stockModel.js';

let modal = null;

function asegurarModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'modal-detalle';
  modal.className = 'panel-login modal-detalle';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'detalle-titulo');
  modal.hidden = true;
  document.body.appendChild(modal);
  return modal;
}

// Agrupa las variantes por material: { materialId(string): [variantes...] }
// Las claves se normalizan a String porque select.value siempre es string.
function porMaterial(variantes) {
  const grupos = new Map();
  for (const v of variantes) {
    const clave = String(v.materialId ?? v.material ?? '(sin material)');
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(v);
  }
  return grupos;
}

// Abre el detalle del producto. onAgregar(variante, producto, cantidad).
export function abrirDetalleProducto(producto, { onAgregar, onToggleFav } = {}) {
  const m = asegurarModal();
  m.textContent = '';

  const contenido = document.createElement('div');
  contenido.className = 'panel-login__contenido';

  const btnCerrar = document.createElement('button');
  btnCerrar.className = 'btn-cerrar';
  btnCerrar.setAttribute('aria-label', 'Cerrar detalle de producto');
  btnCerrar.textContent = '✕';
  btnCerrar.addEventListener('click', () => cerrarModal(m));

  const layout = document.createElement('div');
  layout.className = 'detalle-layout';

  // ---- Columna imagen ----
  const colImg = document.createElement('div');
  const img = document.createElement('img');
  img.className = 'detalle-imagen';
  img.src = urlImagenPrincipal(producto) || '';
  img.alt = altImagenPrincipal(producto) || producto.nombre;
  img.addEventListener('error', () => {
    img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400"><rect width="500" height="400" fill="%23d4af37"/><text x="50%" y="50%" fill="white" font-size="24" text-anchor="middle">Carresol</text></svg>';
  });
  colImg.appendChild(img);
  const galeria = (producto.imagenes ?? []).filter((i) => i.url !== urlImagenPrincipal(producto));
  if (galeria.length) {
    const miniaturas = document.createElement('div');
    miniaturas.className = 'detalle-miniaturas';
    for (const foto of galeria) {
      const mini = document.createElement('img');
      mini.src = foto.url;
      mini.alt = foto.altText || foto.alt || `Foto de ${producto.nombre}`;
      mini.setAttribute('role', 'button');
      mini.tabIndex = 0;
      mini.setAttribute('aria-label', `Ver ${foto.altText || foto.alt || 'otra foto'}`);
      const usar = () => { img.src = foto.url; img.alt = foto.altText || foto.alt || producto.nombre; };
      mini.addEventListener('click', usar);
      mini.addEventListener('keydown', (e) => { if (e.key === 'Enter') usar(); });
      miniaturas.appendChild(mini);
    }
    colImg.appendChild(miniaturas);
  }

  // ---- Columna datos ----
  const colDatos = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.id = 'detalle-titulo';
  h2.textContent = producto.nombre;

  const cat = document.createElement('p');
  cat.className = 'card__categoria';
  cat.textContent = `${producto.categoriaNombre || producto.categoria || ''}`;

  const desc = document.createElement('p');
  desc.textContent = producto.descripcion || '';

  colDatos.append(h2, cat, desc);

  const form = document.createElement('form');
  form.noValidate = true;

  const grupos = porMaterial(producto.variantes ?? []);
  const materiales = [...grupos.entries()];
  let selMaterial;
  let selMedida;
  let infoVariante;
  let btnAgregar;
  let cantidadInput;

  const varianteActual = () => {
    const grupo = grupos.get(selMaterial.value);
    return (grupo ?? []).find((v) => String(v.id) === selMedida.value) ?? null;
  };

  const pintarVariante = () => {
    const v = varianteActual();
    infoVariante.textContent = '';
    if (!v) return;
    const stock = Number(v.stock ?? 0);
    const estadoStock = etiquetaStock(stock, v.stockMinimo ?? 5);
    const linea1 = document.createElement('p');
    linea1.className = 'precio';
    linea1.textContent = `${formatearPrecio(v.precio)} · ${v.material}${v.medida ? ` (${v.tipoMedida === 'unica' ? 'talla única' : v.tipoMedida}: ${v.medida})` : ''}`;
    const linea2 = document.createElement('p');
    linea2.className = 'stock';
    linea2.textContent = estadoStock.texto;
    linea2.className = `stock ${estadoStock.clase}`.trim();
    const linea3 = document.createElement('p');
    linea3.className = 'ayuda-password';
    linea3.textContent = `SKU: ${v.sku ?? '—'}`;
    infoVariante.append(linea1, linea2, linea3);

    const tope = Math.min(MAX_POR_VARIANTE, stock);
    cantidadInput.max = String(Math.max(tope, 1));
    cantidadInput.value = String(Math.min(Number(cantidadInput.value) || 1, Math.max(tope, 1)));
    cantidadInput.disabled = stock <= 0;
    btnAgregar.disabled = stock <= 0;
    btnAgregar.setAttribute('aria-label', stock > 0
      ? `Agregar ${producto.nombre} (${v.material}${v.medida ? ` ${v.medida}` : ''}) al carrito`
      : `${producto.nombre} agotado`);
  };

  // Selector de material
  const campoMaterial = document.createElement('div');
  campoMaterial.className = 'campo';
  const lblMaterial = document.createElement('label');
  lblMaterial.htmlFor = 'detalle-material';
  lblMaterial.textContent = 'Material *';
  selMaterial = document.createElement('select');
  selMaterial.id = 'detalle-material';
  selMaterial.setAttribute('data-foco', '');
  materiales.forEach(([clave, grupo], i) => {
    const opt = document.createElement('option');
    opt.value = String(clave);
    opt.textContent = grupo[0]?.material ?? 'Estándar';
    selMaterial.appendChild(opt);
    if (i === 0) selMaterial.value = String(clave);
  });
  campoMaterial.append(lblMaterial, selMaterial);

  // Selector de medida/talla (se recalcula al cambiar material)
  const campoMedida = document.createElement('div');
  campoMedida.className = 'campo';
  const lblMedida = document.createElement('label');
  lblMedida.htmlFor = 'detalle-medida';
  lblMedida.textContent = 'Medida / talla *';
  selMedida = document.createElement('select');
  selMedida.id = 'detalle-medida';
  campoMedida.append(lblMedida, selMedida);

  const llenarMedidas = () => {
    selMedida.textContent = '';
    const grupo = grupos.get(selMaterial.value) ?? [];
    grupo.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = String(v.id);
      const tipo = v.tipoMedida === 'unica' ? 'única' : v.tipoMedida;
      opt.textContent = v.medida ? `${v.medida}${tipo && tipo !== 'unica' ? ` (${tipo})` : ''}` : 'Única';
      selMedida.appendChild(opt);
    });
    if (!grupo.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '—';
      selMedida.appendChild(opt);
    }
    lblMedida.textContent = `${selMedida.options.length > 1 ? 'Medida / talla *' : 'Medida / talla'}`;
    pintarVariante();
  };

  selMaterial.addEventListener('change', llenarMedidas);
  selMedida.addEventListener('change', pintarVariante);

  // Información de la variante seleccionada (región aria-live)
  infoVariante = document.createElement('div');
  infoVariante.className = 'detalle-info-variante';
  infoVariante.setAttribute('role', 'status');
  infoVariante.setAttribute('aria-live', 'polite');

  // Cantidad
  const campoCantidad = document.createElement('div');
  campoCantidad.className = 'campo campo-cantidad';
  const lblCantidad = document.createElement('label');
  lblCantidad.htmlFor = 'detalle-cantidad';
  lblCantidad.textContent = 'Cantidad';
  cantidadInput = document.createElement('input');
  cantidadInput.type = 'number';
  cantidadInput.id = 'detalle-cantidad';
  cantidadInput.min = '1';
  cantidadInput.max = '10';
  cantidadInput.value = '1';
  cantidadInput.required = true;
  campoCantidad.append(lblCantidad, cantidadInput);

  // Acciones
  const acciones = document.createElement('div');
  acciones.className = 'acciones';

  btnAgregar = document.createElement('button');
  btnAgregar.type = 'submit';
  btnAgregar.className = 'btn btn-dorado';
  btnAgregar.textContent = 'Agregar al carrito';
  acciones.appendChild(btnAgregar);

  const btnFav = document.createElement('button');
  btnFav.type = 'button';
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
    } catch { /* notificado arriba */ }
    btnFav.disabled = false;
  });
  acciones.appendChild(btnFav);

  form.append(campoMaterial, campoMedida, infoVariante, campoCantidad, acciones);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = varianteActual();
    const cantidad = Math.max(1, Number(cantidadInput.value) || 1);
    if (!v || Number(v.stock) <= 0) return;
    onAgregar(v, producto, cantidad);
    cerrarModal(m);
  });

  colDatos.appendChild(form);
  layout.append(colImg, colDatos);
  contenido.append(btnCerrar, layout);
  m.appendChild(contenido);

  llenarMedidas();
  abrirModal(m, document.activeElement);
  return m;
}
