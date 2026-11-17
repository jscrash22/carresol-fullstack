// pedidosView.js — vista de "Mis pedidos": cada pedido con detalle EXPANDIBLE
// (items, pago, envío con guía y dirección, factura y su historial de estados).
import { spinner } from './uiComponents.js';
import { formatearPrecio } from '../models/productoModel.js';

const ETIQUETAS_ESTADO = {
  pendiente: 'Pendiente', pagado: 'Pagado', preparando: 'En preparación',
  enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado', devuelto: 'Devuelto',
};

export function etiquetaEstado(estado) {
  return ETIQUETAS_ESTADO[estado] ?? estado;
}

function crearBadge(estado) {
  const span = document.createElement('span');
  span.className = `badge badge-${estado}`;
  span.textContent = etiquetaEstado(estado);
  return span;
}

function crearTablaItems(items) {
  const tabla = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = 'Productos del pedido';
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  for (const texto of ['Producto', 'Cantidad', 'Precio unitario', 'Subtotal']) {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = texto;
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  const tbody = document.createElement('tbody');
  for (const d of items || []) {
    const tr = document.createElement('tr');
    const tdNombre = document.createElement('td');
    const partes = [d.material, d.medida].filter(Boolean).join(' · ');
    tdNombre.textContent = partes ? `${d.nombreProducto} (${partes})` : (d.nombreProducto ?? d.sku ?? 'Producto');
    const tdCant = document.createElement('td');
    tdCant.textContent = String(d.cantidad);
    const tdPrecio = document.createElement('td');
    tdPrecio.textContent = formatearPrecio(d.precioUnitario);
    const tdSub = document.createElement('td');
    tdSub.textContent = formatearPrecio(d.subtotal ?? d.precioUnitario * d.cantidad);
    tr.append(tdNombre, tdCant, tdPrecio, tdSub);
    tbody.appendChild(tr);
  }
  tabla.append(caption, thead, tbody);
  return tabla;
}

function crearFicha(titulo, pares) {
  const caja = document.createElement('div');
  caja.className = 'ficha-pedido';
  const h4 = document.createElement('h4');
  h4.textContent = titulo;
  const dl = document.createElement('dl');
  for (const [termino, valor] of pares) {
    if (valor === null || valor === undefined || valor === '') continue;
    const dt = document.createElement('dt');
    dt.textContent = termino;
    const dd = document.createElement('dd');
    dd.textContent = String(valor);
    dl.append(dt, dd);
  }
  caja.append(h4, dl);
  return caja;
}

function crearHistorial(historial = []) {
  const caja = document.createElement('div');
  caja.className = 'ficha-pedido';
  const h4 = document.createElement('h4');
  h4.textContent = 'Historial de estados';
  const ol = document.createElement('ol');
  ol.className = 'historial-estados';
  for (const h of historial) {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = `${h.estadoAnterior ? `${etiquetaEstado(h.estadoAnterior)} → ` : ''}${etiquetaEstado(h.estadoNuevo)}`;
    const p = document.createElement('span');
    const detalle = [h.comentario, h.usuario?.nombre, new Date(h.createdAt).toLocaleString('es-EC')]
      .filter(Boolean).join(' — ');
    p.textContent = detalle;
    li.append(strong, p);
    ol.appendChild(li);
  }
  caja.append(h4, ol);
  return caja;
}

// Envoltura tonta para append de nodos
function crearPedido(pedido, { onCancelar } = {}) {
  const seccion = document.createElement('article');
  seccion.className = 'pedido';
  seccion.setAttribute('aria-labelledby', `pedido-${pedido.id}`);

  const h3 = document.createElement('h3');
  h3.id = `pedido-${pedido.id}`;
  h3.textContent = `Pedido n.º ${pedido.numeroPedido ?? pedido.id}`;

  const meta = document.createElement('p');
  meta.className = 'pedido__meta';
  const fecha = new Date(pedido.createdAt).toLocaleString('es-EC');
  meta.append(
    `Fecha: ${fecha} — Total: ${formatearPrecio(pedido.total)} `,
    crearBadge(pedido.estado),
  );

  const btnDetalle = document.createElement('button');
  btnDetalle.className = 'btn btn-mini';
  btnDetalle.setAttribute('aria-expanded', 'false');
  btnDetalle.setAttribute('aria-controls', `detalle-pedido-${pedido.id}`);
  btnDetalle.textContent = 'Ver detalle';

  const detalle = document.createElement('div');
  detalle.id = `detalle-pedido-${pedido.id}`;
  detalle.className = 'detalle-pedido';
  detalle.hidden = true;

  let cargado = false;
  btnDetalle.addEventListener('click', () => {
    const abierto = detalle.hidden;
    detalle.hidden = !abierto;
    btnDetalle.setAttribute('aria-expanded', String(abierto));
    btnDetalle.textContent = abierto ? 'Ocultar detalle' : 'Ver detalle';
    if (abierto && !cargado) {
      detalle.append(
        crearTablaItems(pedido.items),
        crearFicha('Pago', [
          ['Método', pedido.pago?.metodo],
          ['Estado', pedido.pago?.estado],
          ['Referencia', pedido.pago?.referenciaExterna],
          ['Monto', pedido.pago ? formatearPrecio(pedido.pago.monto) : null],
        ]),
        crearFicha('Envío', [
          ['Estado', pedido.envio ? etiquetaEstado(pedido.envio.estado) : null],
          ['Transportista', pedido.envio?.transportista],
          ['Número de guía', pedido.envio?.numeroGuia],
          ['Costo', pedido.envio ? formatearPrecio(pedido.envio.costo) : null],
          ['Dirección', pedido.envio?.direccion
            ? `${pedido.envio.direccion.alias}: ${pedido.envio.direccion.callePrincipal} ${pedido.envio.direccion.numeracion}, ${pedido.envio.direccion.ciudad}`
            : 'Sin dirección (retiro en tienda)'],
        ]),
        crearFicha('Factura', [
          ['Número', pedido.factura?.numero],
          ['Clave de acceso', pedido.factura?.claveAcceso],
          ['Razón social', pedido.factura?.razonSocial],
          ['Total', pedido.factura ? formatearPrecio(pedido.factura.total) : null],
        ]),
        crearHistorial(pedido.historial),
      );
      cargado = true;
    }
  });

  // El cliente puede cancelar sus pedidos mientras no estén en camino
  const cancelable = ['pendiente', 'pagado', 'preparando'].includes(pedido.estado);
  if (cancelable && onCancelar) {
    const btnCancelar = document.createElement('button');
    btnCancelar.className = 'btn btn-mini btn-rojo';
    btnCancelar.textContent = 'Cancelar pedido';
    btnCancelar.setAttribute('aria-label', `Cancelar el pedido n.º ${pedido.numeroPedido ?? pedido.id}`);
    btnCancelar.addEventListener('click', () => onCancelar(pedido));
    meta.append(' ', btnCancelar);
  }

  seccion.append(h3, meta, btnDetalle, detalle);
  return seccion;
}

export function renderizar(contenedor, pedidos, { onCancelar } = {}) {
  contenedor.textContent = '';
  if (!pedidos.length) {
    const p = document.createElement('p');
    p.className = 'mensaje-vacio';
    p.textContent = 'Todavía no tienes pedidos. Explora el catálogo y realiza tu primera compra.';
    contenedor.appendChild(p);
    return;
  }
  pedidos.forEach((pedido) => contenedor.appendChild(crearPedido(pedido, { onCancelar })));
}

export function renderizarCargando(contenedor) {
  contenedor.textContent = '';
  contenedor.appendChild(spinner('Buscando tus pedidos…'));
}

export function renderizarError(contenedor, mensaje) {
  contenedor.textContent = '';
  const p = document.createElement('p');
  p.className = 'estado-error';
  p.setAttribute('role', 'alert');
  p.textContent = mensaje;
  contenedor.appendChild(p);
}
