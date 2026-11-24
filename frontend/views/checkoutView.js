// checkoutView.js — vista del checkout (§7): dirección (existente o nueva),
// método de pago (radio group accesible, sin campos de tarjeta), datos de
// facturación (consumidor final / cédula / RUC) y resumen con subtotal, envío,
// IVA y total. Solo pinta; el controlador orquesta.
import { construirFormularioDireccion } from './direccionFormView.js';
import { formatearPrecio } from '../models/productoModel.js';
import { IVA, ENVIO_ESTIMADO } from '../config.js';

const METODOS_PAGO = [
  { id: 'tarjeta', etiqueta: 'Tarjeta de crédito/débito', detalle: 'Pago simulado: no se piden datos de la tarjeta.' },
  { id: 'transferencia', etiqueta: 'Transferencia bancaria', detalle: 'El pedido queda pendiente hasta confirmar el depósito.' },
  { id: 'deposito', etiqueta: 'Depósito', detalle: 'El pedido queda pendiente hasta confirmar el depósito.' },
  { id: 'contra_entrega', etiqueta: 'Pago contra entrega', detalle: 'Se paga al recibir el pedido.' },
];

const TIPOS_FACTURACION = [
  { id: 'consumidor_final', etiqueta: 'Consumidor final', detalle: 'Sin identificación (9999999999999).' },
  { id: 'cedula', etiqueta: 'Con cédula', detalle: 'Factura a nombre de tu cédula.' },
  { id: 'ruc', etiqueta: 'Con RUC', detalle: 'Factura a nombre de una empresa.' },
];

function crearRadio({ nombre, valor, etiqueta, detalle, marcado, obligatorio = false }) {
  const envoltura = document.createElement('div');
  envoltura.className = 'radio-opcion';
  const input = document.createElement('input');
  input.type = 'radio';
  input.id = `${nombre}-${valor}`;
  input.name = nombre;
  input.value = valor;
  input.checked = marcado;
  if (obligatorio) input.setAttribute('aria-required', 'true');
  const label = document.createElement('label');
  label.htmlFor = input.id;
  const strong = document.createElement('strong');
  strong.textContent = etiqueta;
  label.appendChild(strong);
  if (detalle) {
    const p = document.createElement('span');
    p.className = 'ayuda-password';
    p.textContent = detalle;
    label.appendChild(p);
  }
  envoltura.append(input, label);
  return { envoltura, input };
}

// Construye todo el checkout. Devuelve referencias para que el controlador
// lea el estado: { contenedor, formulario, formDireccion, radios... }
export function construirCheckout(contenedor, { direcciones, items, totales, onAgregarNueva }) {
  contenedor.textContent = '';
  const layout = document.createElement('div');
  layout.className = 'checkout-grid';

  const form = document.createElement('form');
  form.id = 'form-checkout';
  form.noValidate = true;

  // ---------- 1. Dirección ----------
  const fsDir = document.createElement('fieldset');
  const legendDir = document.createElement('legend');
  legendDir.textContent = '1. Dirección de envío';
  fsDir.appendChild(legendDir);

  const radiosDir = document.createElement('div');
  radiosDir.className = 'radios';
  radiosDir.setAttribute('role', 'radiogroup');
  radiosDir.setAttribute('aria-label', 'Elegir dirección de envío');
  const inputsDireccion = [];
  direcciones.forEach((d, i) => {
    const { envoltura, input } = crearRadio({
      nombre: 'checkout-direccion',
      valor: String(d.id),
      etiqueta: d.alias,
      detalle: `${d.destinatario} — ${d.callePrincipal} ${d.numeracion}, ${d.ciudad} (${d.provincia}) · Tel: ${d.telefono}${d.esPredeterminada ? ' · Predeterminada' : ''}`,
      marcado: i === 0,
      obligatorio: true,
    });
    radiosDir.appendChild(envoltura);
    inputsDireccion.push(input);
  });
  fsDir.appendChild(radiosDir);

  const btnNueva = document.createElement('button');
  btnNueva.type = 'button';
  btnNueva.id = 'btn-nueva-direccion';
  btnNueva.className = 'btn btn-mini';
  btnNueva.textContent = '+ Usar otra dirección';
  const cajaNueva = document.createElement('div');
  cajaNueva.id = 'checkout-form-direccion';
  cajaNueva.className = 'caja-nueva-direccion';
  cajaNueva.hidden = true;
  btnNueva.addEventListener('click', () => onAgregarNueva());
  fsDir.append(btnNueva, cajaNueva);

  // ---------- 2. Método de pago ----------
  const fsPago = document.createElement('fieldset');
  const legendPago = document.createElement('legend');
  legendPago.textContent = '2. Método de pago';
  fsPago.appendChild(legendPago);
  const radiosPago = document.createElement('div');
  radiosPago.className = 'radios';
  radiosPago.setAttribute('role', 'radiogroup');
  radiosPago.setAttribute('aria-label', 'Método de pago');
  const inputsPago = [];
  METODOS_PAGO.forEach((m, i) => {
    const { envoltura, input } = crearRadio({
      nombre: 'checkout-pago', valor: m.id, etiqueta: m.etiqueta,
      detalle: m.detalle, marcado: i === 0,
    });
    radiosPago.appendChild(envoltura);
    inputsPago.push(input);
  });
  fsPago.appendChild(radiosPago);

  // ---------- 3. Facturación ----------
  const fsFact = document.createElement('fieldset');
  const legendFact = document.createElement('legend');
  legendFact.textContent = '3. Datos de facturación';
  fsFact.appendChild(legendFact);
  const radiosFact = document.createElement('div');
  radiosFact.className = 'radios';
  radiosFact.setAttribute('role', 'radiogroup');
  radiosFact.setAttribute('aria-label', 'Tipo de identificación para facturar');
  const inputsFact = [];
  TIPOS_FACTURACION.forEach((t, i) => {
    const { envoltura, input } = crearRadio({
      nombre: 'checkout-facturacion', valor: t.id, etiqueta: t.etiqueta,
      detalle: t.detalle, marcado: i === 0,
    });
    radiosFact.appendChild(envoltura);
    inputsFact.push(input);
  });
  fsFact.appendChild(radiosFact);

  // Campos condicionales de facturación
  const cajaId = document.createElement('div');
  cajaId.className = 'campo';
  cajaId.id = 'campo-fact-identificacion';
  cajaId.hidden = true;
  const lblId = document.createElement('label');
  lblId.htmlFor = 'checkout-identificacion';
  lblId.textContent = 'Número de identificación *';
  const inputId = document.createElement('input');
  inputId.type = 'text';
  inputId.id = 'checkout-identificacion';
  inputId.maxLength = 20;
  inputId.setAttribute('aria-describedby', 'error-fact-identificacion');
  const errId = document.createElement('span');
  errId.id = 'error-fact-identificacion';
  errId.className = 'error';
  errId.setAttribute('role', 'alert');
  cajaId.append(lblId, inputId, errId);

  const cajaRazon = document.createElement('div');
  cajaRazon.className = 'campo';
  cajaRazon.id = 'campo-fact-razon';
  cajaRazon.hidden = true;
  const lblRazon = document.createElement('label');
  lblRazon.htmlFor = 'checkout-razon';
  lblRazon.textContent = 'Razón social *';
  const inputRazon = document.createElement('input');
  inputRazon.type = 'text';
  inputRazon.id = 'checkout-razon';
  inputRazon.maxLength = 120;
  inputRazon.setAttribute('aria-describedby', 'error-fact-razon');
  const errRazon = document.createElement('span');
  errRazon.id = 'error-fact-razon';
  errRazon.className = 'error';
  errRazon.setAttribute('role', 'alert');
  cajaRazon.append(lblRazon, inputRazon, errRazon);

  inputsFact.forEach((r) => r.addEventListener('change', () => {
    cajaId.hidden = r.value !== 'cedula' && r.value !== 'ruc';
    inputId.value = '';
    errId.textContent = '';
    cajaRazon.hidden = r.value !== 'ruc';
    inputRazon.value = '';
    errRazon.textContent = '';
    lblId.textContent = r.value === 'ruc' ? 'RUC (13 dígitos) *' : 'Cédula (10 dígitos) *';
  }));
  fsFact.append(cajaId, cajaRazon);

  // ---------- Notas + aviso + botón ----------
  const campoNotas = document.createElement('div');
  campoNotas.className = 'campo';
  const lblNotas = document.createElement('label');
  lblNotas.htmlFor = 'checkout-notas';
  lblNotas.textContent = 'Notas del pedido (opcional)';
  const txtNotas = document.createElement('textarea');
  txtNotas.id = 'checkout-notas';
  txtNotas.rows = 3;
  txtNotas.maxLength = 500;
  campoNotas.append(lblNotas, txtNotas);

  const aviso = document.createElement('p');
  aviso.id = 'checkout-aviso';
  aviso.className = 'error';
  aviso.setAttribute('role', 'alert');
  aviso.setAttribute('aria-live', 'assertive');

  const btnConfirmar = document.createElement('button');
  btnConfirmar.type = 'submit';
  btnConfirmar.id = 'btn-confirmar-pedido';
  btnConfirmar.className = 'btn btn-dorado';
  btnConfirmar.textContent = 'Confirmar pedido';

  form.append(fsDir, fsPago, fsFact, campoNotas, aviso, btnConfirmar);

  // ---------- Resumen ----------
  const resumen = document.createElement('aside');
  resumen.className = 'checkout-resumen';
  resumen.setAttribute('aria-labelledby', 'titulo-resumen-checkout');
  const h3 = document.createElement('h3');
  h3.id = 'titulo-resumen-checkout';
  h3.textContent = 'Resumen del pedido';
  const ul = document.createElement('ul');
  ul.className = 'checkout-items';
  for (const item of items) {
    const li = document.createElement('li');
    const partes = [item.material, item.medida].filter(Boolean).join(' · ');
    const nombre = document.createElement('strong');
    nombre.textContent = `${item.nombre}${partes ? ` (${partes})` : ''}`;
    const resto = document.createElement('span');
    resto.textContent = ` × ${item.cantidad} — ${formatearPrecio(item.precio * item.cantidad)}`;
    li.append(nombre, resto);
    ul.appendChild(li);
  }
  const dl = document.createElement('dl');
  const agregar = (termino, valor, destacado = false) => {
    const dt = document.createElement('dt');
    dt.textContent = termino;
    const dd = document.createElement('dd');
    dd.textContent = valor;
    if (destacado) { dt.className = 'total-fila'; dd.className = 'total-fila'; }
    dl.append(dt, dd);
  };
  const ivaValor = totales.subtotal * IVA;
  agregar('Subtotal', formatearPrecio(totales.subtotal));
  agregar(`IVA (${Math.round(IVA * 100)}%)`, formatearPrecio(ivaValor));
  agregar('Envío', `${formatearPrecio(ENVIO_ESTIMADO)} (estándar)`);
  agregar('Total estimado', formatearPrecio(totales.subtotal + ivaValor + ENVIO_ESTIMADO), true);
  const ayuda = document.createElement('p');
  ayuda.className = 'ayuda-password';
  ayuda.textContent = 'Puedes pedir todas las unidades que haya en stock (sin límite de 10). El servidor valida el stock y calcula subtotal, envío, IVA y total definitivos.';
  resumen.append(h3, ul, dl, ayuda);

  layout.append(form, resumen);
  contenedor.appendChild(layout);

  return {
    formulario: form,
    radiosDireccion: inputsDireccion,
    radiosPago: inputsPago,
    radiosFacturacion: inputsFact,
    inputIdentificacion: inputId,
    inputRazonSocial: inputRazon,
    errIdentificacion: errId,
    errRazonSocial: errRazon,
    textareaNotas: txtNotas,
    aviso,
    btnConfirmar,
    cajaNuevaDireccion: cajaNueva,
    MAX_POR_VARIANTE,
  };
}

// Pinta el formulario de nueva dirección dentro de la caja del checkout
export function pintarFormularioDireccion(caja) {
  const form = construirFormularioDireccion('chk');
  caja.textContent = '';
  caja.appendChild(form.contenedor);
  caja.hidden = false;
  return form;
}

// Éxito: número de pedido, total y factura (§7)
export function renderizarExito(contenedor, pedido) {
  contenedor.textContent = '';
  contenedor.hidden = false;
  const caja = document.createElement('div');
  caja.className = 'pedido exito-pedido';
  caja.setAttribute('role', 'status');
  caja.setAttribute('aria-live', 'polite');
  caja.setAttribute('tabindex', '-1');

  const h3 = document.createElement('h3');
  h3.textContent = '¡Pedido confirmado!';
  const p1 = document.createElement('p');
  p1.className = 'pedido__meta';
  const strong1 = document.createElement('strong');
  strong1.textContent = `Pedido n.º ${pedido.numeroPedido}`;
  p1.append('Gracias por tu compra. ', strong1);

  const tabla = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = 'Resumen del pedido confirmado';
  const tbody = document.createElement('tbody');
  const filas = [
    ['Estado', pedido.estado],
    ['Subtotal', formatearPrecio(pedido.subtotal)],
    ['Envío', formatearPrecio(pedido.costoEnvio)],
    [`IVA (${pedido.ivaPorcentaje}%)`, formatearPrecio(pedido.ivaValor)],
    ['Total pagado', formatearPrecio(pedido.total)],
    ['Método de pago', pedido.pago ? `${pedido.pago.metodo} (${pedido.pago.estado})` : '—'],
    ['Número de factura', pedido.factura?.numero ?? '—'],
    ['Clave de acceso', pedido.factura?.claveAcceso ?? '—'],
  ];
  if (pedido.envio?.direccion) {
    const d = pedido.envio.direccion;
    filas.push(['Envío a', `${d.alias}: ${d.callePrincipal} ${d.numeracion}, ${d.ciudad}`]);
  }
  for (const [termino, valor] of filas) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.setAttribute('scope', 'row');
    th.textContent = termino;
    const td = document.createElement('td');
    td.textContent = String(valor);
    tr.append(th, td);
    tbody.appendChild(tr);
  }
  tabla.append(caption, tbody);

  const acciones = document.createElement('div');
  acciones.className = 'panel-carrito__acciones';
  const aPedidos = document.createElement('a');
  aPedidos.className = 'btn btn-dorado';
  aPedidos.href = '#/cuenta';
  aPedidos.textContent = 'Ver mis pedidos';
  const aCatalogo = document.createElement('a');
  aCatalogo.className = 'btn';
  aCatalogo.href = '#/catalogo';
  aCatalogo.textContent = 'Seguir comprando';
  acciones.append(aPedidos, aCatalogo);

  caja.append(h3, p1, tabla, acciones);
  contenedor.appendChild(caja);
  caja.focus();
  return caja;
}
