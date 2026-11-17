// adminView.js — panel de administración (§7): 11 pestañas ARIA (Resumen,
// Productos con variantes, Categorías/Materiales, Pedidos con acciones de
// estado/pago/envío, Usuarios, Proveedores, Compras, Inventario, Mensajes,
// Parámetros y Auditoría). Solo pinta; adminController orquesta.
// Regla anti-XSS: todo con createElement/textContent, nunca innerHTML.
import { abrirModal, cerrarModal, spinner } from './uiComponents.js';
import { formatearPrecio } from '../models/productoModel.js';
import { urlImagenPrincipal, altImagenPrincipal } from '../models/carritoModel.js';

// Miniatura reutilizable para tablas administrativas. Nunca se renderiza una
// URL sin alt; si falla la carga se sustituye por texto accesible.
function miniatura(producto, clase = 'mini-producto') {
  const url = urlImagenPrincipal(producto)
    || (typeof producto?.url === 'string' ? producto.url : null);
  if (!url) return el('span', `${clase} mini-producto--vacio`, '—');
  const img = el('img', clase);
  img.src = url;
  img.alt = altImagenPrincipal(producto) || producto?.altText || `Imagen de ${producto.nombre ?? 'producto'}`;
  img.loading = 'lazy';
  img.addEventListener('error', () => {
    img.replaceWith(el('span', `${clase} mini-producto--error`, 'Sin imagen'));
  });
  return img;
}

function productoPorId(lista, id, varianteId) {
  return (lista ?? []).find((p) => Number(p.id) === Number(id)
    || (varianteId !== undefined && (p.variantes ?? []).some((v) => Number(v.id) === Number(varianteId))));
}

export const PESTANAS = [
  { id: 'resumen', etiqueta: 'Resumen' },
  { id: 'productos', etiqueta: 'Productos' },
  { id: 'catalogo', etiqueta: 'Categorías y materiales' },
  { id: 'pedidos', etiqueta: 'Pedidos' },
  { id: 'usuarios', etiqueta: 'Usuarios' },
  { id: 'proveedores', etiqueta: 'Proveedores' },
  { id: 'compras', etiqueta: 'Compras' },
  { id: 'inventario', etiqueta: 'Inventario' },
  { id: 'mensajes', etiqueta: 'Mensajes' },
  { id: 'parametros', etiqueta: 'Parámetros' },
  { id: 'auditoria', etiqueta: 'Auditoría' },
];

export const ESTADOS_PEDIDO = ['pendiente', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado'];
export const ESTADOS_ENVIO = ['pendiente', 'preparando', 'en_transito', 'entregado', 'devuelto'];
export const ESTADOS_COMPRA = ['borrador', 'ordenada', 'recibida', 'cancelada'];
export const TIPOS_MEDIDA = ['unica', 'talla', 'largo', 'diametro'];
export const TIPOS_MOVIMIENTO = ['venta', 'compra', 'ajuste', 'devolucion'];
export const ACCIONES_AUDITORIA = ['INSERT', 'UPDATE', 'DELETE'];

const ETIQUETAS = {
  pendiente: 'Pendiente', pagado: 'Pagado', preparando: 'En preparación', enviado: 'Enviado',
  entregado: 'Entregado', cancelado: 'Cancelado', cancelada: 'Cancelada', devuelto: 'Devuelto',
  borrador: 'Borrador', ordenada: 'Ordenada', recibida: 'Recibida', en_transito: 'En tránsito',
  unica: 'Talla única', talla: 'Talla', largo: 'Largo', diametro: 'Diámetro',
  venta: 'Venta', compra: 'Compra', ajuste: 'Ajuste', devolucion: 'Devolución',
  INSERT: 'Alta', UPDATE: 'Cambio', DELETE: 'Baja',
  tarjeta: 'Tarjeta', transferencia: 'Transferencia', deposito: 'Depósito', contra_entrega: 'Contra entrega',
};

const etiqueta = (k) => ETIQUETAS[k] ?? k;
const fechaCorta = (d) => (d ? new Date(d).toLocaleString('es-EC') : '—');

// ---------- Helpers de construcción DOM ----------
function el(tag, clase, texto) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function boton(texto, ariaLabel, onClick, clase = 'btn btn-mini') {
  const b = el('button', clase, texto);
  b.type = 'button';
  if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
  b.addEventListener('click', onClick);
  return b;
}

function badge(valor) {
  return el('span', `badge badge-${valor}`, etiqueta(valor));
}

// Badge con texto propio (Activo/Inactivo, Leído/Sin leer, Admin/Cliente…)
function badgeTexto(texto, clase = 'badge-activo') {
  return el('span', `badge ${clase}`, texto);
}

function tabla(encabezados, filas, caption) {
  const t = el('table', 'tabla-admin');
  if (caption) t.appendChild(el('caption', null, caption));
  const thead = el('thead');
  const trh = el('tr');
  encabezados.forEach((h) => {
    const th = el('th', null, h);
    th.setAttribute('scope', 'col');
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  const tbody = el('tbody');
  filas.forEach((f) => tbody.appendChild(f));
  t.append(thead, tbody);
  return t;
}

function filaTabla(celdas) {
  const tr = el('tr');
  celdas.forEach((c) => {
    const td = el('td');
    if (Array.isArray(c)) c.forEach((x) => td.appendChild(x));
    else if (c instanceof Node) td.appendChild(c);
    else td.textContent = c ?? '—';
    tr.appendChild(td);
  });
  return tr;
}

function cabecera(panel, titulo, acciones = []) {
  const cab = el('div', 'cabecera-tabla');
  cab.appendChild(el('h3', null, titulo));
  const caja = el('div', 'acciones');
  acciones.forEach((a) => caja.appendChild(a));
  cab.appendChild(caja);
  panel.appendChild(cab);
}

function vacio(panel, mensaje) {
  panel.appendChild(el('p', 'mensaje-vacio', mensaje));
}

// ---------- Estados de carga ----------
export function renderizarCargando(panel, texto = 'Cargando…') {
  panel.textContent = '';
  panel.appendChild(spinner(texto));
}

export function renderizarError(panel, mensaje, onReintentar) {
  panel.textContent = '';
  const caja = el('div', 'estado-error');
  caja.setAttribute('role', 'alert');
  caja.appendChild(el('p', null, mensaje));
  if (onReintentar) caja.appendChild(boton('Reintentar', null, onReintentar, 'btn btn-dorado'));
  panel.appendChild(caja);
}

// ---------- Estructura + pestañas ----------
export function inicializarEstructura(vista) {
  if (!vista.querySelector('#admin-tabs')) {
    const tabs = el('div');
    tabs.id = 'admin-tabs';
    tabs.className = 'filtros';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Secciones de administración');
    vista.appendChild(tabs);
  }
  if (vista.querySelector('#panel-resumen')) return;
  for (const tab of PESTANAS) {
    const panel = el('div', `panel-${tab.id}`);
    panel.id = `panel-${tab.id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${tab.id}`);
    panel.className = 'panel-tabla';
    panel.hidden = true;
    vista.appendChild(panel);
  }
}

export function renderizarPestanas(vista, activa, onCambiar) {
  const lista = vista.querySelector('#admin-tabs');
  lista.textContent = '';
  PESTANAS.forEach((tab, i) => {
    const b = boton(tab.etiqueta, null, () => onCambiar(tab.id), `filtro${tab.id === activa ? ' activo' : ''}`);
    b.id = `tab-${tab.id}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(tab.id === activa));
    b.setAttribute('aria-controls', `panel-${tab.id}`);
    b.tabIndex = tab.id === activa ? 0 : -1;
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const siguiente = PESTANAS[(i + delta + PESTANAS.length) % PESTANAS.length];
      // onCambiar re-renderiza los botones: el foco se aplica DESPUÉS,
      // sobre el botón nuevo (si se hiciera antes, el re-render lo destruiría)
      onCambiar(siguiente.id);
      vista.querySelector(`#tab-${siguiente.id}`)?.focus();
    });
    lista.appendChild(b);
  });
  for (const tab of PESTANAS) {
    const panel = vista.querySelector(`#panel-${tab.id}`);
    if (panel) panel.hidden = tab.id !== activa;
  }
}

// ---------- Modal base ----------
function montarModal(id, titulo, anchoGrande = false) {
  let modal = document.getElementById(id);
  if (modal) modal.remove(); // se reconstruye en cada apertura
  modal = el('div', `panel-login${anchoGrande ? ' modal-ancho' : ''}`);
  modal.id = id;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', `${id}-titulo`);
  modal.hidden = true;

  const contenido = el('div', 'panel-login__contenido');
  const btnCerrar = boton('✕', 'Cerrar ventana', () => cerrarModal(modal), 'btn-cerrar');
  const h2 = el('h2', null, titulo);
  h2.id = `${id}-titulo`;
  const cuerpo = el('div', 'modal-cuerpo');
  const error = el('p', 'error');
  error.setAttribute('role', 'alert');
  error.setAttribute('aria-live', 'polite');
  const acciones = el('div', 'panel-carrito__acciones');

  contenido.append(btnCerrar, h2, cuerpo, error, acciones);
  modal.appendChild(contenido);
  document.body.appendChild(modal);
  return { modal, cuerpo, error, acciones };
}

// onGuardar → Promise<true | string | void>: true cierra el modal; un string
// (mensaje de error) se muestra dentro del modal y este permanece abierto.
function botonGuardarCancelar(acciones, modal, onGuardar, error) {
  const btnCancelar = boton('Cancelar', null, () => cerrarModal(modal), 'btn btn-rojo');
  const btnGuardar = boton('Guardar', null, async () => {
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando…';
    try {
      const res = await onGuardar();
      if (res === true) cerrarModal(modal);
      else error.textContent = (typeof res === 'string' && res) ? res : 'No se pudo guardar.';
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar';
    }
  }, 'btn btn-dorado');
  btnGuardar.setAttribute('data-foco', '');
  acciones.append(btnCancelar, btnGuardar);
  return { btnGuardar };
}

function campo(id, labelTexto, { tipo = 'text', valor, requerido = false, opciones, placeholder, min, max, step, checked } = {}) {
  const envoltura = el('div', 'campo');
  const label = el('label', null, labelTexto);
  label.htmlFor = id;
  let input;
  if (opciones) {
    input = el('select');
    opciones.forEach((o) => {
      const opt = el('option');
      opt.value = String(o.value);
      opt.textContent = o.texto;
      if (o.value === valor) opt.selected = true;
      input.appendChild(opt);
    });
  } else if (tipo === 'textarea') {
    input = el('textarea');
    if (placeholder) input.placeholder = placeholder;
  } else {
    input = el('input');
    input.type = tipo;
    if (placeholder) input.placeholder = placeholder;
    if (min !== undefined) input.min = String(min);
    if (max !== undefined) input.max = String(max);
    if (step !== undefined) input.step = String(step);
    if (checked !== undefined) input.checked = checked;
  }
  input.id = id;
  if (requerido) input.required = true;
  if (valor !== undefined && tipo !== 'checkbox') input.value = valor ?? '';
  envoltura.append(label, input);
  return { envoltura, input };
}

function campoCheck(id, labelTexto, checked = false) {
  const envoltura = el('div', 'campo campo-check');
  const input = el('input');
  input.type = 'checkbox';
  input.id = id;
  input.checked = checked;
  const label = el('label', null, labelTexto);
  label.htmlFor = id;
  envoltura.append(input, label);
  return { envoltura, input };
}

// ---------- 1. Resumen ----------
export function renderizarResumen(panel, resumen) {
  panel.textContent = '';
  cabecera(panel, 'Resumen del negocio');

  const tarjetas = el('div', 'grid-resumen');
  for (const [nombre, cantidad] of Object.entries(resumen.tablas ?? {})) {
    const tarjeta = el('div', 'tarjeta-resumen');
    tarjeta.appendChild(el('p', 'tarjeta-resumen__cifra', String(cantidad)));
    tarjeta.appendChild(el('p', 'tarjeta-resumen__nombre', nombre));
    tarjetas.appendChild(tarjeta);
  }
  panel.appendChild(tarjetas);

  const info = el('div', 'ficha-pedido');
  const h4 = el('h4', null, 'Ventas');
  const dl = el('dl');
  const ventas = el('div', 'par-resumen');
  ventas.appendChild(el('dt', null, 'Ventas totales (pedidos no cancelados)'));
  ventas.appendChild(el('dd', null, formatearPrecio(resumen.ventasTotales)));
  dl.appendChild(ventas);
  info.append(h4, dl);
  panel.appendChild(info);

  const porEstado = el('div', 'ficha-pedido');
  porEstado.appendChild(el('h4', null, 'Pedidos por estado'));
  const filas = (resumen.pedidosPorEstado ?? []).map((e) =>
    filaTabla([badge(e.estado), String(e.total)]));
  porEstado.appendChild(tabla(['Estado', 'Pedidos'], filas));
  panel.appendChild(porEstado);

  panel.appendChild(el('p', 'ayuda-password', `Generado: ${fechaCorta(resumen.generadoEn)}`));
}

// ---------- 2. Productos ----------
export function renderizarProductos(panel, productos, { onNuevo, onEditar, onEliminar }) {
  panel.textContent = '';
  cabecera(panel, `Productos (${productos.length})`, [
    boton('+ Nuevo producto', 'Crear un producto nuevo', onNuevo, 'btn btn-dorado'),
  ]);

  if (!productos.length) { vacio(panel, 'No hay productos.'); return; }
  const filas = productos.map((p) => filaTabla([
    miniatura(p),
    String(p.id),
    p.nombre,
    p.categoriaNombre ?? p.categoria,
    formatearPrecio(p.precioBase ?? p.precio),
    String(p.stock),
    `${(p.variantes ?? []).length}`,
    p.activo ? badgeTexto('Activo') : badgeTexto('Inactivo', 'badge-inactivo'),
    [
      boton('Editar', `Editar ${p.nombre}`, () => onEditar(p)),
      boton('Eliminar', `Eliminar ${p.nombre}`, () => onEliminar(p), 'btn btn-mini btn-rojo'),
    ],
  ]));
  const tablaProductos = tabla(['Imagen', 'ID', 'Nombre', 'Categoría', 'Precio base', 'Stock total', 'Variantes', 'Estado', 'Acciones'], filas);
  tablaProductos.classList.add('tabla-admin--productos');
  panel.appendChild(tablaProductos);
}

// Editor de variantes (filas repetibles dentro del modal de producto)
function editorVariantes(contenedor, materiales, variantesIniciales) {
  const filas = [];

  const cabecera = el('div', 'fila-variante fila-variante--cabecera');
  ['Material', 'Tipo de medida', 'Medida / talla', 'Precio', 'Stock', 'Mín.', ''].forEach((t) =>
    cabecera.appendChild(el('span', null, t)));
  contenedor.appendChild(cabecera);

  const agregarFila = (v = {}) => {
    const fila = el('div', 'fila-variante');
    const materialSel = el('select');
    materialSel.setAttribute('aria-label', 'Material de la variante');
    materiales.forEach((m) => {
      const opt = el('option');
      opt.value = String(m.id);
      opt.textContent = m.nombre;
      if (Number(m.id) === Number(v.materialId)) opt.selected = true;
      materialSel.appendChild(opt);
    });
    const tipoSel = el('select');
    tipoSel.setAttribute('aria-label', 'Tipo de medida de la variante');
    TIPOS_MEDIDA.forEach((t) => {
      const opt = el('option');
      opt.value = t;
      opt.textContent = etiqueta(t);
      if (t === (v.tipoMedida ?? 'unica')) opt.selected = true;
      tipoSel.appendChild(opt);
    });
    const medida = el('input');
    medida.type = 'text';
    medida.maxLength = 30;
    medida.placeholder = 'Ej: 7 / 45cm';
    medida.value = v.medida ?? '';
    medida.setAttribute('aria-label', 'Medida o talla de la variante');
    const precio = el('input');
    precio.type = 'number';
    precio.min = '0';
    precio.step = '0.01';
    precio.value = v.precio ?? '';
    precio.setAttribute('aria-label', 'Precio de la variante');
    const stock = el('input');
    stock.type = 'number';
    stock.min = '0';
    stock.step = '1';
    stock.value = v.stock ?? 0;
    stock.setAttribute('aria-label', 'Stock de la variante');
    const minimo = el('input');
    minimo.type = 'number';
    minimo.min = '0';
    minimo.step = '1';
    minimo.value = v.stockMinimo ?? 3;
    minimo.setAttribute('aria-label', 'Stock mínimo de la variante');
    const btnQuitar = boton('✕', 'Quitar esta variante', () => {
      const i = filas.indexOf(reg);
      if (i >= 0) filas.splice(i, 1);
      fila.remove();
    }, 'btn btn-mini btn-rojo');

    fila.append(materialSel, tipoSel, medida, precio, stock, minimo, btnQuitar);
    contenedor.appendChild(fila);
    const reg = { id: v.id ?? null, materialSel, tipoSel, medida, precio, stock, minimo, fila };
    filas.push(reg);
    return reg;
  };

  (variantesIniciales ?? []).forEach(agregarFila);
  if (!filas.length) agregarFila();

  const btnAgregar = boton('+ Añadir variante', 'Añadir otra variante al producto', () => agregarFila());
  contenedor.appendChild(el('p', 'ayuda-password', 'Cada variante combina material y medida/talla con su propio precio y stock.'));
  contenedor.appendChild(btnAgregar);

  return {
    filas,
    valores() {
      return filas.map((f) => ({
        ...(f.id ? { id: f.id } : {}),
        materialId: Number(f.materialSel.value),
        tipoMedida: f.tipoSel.value,
        medida: f.medida.value.trim(),
        precio: Number(f.precio.value),
        stock: Number(f.stock.value),
        stockMinimo: Number(f.minimo.value),
      }));
    },
    validar() {
      for (const f of filas) {
        if (!f.medida.value.trim() || f.medida.value.trim().length > 30) return 'Cada variante necesita una medida (1-30 caracteres).';
        if (!(Number(f.precio.value) >= 0)) return 'Cada variante necesita un precio ≥ 0.';
        if (!(Number(f.stock.value) >= 0)) return 'Cada variante necesita un stock ≥ 0.';
        if (!(Number(f.minimo.value) >= 0)) return 'El stock mínimo debe ser ≥ 0.';
      }
      return null;
    },
  };
}

// Editor de imágenes múltiples (§4.3): miniatura, URL, alt, principal y orden.
// Mantiene `imagen`/`alt` clásicos como derivados de la imagen principal.
function editorImagenes(contenedor, producto) {
  const filas = [];
  let contador = 0;
  const iniciales = producto?.imagenes?.length
    ? producto.imagenes.map((i) => ({ url: i.url, altText: i.altText ?? '', esPrincipal: Boolean(i.esPrincipal), orden: Number(i.orden ?? 0) }))
    : (producto?.imagen ? [{ url: producto.imagen, altText: producto.alt ?? '', esPrincipal: true, orden: 0 }] : []);

  contenedor.appendChild(el('p', 'ayuda-password',
    'La primera imagen marcada como principal es la que aparece en el catálogo. El texto alternativo es obligatorio para accesibilidad.'));

  const vistaPrevia = el('div', 'editor-imagenes__preview');
  const img = el('img', 'editor-imagenes__img');
  img.alt = 'Vista previa de la imagen principal';
  const estado = el('p', 'ayuda-password', 'Sin imagen principal.');
  estado.setAttribute('role', 'status');
  estado.setAttribute('aria-live', 'polite');
  vistaPrevia.append(img, estado);
  contenedor.appendChild(vistaPrevia);

  let temporizador = null;
  function actualizarVistaPrevia() {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      const principal = valores().find((i) => i.esPrincipal) ?? valores()[0];
      if (!principal?.url) {
        img.removeAttribute('src');
        estado.textContent = 'Sin imagen principal.';
        return;
      }
      img.src = principal.url;
      img.alt = principal.altText || 'Vista previa de la imagen principal';
      estado.textContent = 'Vista previa actualizada.';
    }, 250);
  }

  const cabecera = el('div', 'fila-imagen fila-imagen--cabecera');
  ['Vista previa', 'URL', 'Texto alternativo', 'Principal', 'Orden', ''].forEach((t) =>
    cabecera.appendChild(el('span', null, t)));
  contenedor.appendChild(cabecera);

  const agregarFila = (inicial = {}) => {
    const fila = el('div', 'fila-imagen');
    const miniaturaFila = miniatura(inicial, 'mini-producto');
    const url = el('input');
    url.type = 'text';
    url.value = inicial.url ?? '';
    url.placeholder = 'assets/img/... o https://...';
    url.setAttribute('aria-label', 'URL de la imagen');
    const altTexto = el('input');
    altTexto.type = 'text';
    altTexto.maxLength = 160;
    altTexto.value = inicial.altText ?? '';
    altTexto.placeholder = 'Ej: Anillo de oro con diamante';
    altTexto.setAttribute('aria-label', 'Texto alternativo de la imagen');
    const principal = el('input');
    principal.type = 'radio';
    principal.name = 'prod-imagen-principal';
    principal.checked = Boolean(inicial.esPrincipal);
    principal.setAttribute('aria-label', 'Usar como imagen principal');
    const orden = el('input');
    orden.type = 'number';
    orden.min = '0';
    orden.step = '1';
    orden.value = inicial.orden ?? filas.length;
    orden.setAttribute('aria-label', 'Orden de la imagen');
    const btnQuitar = boton('✕', 'Quitar esta imagen', () => {
      const i = filas.indexOf(reg);
      if (i >= 0) filas.splice(i, 1);
      fila.remove();
      if (principal.checked && filas.length) filas[0].principal.checked = true;
      actualizarVistaPrevia();
    }, 'btn btn-mini btn-rojo');

    const actualizarMiniatura = () => {
      const nueva = miniatura({ nombre: 'imagen', imagen: url.value.trim(), imagenes: [{ url: url.value.trim(), altText: altTexto.value }] }, 'mini-producto');
      miniaturaFila.replaceWith(nueva);
      reg.miniatura = nueva;
      actualizarVistaPrevia();
    };
    url.addEventListener('input', actualizarMiniatura);
    principal.addEventListener('change', actualizarVistaPrevia);
    fila.append(miniaturaFila, url, altTexto, principal, orden, btnQuitar);
    contenedor.appendChild(fila);
    const reg = { id: inicial.id ?? null, url, altTexto, principal, orden, fila, miniatura: miniaturaFila };
    filas.push(reg);
    return reg;
  };

  (iniciales ?? []).forEach(agregarFila);
  if (!filas.length) agregarFila();
  filas[0].principal.checked = true;

  const btnAgregar = boton('+ Añadir imagen', 'Añadir otra imagen al producto', () => {
    agregarFila({ orden: filas.length });
    actualizarVistaPrevia();
  });
  contenedor.appendChild(btnAgregar);

  function valores() {
    return filas.map((f) => ({
      url: f.url.value.trim(),
      altText: f.altTexto.value.trim(),
      esPrincipal: f.principal.checked,
      orden: Number(f.orden.value) || 0,
    }));
  }

  img.addEventListener('error', () => { estado.textContent = 'No se pudo cargar la vista previa. Revisa la URL.'; });
  actualizarVistaPrevia();

  return {
    valores,
    validar() {
      const lista = valores();
      if (!lista.length) return null;
      if (lista.some((i) => !i.url)) return 'Toda imagen necesita una URL.';
      const urlInvalida = lista.find((i) => {
        const u = i.url.toLowerCase();
        return /^(javascript|data|http):/i.test(u) || u.startsWith('//')
          || u.includes('..') || !(u.startsWith('assets/img/') || u.startsWith('https://'));
      });
      if (urlInvalida) return `URL de imagen no permitida: "${urlInvalida.url}". Usa assets/img/... o https:// (sin javascript:, data:, http: ni ..).`;
      if (lista.some((i) => !i.altText)) return 'Toda imagen necesita texto alternativo.';
      if (!lista.some((i) => i.esPrincipal)) return 'Marca una imagen como principal.';
      if (lista.filter((i) => i.esPrincipal).length > 1) return 'Solo una imagen puede ser principal.';
      return null;
    },
  };
}

// onGuardar(datos) → Promise<boolean>
export function abrirFormularioProducto(producto, { categorias, materiales, onGuardar }) {
  const { modal, cuerpo, error, acciones } = montarModal('modal-producto', producto ? `Editar "${producto.nombre}"` : 'Nuevo producto', true);

  const cNombre = campo('prod-nombre', 'Nombre *', { valor: producto?.nombre, requerido: true, placeholder: 'Ej: Anillo Carresol Solitario' });
  const cDesc = campo('prod-descripcion', 'Descripción', { tipo: 'textarea', valor: producto?.descripcion, placeholder: 'Hasta 1000 caracteres' });
  const cCategoria = campo('prod-categoria', 'Categoría *', {
    requerido: true,
    opciones: categorias.map((c) => ({ value: c.id, texto: c.nombre })),
    valor: producto?.categoriaNombre,
  });
  // Seleccionar la categoría real del producto si coincide
  if (producto?.variantes?.length || producto) {
    const cat = categorias.find((c) => c.slug === producto?.categoria || c.nombre === producto?.categoriaNombre);
    if (cat) cCategoria.input.value = String(cat.id);
  }
  const cPrecio = campo('prod-precio-base', 'Precio base (USD) *', { tipo: 'number', valor: producto?.precioBase ?? producto?.precio, requerido: true, min: 0, step: 0.01 });
  const cDestacado = campoCheck('prod-destacado', 'Producto destacado', producto?.destacado ?? false);
  const cActivo = campoCheck('prod-activo', 'Producto activo (visible en el catálogo)', producto?.activo ?? true);

  cuerpo.append(
    cNombre.envoltura, cDesc.envoltura, cCategoria.envoltura, cPrecio.envoltura,
    cDestacado.envoltura, cActivo.envoltura,
    el('h3', 'subtitulo-modal', 'Imágenes del producto'),
  );
  const contImagenes = el('div', 'editor-imagenes');
  cuerpo.appendChild(contImagenes);
  const editorImgs = editorImagenes(contImagenes, producto);

  cuerpo.appendChild(el('h3', 'subtitulo-modal', 'Variantes (material + medida/talla)'));
  const contVariantes = el('div', 'editor-variantes');
  cuerpo.appendChild(contVariantes);
  const editor = editorVariantes(contVariantes, materiales, producto?.variantes ?? []);

  botonGuardarCancelar(acciones, modal, async () => {
    const nombre = cNombre.input.value.trim();
    if (nombre.length < 3) { error.textContent = 'El nombre admite entre 3 y 120 caracteres.'; return; }
    if (!cCategoria.input.value) { error.textContent = 'Elige una categoría.'; return; }
    if (!(Number(cPrecio.input.value) >= 0)) { error.textContent = 'El precio base debe ser ≥ 0.'; return; }
    const falloImagen = editorImgs.validar();
    if (falloImagen) { error.textContent = falloImagen; return; }
    const falloVariante = editor.validar();
    if (falloVariante) { error.textContent = falloVariante; return; }
    if (!editor.valores().length) { error.textContent = 'Agrega al menos una variante.'; return; }

    error.textContent = '';
    const imagenes = editorImgs.valores();
    const principal = imagenes.find((i) => i.esPrincipal) ?? imagenes[0];
    const datos = {
      nombre,
      descripcion: cDesc.input.value.trim() || undefined,
      categoriaId: Number(cCategoria.input.value),
      precioBase: Number(cPrecio.input.value),
      imagenes,
      // Compatibilidad con el formato anterior del Reto 1 / respaldo JSON.
      imagen: principal?.url || undefined,
      alt: principal?.altText || undefined,
      destacado: cDestacado.input.checked,
      activo: cActivo.input.checked,
      variantes: editor.valores(),
    };
    return await onGuardar(datos, producto?.id ?? null);
  });

  abrirModal(modal, document.activeElement);
  return modal;
}

// ---------- 3. Categorías y materiales ----------
export function renderizarCatalogo(panel, { categorias, materiales, onNuevaCategoria, onEditarCategoria, onNuevoMaterial, onEditarMaterial }) {
  panel.textContent = '';

  cabecera(panel, `Categorías (${categorias.length})`, [
    boton('+ Nueva categoría', 'Crear una categoría', onNuevaCategoria, 'btn btn-dorado'),
  ]);
  const filasCat = categorias.map((c) => filaTabla([
    String(c.id), c.nombre, c.slug, c.orden ?? '—',
    String(c.totalProductos ?? 0),
    c.activa ? badgeTexto('Activa') : badgeTexto('Inactiva', 'badge-inactivo'),
    boton('Editar', `Editar la categoría ${c.nombre}`, () => onEditarCategoria(c)),
  ]));
  panel.appendChild(tabla(['ID', 'Nombre', 'Slug', 'Orden', 'Productos', 'Estado', 'Acciones'], filasCat, 'Categorías del catálogo'));

  panel.appendChild(el('h3', 'subtitulo-modal', `Materiales (${materiales.length})`));
  const cabMat = el('div', 'cabecera-tabla');
  cabMat.appendChild(el('p', 'ayuda-password', 'Los materiales definen las variantes de cada producto.'));
  cabMat.appendChild(boton('+ Nuevo material', 'Crear un material', onNuevoMaterial, 'btn btn-dorado'));
  panel.appendChild(cabMat);
  const filasMat = materiales.map((m) => filaTabla([
    String(m.id), m.nombre, m.categoria ?? String(m.categoriaId),
    m.activo ? badgeTexto('Activo') : badgeTexto('Inactivo', 'badge-inactivo'),
    boton('Editar', `Editar el material ${m.nombre}`, () => onEditarMaterial(m)),
  ]));
  panel.appendChild(tabla(['ID', 'Nombre', 'Categoría', 'Estado', 'Acciones'], filasMat, 'Materiales del catálogo'));
}

export function abrirFormularioCategoria(categoria, onGuardar) {
  const { modal, cuerpo, error, acciones } = montarModal('modal-categoria', categoria ? `Editar "${categoria.nombre}"` : 'Nueva categoría');
  const cNombre = campo('cat-nombre', 'Nombre *', { valor: categoria?.nombre, requerido: true });
  const cSlug = campo('cat-slug', 'Slug (opcional)', { valor: categoria?.slug, placeholder: 'se genera desde el nombre' });
  const cDesc = campo('cat-desc', 'Descripción', { tipo: 'textarea', valor: categoria?.descripcion });
  const cOrden = campo('cat-orden', 'Orden de aparición', { tipo: 'number', valor: categoria?.orden ?? 99, min: 1, max: 999 });
  const cActiva = campoCheck('cat-activa', 'Categoría activa', categoria?.activa ?? true);
  cuerpo.append(cNombre.envoltura, cSlug.envoltura, cDesc.envoltura, cOrden.envoltura, cActiva.envoltura);

  botonGuardarCancelar(acciones, modal, async () => {
    if (cNombre.input.value.trim().length < 3) { error.textContent = 'El nombre admite entre 3 y 60 caracteres.'; return; }
    error.textContent = '';
    const datos = {
      nombre: cNombre.input.value.trim(),
      slug: cSlug.input.value.trim() || undefined,
      descripcion: cDesc.input.value.trim() || undefined,
      orden: Number(cOrden.input.value) || 99,
      activa: cActiva.input.checked,
    };
    return await onGuardar(datos, categoria?.id ?? null);
  });
  abrirModal(modal, document.activeElement);
}

export function abrirFormularioMaterial(material, { categorias }, onGuardar) {
  const { modal, cuerpo, error, acciones } = montarModal('modal-material', material ? `Editar "${material.nombre}"` : 'Nuevo material');
  const cNombre = campo('mat-nombre', 'Nombre *', { valor: material?.nombre, requerido: true, placeholder: 'Ej: Oro 18k' });
  const cCategoria = campo('mat-categoria', 'Categoría *', {
    requerido: true,
    opciones: categorias.map((c) => ({ value: c.id, texto: c.nombre })),
    valor: material?.categoriaId,
  });
  const cActivo = campoCheck('mat-activo', 'Material activo', material?.activo ?? true);
  cuerpo.append(cNombre.envoltura, cCategoria.envoltura, cActivo.envoltura);

  botonGuardarCancelar(acciones, modal, async () => {
    if (cNombre.input.value.trim().length < 3) { error.textContent = 'El nombre admite entre 3 y 60 caracteres.'; return; }
    if (!cCategoria.input.value) { error.textContent = 'Elige una categoría.'; return; }
    error.textContent = '';
    const datos = {
      nombre: cNombre.input.value.trim(),
      categoriaId: Number(cCategoria.input.value),
      activo: cActivo.input.checked,
    };
    return await onGuardar(datos, material?.id ?? null);
  });
  abrirModal(modal, document.activeElement);
}

// ---------- 4. Pedidos ----------
export function renderizarPedidos(panel, pedidos, { filtroEstado, onFiltrarEstado, onCambiarEstado, onConfirmarPago, onRegistrarEnvio, productos = [] }) {
  panel.textContent = '';

  const cab = el('div', 'cabecera-tabla');
  cab.appendChild(el('h3', null, `Pedidos (${pedidos.length})`));
  const selEstado = el('select');
  selEstado.setAttribute('aria-label', 'Filtrar pedidos por estado');
  ['todos', ...ESTADOS_PEDIDO].forEach((e) => {
    const opt = el('option');
    opt.value = e;
    opt.textContent = e === 'todos' ? 'Todos los estados' : etiqueta(e);
    if (e === filtroEstado) opt.selected = true;
    selEstado.appendChild(opt);
  });
  selEstado.addEventListener('change', () => onFiltrarEstado(selEstado.value));
  cab.appendChild(selEstado);
  panel.appendChild(cab);

  if (!pedidos.length) { vacio(panel, 'No hay pedidos con ese filtro.'); return; }

  pedidos.forEach((p) => {
    const articulo = el('article', 'pedido pedido-admin');
    articulo.setAttribute('aria-labelledby', `admin-pedido-${p.id}`);

    const h4 = el('h4', null, `Pedido #${p.numeroPedido} — ${p.usuario?.nombre ?? '—'} `);
    h4.id = `admin-pedido-${p.id}`;
    const email = el('span', 'ayuda-password', p.usuario?.email ?? '');
    h4.appendChild(email);

    const meta = el('p', 'pedido__meta');
    meta.append(fechaCorta(p.createdAt), ' — Total: ', formatearPrecio(p.total), ' ', badge(p.estado));

    // Acciones: estado, pago y envío
    const acciones = el('div', 'acciones acciones-pedido');

    const selNuevo = el('select');
    selNuevo.setAttribute('aria-label', `Nuevo estado del pedido ${p.numeroPedido}`);
    ESTADOS_PEDIDO.forEach((e) => {
      const opt = el('option');
      opt.value = e;
      opt.textContent = etiqueta(e);
      if (e === p.estado) opt.selected = true;
      selNuevo.appendChild(opt);
    });
    acciones.appendChild(selNuevo);
    acciones.appendChild(boton('Cambiar estado', `Aplicar el nuevo estado al pedido ${p.numeroPedido}`, () =>
      onCambiarEstado(p, selNuevo.value)));

    acciones.appendChild(boton('Confirmar pago', `Confirmar el pago del pedido ${p.numeroPedido}`, () =>
      onConfirmarPago(p)));

    acciones.appendChild(boton('Registrar envío', `Registrar el envío del pedido ${p.numeroPedido}`, () =>
      onRegistrarEnvio(p)));

    // Detalle expandible
    const btnDetalle = boton('Ver detalle', `Ver el detalle del pedido ${p.numeroPedido}`, () => {
      const abierto = detalle.hidden;
      detalle.hidden = !abierto;
      btnDetalle.setAttribute('aria-expanded', String(abierto));
      btnDetalle.textContent = abierto ? 'Ocultar detalle' : 'Ver detalle';
    });
    btnDetalle.setAttribute('aria-expanded', 'false');
    btnDetalle.setAttribute('aria-controls', `admin-detalle-${p.id}`);

    const detalle = el('div', 'detalle-pedido');
    detalle.id = `admin-detalle-${p.id}`;
    detalle.hidden = true;

    const items = el('div', 'ficha-pedido');
    items.appendChild(el('h4', null, 'Items'));
    const filasItems = (p.items ?? []).map((d) => filaTabla([
      miniatura(productoPorId(productos, d.productoId, d.varianteId), 'mini-producto'),
      `${d.nombreProducto} (${[d.material, d.medida].filter(Boolean).join(' · ')})`,
      String(d.cantidad), formatearPrecio(d.precioUnitario), formatearPrecio(d.subtotal),
    ]));
    items.appendChild(tabla(['Imagen', 'Producto', 'Cantidad', 'Precio unitario', 'Subtotal'], filasItems, `Items del pedido ${p.numeroPedido}`));
    detalle.appendChild(items);

    const fichas = el('div', 'grid-fichas');
    const ficha = (titulo, pares) => {
      const caja = el('div', 'ficha-pedido');
      caja.appendChild(el('h4', null, titulo));
      const dl = el('dl');
      pares.filter(([, v]) => v !== null && v !== undefined && v !== '').forEach(([k, v]) => {
        dl.appendChild(el('dt', null, k));
        dl.appendChild(el('dd', null, String(v)));
      });
      caja.appendChild(dl);
      return caja;
    };
    fichas.append(
      ficha('Pago', [
        ['Método', etiqueta(p.pago?.metodo ?? '') || null],
        ['Estado', p.pago?.estado],
        ['Referencia', p.pago?.referenciaExterna],
        ['Monto', p.pago ? formatearPrecio(p.pago.monto) : null],
      ]),
      ficha('Envío', [
        ['Estado', p.envio ? etiqueta(p.envio.estado) : null],
        ['Transportista', p.envio?.transportista],
        ['Guía', p.envio?.numeroGuia],
        ['Costo', p.envio ? formatearPrecio(p.envio.costo) : null],
        ['Dirección', p.envio?.direccion
          ? `${p.envio.direccion.alias}: ${p.envio.direccion.callePrincipal} ${p.envio.direccion.numeracion}, ${p.envio.direccion.ciudad}`
          : 'Sin dirección'],
      ]),
      ficha('Factura', [
        ['Número', p.factura?.numero],
        ['Clave de acceso', p.factura?.claveAcceso],
        ['Tipo', etiqueta(p.factura?.tipoIdentificacion ?? '') || null],
        ['Identificación', p.factura?.identificacion],
        ['Razón social', p.factura?.razonSocial],
        ['Total', p.factura ? formatearPrecio(p.factura.total) : null],
      ]),
      ficha('Historial', [
        ...(p.historial ?? []).slice(0, 6).map((h) => [
          `${h.estadoAnterior ? `${etiqueta(h.estadoAnterior)} → ` : ''}${etiqueta(h.estadoNuevo)}`,
          `${h.comentario ?? ''} (${h.usuario?.nombre ?? '—'}, ${fechaCorta(h.createdAt)})`,
        ]),
      ]),
    );
    detalle.appendChild(fichas);

    articulo.append(h4, meta, acciones, btnDetalle, detalle);
    panel.appendChild(articulo);
  });
}

export function abrirFormularioEnvio(pedido, onGuardar) {
  const { modal, cuerpo, error, acciones } = montarModal('modal-envio', `Registrar envío del pedido #${pedido.numeroPedido}`);
  const cTransportista = campo('env-transportista', 'Transportista', { valor: pedido.envio?.transportista, placeholder: 'Ej: Servientrega' });
  const cGuia = campo('env-guia', 'Número de guía', { valor: pedido.envio?.numeroGuia });
  const cEstado = campo('env-estado', 'Estado del envío *', {
    opciones: ESTADOS_ENVIO.map((e) => ({ value: e, texto: etiqueta(e) })),
    valor: pedido.envio?.estado ?? 'preparando',
    requerido: true,
  });
  const cCosto = campo('env-costo', 'Costo de envío (USD)', { tipo: 'number', valor: pedido.envio?.costo ?? 0, min: 0, step: 0.01 });
  const cFecha = campo('env-fecha', 'Fecha estimada de entrega', { tipo: 'date' });
  cuerpo.append(cTransportista.envoltura, cGuia.envoltura, cEstado.envoltura, cCosto.envoltura, cFecha.envoltura);

  botonGuardarCancelar(acciones, modal, async () => {
    if (!cTransportista.input.value.trim() && !cGuia.input.value.trim() && !cFecha.input.value) {
      error.textContent = 'Registra al menos el transportista, la guía o la fecha estimada.';
      return;
    }
    error.textContent = '';
    const datos = {
      estado: cEstado.input.value,
      transportista: cTransportista.input.value.trim() || undefined,
      numeroGuia: cGuia.input.value.trim() || undefined,
      costo: Number(cCosto.input.value) || 0,
      fechaEstimada: cFecha.input.value ? new Date(cFecha.input.value).toISOString() : undefined,
    };
    return await onGuardar(pedido, datos);
  });
  abrirModal(modal, document.activeElement);
}

// ---------- 5. Usuarios ----------
export function renderizarUsuarios(panel, usuarios, { onCambiar } = {}) {
  panel.textContent = '';
  cabecera(panel, `Usuarios (${usuarios.length})`);
  const filas = usuarios.map((u) => filaTabla([
    String(u.id),
    u.nombre,
    u.email,
    u.cedula ?? '—',
    u.role === 'admin' ? badgeTexto('Administrador', 'badge-preparando') : badgeTexto('Cliente', 'badge-pendiente'),
    String(u.totalPedidos ?? 0),
    u.activo ? badgeTexto('Activo') : badgeTexto('Inactivo', 'badge-inactivo'),
    fechaCorta(u.ultimoLogin),
    fechaCorta(u.createdAt),
    [boton('Cambiar rol / estado', `Cambiar rol o estado de ${u.nombre}`, () => onCambiar?.(u))],
  ]));
  panel.appendChild(tabla(['ID', 'Nombre', 'Email', 'Cédula', 'Rol', 'Pedidos', 'Estado', 'Último acceso', 'Creado', 'Acciones'], filas));
}

// Modal accesible para activar/desactivar y cambiar el rol de un usuario.
// onGuardar → Promise<true | string>. El controller pide confirmación antes.
export function abrirFormularioUsuario(usuario, onGuardar) {
  const { modal, cuerpo, error, acciones } = montarModal('modal-usuario', 'Cambiar usuario');
  const rol = campo('usuario-rol', 'Rol', {
    valor: usuario.role,
    opciones: [{ value: 'user', texto: 'Cliente' }, { value: 'admin', texto: 'Administrador' }],
  });
  const activo = campoCheck('usuario-activo', 'Cuenta activa (si se desactiva, su token deja de servir)', usuario.activo);
  const aviso = el('p', 'ayuda-password',
    'No se puede desactivar ni quitar el rol al propio administrador, ni dejar el sistema sin un administrador activo.');
  cuerpo.append(rol.envoltura, activo.envoltura, aviso);
  botonGuardarCancelar(acciones, modal, () => onGuardar({
    role: rol.input.value,
    activo: activo.input.checked,
  }), error);
  abrirModal(modal, document.activeElement);
}

// ---------- 6. Proveedores ----------
export function renderizarProveedores(panel, proveedores, { onNuevo, onEditar, onEliminar }) {
  panel.textContent = '';
  cabecera(panel, `Proveedores (${proveedores.length})`, [
    boton('+ Nuevo proveedor', 'Crear un proveedor', onNuevo, 'btn btn-dorado'),
  ]);
  if (!proveedores.length) { vacio(panel, 'No hay proveedores.'); return; }
  const filas = proveedores.map((p) => filaTabla([
    String(p.id), p.nombre, p.ruc, p.email ?? '—', p.telefono ?? '—', p.contacto ?? '—',
    p.activo ? badgeTexto('Activo') : badgeTexto('Inactivo', 'badge-inactivo'),
    [
      boton('Editar', `Editar el proveedor ${p.nombre}`, () => onEditar(p)),
      boton('Eliminar', `Eliminar el proveedor ${p.nombre}`, () => onEliminar(p), 'btn btn-mini btn-rojo'),
    ],
  ]));
  panel.appendChild(tabla(['ID', 'Nombre', 'RUC', 'Email', 'Teléfono', 'Contacto', 'Estado', 'Acciones'], filas));
}

export function abrirFormularioProveedor(proveedor, onGuardar) {
  const { modal, cuerpo, error, acciones } = montarModal('modal-proveedor', proveedor ? `Editar "${proveedor.nombre}"` : 'Nuevo proveedor');
  const cNombre = campo('prov-nombre', 'Nombre *', { valor: proveedor?.nombre, requerido: true });
  const cRuc = campo('prov-ruc', 'RUC (13 dígitos) *', { valor: proveedor?.ruc, requerido: true, placeholder: '1791234567001' });
  const cEmail = campo('prov-email', 'Email', { tipo: 'email', valor: proveedor?.email });
  const cTelefono = campo('prov-telefono', 'Teléfono', { tipo: 'tel', valor: proveedor?.telefono, placeholder: '0991234567' });
  const cDireccion = campo('prov-direccion', 'Dirección', { valor: proveedor?.direccion });
  const cContacto = campo('prov-contacto', 'Persona de contacto', { valor: proveedor?.contacto });
  const cActivo = campoCheck('prov-activo', 'Proveedor activo', proveedor?.activo ?? true);
  cuerpo.append(cNombre.envoltura, cRuc.envoltura, cEmail.envoltura, cTelefono.envoltura, cDireccion.envoltura, cContacto.envoltura, cActivo.envoltura);

  botonGuardarCancelar(acciones, modal, async () => {
    if (cNombre.input.value.trim().length < 3) { error.textContent = 'El nombre admite entre 3 y 120 caracteres.'; return; }
    if (!/^\d{13}$/.test(cRuc.input.value.trim())) { error.textContent = 'El RUC debe tener 13 dígitos.'; return; }
    if (cTelefono.input.value.trim() && !/^0\d{8,9}$/.test(cTelefono.input.value.trim())) { error.textContent = 'El teléfono debe tener el formato 0XXXXXXXXX.'; return; }
    error.textContent = '';
    const datos = {
      nombre: cNombre.input.value.trim(),
      ruc: cRuc.input.value.trim(),
      email: cEmail.input.value.trim() || undefined,
      telefono: cTelefono.input.value.trim() || undefined,
      direccion: cDireccion.input.value.trim() || undefined,
      contacto: cContacto.input.value.trim() || undefined,
      activo: cActivo.input.checked,
    };
    return await onGuardar(datos, proveedor?.id ?? null);
  });
  abrirModal(modal, document.activeElement);
}

// ---------- 7. Compras ----------
export function renderizarCompras(panel, compras, { onNueva, onEditar, onCambiarEstado, productos = [] }) {
  panel.textContent = '';
  cabecera(panel, `Compras (${compras.length})`, [
    boton('+ Nueva compra', 'Registrar una compra a proveedor', onNueva, 'btn btn-dorado'),
  ]);
  if (!compras.length) { vacio(panel, 'No hay compras registradas.'); return; }

  compras.forEach((c) => {
    const articulo = el('article', 'pedido pedido-admin');
    const h4 = el('h4', null, `Compra #${c.numeroCompra} — ${c.proveedor?.nombre ?? '—'} `);
    const ruc = el('span', 'ayuda-password', `RUC ${c.proveedor?.ruc ?? '—'}`);
    h4.appendChild(ruc);

    const meta = el('p', 'pedido__meta');
    meta.append(`Comprada: ${fechaCorta(c.fechaCompra ?? c.createdAt)}`, ' — Total: ', formatearPrecio(c.total), ' ', badge(c.estado));
    if (c.fechaRecepcion) meta.append(` (recibida: ${fechaCorta(c.fechaRecepcion)})`);

    const acciones = el('div', 'acciones acciones-pedido');
    if (c.estado === 'borrador') {
      acciones.appendChild(boton('Editar', `Editar la compra ${c.numeroCompra}`, () => onEditar(c)));
      acciones.appendChild(boton('Ordenar', `Ordenar la compra ${c.numeroCompra} al proveedor`, () => onCambiarEstado(c, 'ordenada'), 'btn btn-mini'));
    }
    if (c.estado === 'ordenada') {
      acciones.appendChild(boton('Editar', `Editar la compra ${c.numeroCompra}`, () => onEditar(c)));
      acciones.appendChild(boton('Recibir', `Registrar recepción de la compra ${c.numeroCompra} (reponer stock)`, () => onCambiarEstado(c, 'recibida'), 'btn btn-mini'));
    }
    if (c.estado === 'borrador' || c.estado === 'ordenada') {
      acciones.appendChild(boton('Cancelar', `Cancelar la compra ${c.numeroCompra}`, () => onCambiarEstado(c, 'cancelada'), 'btn btn-mini btn-rojo'));
    }

    const btnDetalle = boton('Ver detalle', `Ver el detalle de la compra ${c.numeroCompra}`, () => {
      const abierto = detalle.hidden;
      detalle.hidden = !abierto;
      btnDetalle.setAttribute('aria-expanded', String(abierto));
      btnDetalle.textContent = abierto ? 'Ocultar detalle' : 'Ver detalle';
    });
    btnDetalle.setAttribute('aria-expanded', 'false');
    btnDetalle.setAttribute('aria-controls', `admin-detalle-compra-${c.id}`);

    const detalle = el('div', 'detalle-pedido');
    detalle.id = `admin-detalle-compra-${c.id}`;
    detalle.hidden = true;

    const filasItems = (c.items ?? []).map((i) => filaTabla([
      miniatura(productoPorId(productos, i.productoId, i.varianteId), 'mini-producto'),
      `${i.nombreProducto} (${[i.material, i.medida].filter(Boolean).join(' · ')})`,
      i.sku ?? '—', String(i.cantidad), formatearPrecio(i.costoUnitario), formatearPrecio(i.subtotal),
    ]));
    detalle.appendChild(tabla(['Imagen', 'Producto', 'SKU', 'Cantidad', 'Costo unitario', 'Subtotal'], filasItems, 'Items de la compra'));
    if (c.notas) detalle.appendChild(el('p', 'ayuda-password', `Notas: ${c.notas}`));
    if (c.numeroFacturaProveedor) detalle.appendChild(el('p', 'ayuda-password', `Factura del proveedor: ${c.numeroFacturaProveedor}`));

    articulo.append(h4, meta, acciones, btnDetalle, detalle);
    panel.appendChild(articulo);
  });
}

// onGuardar(datos, id?) → Promise<boolean>; productos: catálogo con variantes
export function abrirFormularioCompra(compra, { proveedores, productos }, onGuardar) {
  const { modal, cuerpo, error, acciones } = montarModal('modal-compra', compra ? `Editar compra #${compra.numeroCompra}` : 'Nueva compra a proveedor', true);

  const cProveedor = campo('comp-proveedor', 'Proveedor *', {
    requerido: true,
    opciones: proveedores.map((p) => ({ value: p.id, texto: `${p.nombre} (RUC ${p.ruc})` })),
    valor: compra?.proveedorId,
  });
  const cFactura = campo('comp-factura', 'Factura del proveedor', { valor: compra?.numeroFacturaProveedor, placeholder: 'Ej: 001-001-000123' });
  const cNotas = campo('comp-notas', 'Notas', { tipo: 'textarea', valor: compra?.notas, placeholder: 'Ej: reposición semanal de stock' });
  cuerpo.append(cProveedor.envoltura, cFactura.envoltura, cNotas.envoltura, el('h3', 'subtitulo-modal', 'Items (variantes a reponer)'));

  const contItems = el('div', 'editor-variantes');
  const cabeceraItems = el('div', 'fila-variante fila-variante--cabecera');
  ['Imagen', 'Producto', 'Variante', 'Cantidad', 'Costo unitario', ''].forEach((t) =>
    cabeceraItems.appendChild(el('span', null, t)));
  contItems.appendChild(cabeceraItems);
  cuerpo.appendChild(contItems);

  const filas = [];
  const agregarFila = (item = {}) => {
    const fila = el('div', 'fila-variante fila-compra');
    const vistaPrevia = el('img', 'mini-producto');
    vistaPrevia.alt = 'Imagen del producto seleccionado';
    vistaPrevia.addEventListener('error', () => {
      vistaPrevia.replaceWith(el('span', 'mini-producto mini-producto--error', 'Sin imagen'));
    });
    const selProducto = el('select');
    selProducto.setAttribute('aria-label', 'Producto a comprar');
    productos.forEach((p) => {
      const opt = el('option');
      opt.value = String(p.id);
      opt.textContent = p.nombre;
      selProducto.appendChild(opt);
    });
    const selVariante = el('select');
    selVariante.setAttribute('aria-label', 'Variante a comprar');
    const cantidad = el('input');
    cantidad.type = 'number';
    cantidad.min = '1';
    cantidad.max = '500';
    cantidad.value = item.cantidad ?? 10;
    cantidad.setAttribute('aria-label', 'Cantidad a comprar');
    const costo = el('input');
    costo.type = 'number';
    costo.min = '0';
    costo.step = '0.01';
    costo.value = item.costoUnitario ?? '';
    costo.placeholder = 'costo unitario';
    costo.setAttribute('aria-label', 'Costo unitario de compra');

    const llenarVariantes = () => {
      const producto = productos.find((p) => Number(p.id) === Number(selProducto.value));
      selVariante.textContent = '';
      (producto?.variantes ?? []).forEach((v) => {
        const opt = el('option');
        opt.value = String(v.id);
        opt.textContent = `${v.sku} — ${v.material} ${v.medida} (stock ${v.stock})`;
        if (Number(v.id) === Number(item.varianteId)) opt.selected = true;
        selVariante.appendChild(opt);
      });
      const variante = (producto?.variantes ?? []).find((v) => Number(v.id) === Number(item.varianteId));
      if (variante && costo.value === '') costo.value = String(variante.precio * 0.5);
      const url = urlImagenPrincipal(producto);
      if (url) vistaPrevia.src = url;
      else vistaPrevia.removeAttribute('src');
      vistaPrevia.alt = altImagenPrincipal(producto) || `Imagen de ${producto?.nombre ?? 'producto'}`;
    };
    selProducto.addEventListener('change', () => { item.varianteId = undefined; llenarVariantes(); });
    selProducto.value = (() => {
      const idx = productos.findIndex((p) => (p.variantes ?? []).some((v) => Number(v.id) === Number(item.varianteId)));
      return idx >= 0 ? String(productos[idx].id) : String(productos[0]?.id ?? '');
    })();

    const btnQuitar = boton('✕', 'Quitar este item de la compra', () => {
      const i = filas.indexOf(reg);
      if (i >= 0) filas.splice(i, 1);
      fila.remove();
    }, 'btn btn-mini btn-rojo');

    fila.append(vistaPrevia, selProducto, selVariante, cantidad, costo, btnQuitar);
    contItems.appendChild(fila);
    const reg = { selProducto, selVariante, cantidad, costo, fila };
    filas.push(reg);
    llenarVariantes();
    return reg;
  };

  (compra?.items ?? []).forEach((i) => agregarFila({ varianteId: i.varianteId, cantidad: i.cantidad, costoUnitario: i.costoUnitario }));
  if (!filas.length) agregarFila();
  contItems.appendChild(boton('+ Añadir item', 'Añadir otro item a la compra', () => agregarFila()));

  botonGuardarCancelar(acciones, modal, async () => {
    if (!cProveedor.input.value) { error.textContent = 'Elige un proveedor.'; return; }
    if (!filas.length) { error.textContent = 'Agrega al menos un item.'; return; }
    const items = filas.map((f) => ({
      varianteId: Number(f.selVariante.value),
      cantidad: Number(f.cantidad.value),
      costoUnitario: Number(f.costo.value),
    }));
    if (items.some((i) => !i.varianteId || !(i.cantidad >= 1) || !(i.costoUnitario >= 0))) {
      error.textContent = 'Cada item necesita variante, cantidad ≥ 1 y costo ≥ 0.';
      return;
    }
    error.textContent = '';
    const datos = {
      proveedorId: Number(cProveedor.input.value),
      numeroFacturaProveedor: cFactura.input.value.trim() || undefined,
      notas: cNotas.input.value.trim() || undefined,
      items,
    };
    return await onGuardar(datos, compra?.id ?? null);
  });
  abrirModal(modal, document.activeElement);
}

// ---------- 8. Inventario ----------
export function renderizarInventario(panel, { stockBajo: bajo, movimientos: kardex, filtroTipo, onFiltrar, productos = [] }) {
  panel.textContent = '';

  cabecera(panel, `Variantes en stock mínimo (${bajo.length})`);
  if (!bajo.length) {
    vacio(panel, 'No hay variantes por debajo de su stock mínimo. ¡Inventario saludable!');
  } else {
    const filasBajo = bajo.map((v) => filaTabla([
      miniatura(productoPorId(productos, v.productoId, v.id), 'mini-producto'),
      v.sku, v.nombreProducto, [v.material, v.medida].filter(Boolean).join(' · '),
      String(v.stock), String(v.stockMinimo), String(v.sugerido),
    ]));
    panel.appendChild(tabla(['Imagen', 'SKU', 'Producto', 'Variante', 'Stock', 'Mínimo', 'Sugerido'], filasBajo, 'Sugerencia de reposición (hasta 10)'));
  }

  panel.appendChild(el('h3', 'subtitulo-modal', `Kardex de movimientos (${kardex.length})`));
  const filtros = el('div', 'cabecera-tabla');
  const selTipo = el('select');
  selTipo.setAttribute('aria-label', 'Filtrar movimientos por tipo');
  ['todos', ...TIPOS_MOVIMIENTO].forEach((t) => {
    const opt = el('option');
    opt.value = t;
    opt.textContent = t === 'todos' ? 'Todos los tipos' : etiqueta(t);
    if (t === filtroTipo) opt.selected = true;
    selTipo.appendChild(opt);
  });
  selTipo.addEventListener('change', () => onFiltrar(selTipo.value));
  const inputVariante = el('input');
  inputVariante.type = 'number';
  inputVariante.min = '1';
  inputVariante.placeholder = 'Filtrar por id de variante';
  inputVariante.setAttribute('aria-label', 'Filtrar movimientos por id de variante');
  const btnFiltrar = boton('Filtrar', 'Aplicar los filtros del kardex', () => onFiltrar(selTipo.value, inputVariante.value.trim() || undefined));
  filtros.append(selTipo, inputVariante, btnFiltrar);
  panel.appendChild(filtros);

  if (!kardex.length) { vacio(panel, 'No hay movimientos con ese filtro.'); return; }
  const filasKardex = kardex.map((m) => filaTabla([
    fechaCorta(m.createdAt), m.sku ?? '—', m.nombreProducto ?? '—',
    badge(m.tipo),
    `${m.cantidad > 0 ? '+' : ''}${m.cantidad}`,
    `${etiqueta(m.referenciaTipo ?? '')} #${m.referenciaId ?? '—'}`,
    m.usuario?.nombre ?? '—',
  ]));
  panel.appendChild(tabla(['Fecha', 'SKU', 'Producto', 'Tipo', 'Cantidad', 'Referencia', 'Usuario'], filasKardex));
}

// ---------- 9. Mensajes de contacto ----------
export function renderizarMensajes(panel, mensajes, { filtroLeido, onFiltrar, onMarcarLeido }) {
  panel.textContent = '';

  const cab = el('div', 'cabecera-tabla');
  cab.appendChild(el('h3', null, `Bandeja de contacto (${mensajes.length})`));
  const selFiltro = el('select');
  selFiltro.setAttribute('aria-label', 'Filtrar mensajes por estado de lectura');
  [['todos', 'Todos'], ['false', 'Sin leer'], ['true', 'Leídos']].forEach(([v, t]) => {
    const opt = el('option');
    opt.value = v;
    opt.textContent = t;
    if (v === filtroLeido) opt.selected = true;
    selFiltro.appendChild(opt);
  });
  selFiltro.addEventListener('change', () => onFiltrar(selFiltro.value));
  cab.appendChild(selFiltro);
  panel.appendChild(cab);

  if (!mensajes.length) { vacio(panel, 'No hay mensajes con ese filtro.'); return; }

  mensajes.forEach((m) => {
    const articulo = el('article', 'pedido mensaje-contacto');
    const h4 = el('h4', null, `${m.nombre} — ${m.email}`);
    const meta = el('p', 'pedido__meta');
    meta.append(fechaCorta(m.createdAt), ' ', m.leido ? badgeTexto('Leído') : badgeTexto('Sin leer', 'badge-pendiente'));
    const cuerpo = el('p', 'mensaje-texto', m.mensaje);
    const extra = el('p', 'ayuda-password', [m.telefono ? `Tel: ${m.telefono}` : '', m.canalPreferido ? `Canal: ${etiqueta(m.canalPreferido)}` : '', m.usuario ? `Cuenta: ${m.usuario.nombre}` : 'Invitado'].filter(Boolean).join(' · '));

    articulo.append(h4, meta, cuerpo, extra);
    if (!m.leido) {
      articulo.appendChild(boton('Marcar como leído', `Marcar el mensaje de ${m.nombre} como leído`, () => onMarcarLeido(m)));
    }
    panel.appendChild(articulo);
  });
}

// ---------- 10. Parámetros ----------
export function renderizarParametros(panel, parametros, { onGuardar }) {
  panel.textContent = '';
  cabecera(panel, `Parámetros del sistema (${parametros.length})`);
  panel.appendChild(el('p', 'ayuda-password', 'Los cambios se aplican a los próximos pedidos (IVA, envío, moneda…).'));

  const filas = parametros.map((p) => {
    const input = el('input');
    input.type = 'text';
    input.value = p.valor;
    input.maxLength = 120;
    input.setAttribute('aria-label', `Valor del parámetro ${p.clave}`);
    const fila = filaTabla([
      p.clave,
      p.descripcion ?? '—',
      input,
      fechaCorta(p.updatedAt),
      boton('Guardar', `Guardar el parámetro ${p.clave}`, () => onGuardar(p, input.value.trim())),
    ]);
    return fila;
  });
  panel.appendChild(tabla(['Clave', 'Descripción', 'Valor', 'Actualizado', 'Acción'], filas));
}

// ---------- 11. Auditoría ----------
export function renderizarAuditoria(panel, datos, { filtros, onFiltrar }) {
  panel.textContent = '';
  const filas = datos.filas ?? [];

  const cab = el('div', 'cabecera-tabla');
  cab.appendChild(el('h3', null, `Auditoría (${datos.total ?? filas.length} registros)`));
  const inputTabla = el('input');
  inputTabla.type = 'text';
  inputTabla.placeholder = 'Tabla (ej: pedido)';
  inputTabla.value = filtros.tabla ?? '';
  inputTabla.setAttribute('aria-label', 'Filtrar auditoría por tabla');
  const selAccion = el('select');
  selAccion.setAttribute('aria-label', 'Filtrar auditoría por acción');
  ['todas', ...ACCIONES_AUDITORIA].forEach((a) => {
    const opt = el('option');
    opt.value = a;
    opt.textContent = a === 'todas' ? 'Todas las acciones' : etiqueta(a);
    if (a === filtros.accion) opt.selected = true;
    selAccion.appendChild(opt);
  });
  const btnFiltrar = boton('Filtrar', 'Aplicar los filtros de auditoría', () =>
    onFiltrar(inputTabla.value.trim() || undefined, selAccion.value === 'todas' ? undefined : selAccion.value));
  cab.append(inputTabla, selAccion, btnFiltrar);
  panel.appendChild(cab);

  if (!filas.length) { vacio(panel, 'No hay registros con ese filtro.'); return; }

  const tablasFilas = filas.map((a) => {
    const btnVer = boton('Ver cambios', `Ver los datos del registro de auditoría ${a.id}`, () => abrirDetalleAuditoria(a));
    return filaTabla([
      String(a.id), fechaCorta(a.createdAt), a.tabla, String(a.registroId ?? '—'),
      badge(a.accion), a.usuario ? `${a.usuario.nombre} (${a.usuario.email})` : '—', btnVer,
    ]);
  });
  panel.appendChild(tabla(['ID', 'Fecha', 'Tabla', 'Registro', 'Acción', 'Usuario', 'Acciones'], tablasFilas));
}

function abrirDetalleAuditoria(a) {
  const { modal, cuerpo, acciones } = montarModal(`modal-auditoria-${a.id}`, `Auditoría #${a.id} — ${a.tabla} (${etiqueta(a.accion)})`);
  const pintar = (titulo, datos) => {
    const caja = el('div', 'ficha-pedido');
    caja.appendChild(el('h4', null, titulo));
    const pre = el('pre', 'codigo-auditoria');
    pre.textContent = datos ? JSON.stringify(datos, null, 2) : '(vacío)';
    caja.appendChild(pre);
    return caja;
  };
  cuerpo.append(
    pintar('Datos anteriores', a.datosAnteriores),
    pintar('Datos nuevos', a.datosNuevos),
  );
  acciones.appendChild(boton('Cerrar', 'Cerrar el detalle de auditoría', () => cerrarModal(modal), 'btn btn-dorado'));
  abrirModal(modal, document.activeElement);
}
