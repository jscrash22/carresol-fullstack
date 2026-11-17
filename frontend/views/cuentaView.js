// cuentaView.js — vista "Mi cuenta" (§7): pestañas Direcciones / Mis pedidos.
// Solo pinta; cuentaController orquesta. Patrón tablist ARIA con flechas.
import { construirFormularioDireccion } from './direccionFormView.js';
import * as pedidosVista from './pedidosView.js';
import { abrirModal, cerrarModal, spinner } from './uiComponents.js';

export const PESTANAS_CUENTA = [
  { id: 'direcciones', etiqueta: 'Direcciones' },
  { id: 'pedidos', etiqueta: 'Mis pedidos' },
];

// Crea (una sola vez) el tablist y los paneles dentro de la vista
export function inicializarEstructura(vista, onCambiar) {
  if (vista.querySelector('#cuenta-tabs')) return;
  const tabs = document.createElement('div');
  tabs.id = 'cuenta-tabs';
  tabs.className = 'filtros';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Secciones de mi cuenta');
  vista.appendChild(tabs);
  for (const tab of PESTANAS_CUENTA) {
    const panel = document.createElement('div');
    panel.id = `panel-cuenta-${tab.id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-cuenta-${tab.id}`);
    panel.className = 'panel-tabla';
    panel.hidden = true;
    vista.appendChild(panel);
  }
}

export function renderizarPestanas(vista, activa, onCambiar) {
  const lista = vista.querySelector('#cuenta-tabs');
  lista.textContent = '';
  PESTANAS_CUENTA.forEach((tab, i) => {
    const b = document.createElement('button');
    b.id = `tab-cuenta-${tab.id}`;
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.className = `filtro${tab.id === activa ? ' activo' : ''}`;
    b.textContent = tab.etiqueta;
    b.setAttribute('aria-selected', String(tab.id === activa));
    b.setAttribute('aria-controls', `panel-cuenta-${tab.id}`);
    b.tabIndex = tab.id === activa ? 0 : -1;
    b.addEventListener('click', () => onCambiar(tab.id));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const siguiente = PESTANAS_CUENTA[(i + delta + PESTANAS_CUENTA.length) % PESTANAS_CUENTA.length];
      // onCambiar re-renderiza los botones: el foco se aplica DESPUÉS, sobre
      // el botón nuevo (si se hiciera antes, el re-render destruiría el foco)
      onCambiar(siguiente.id);
      vista.querySelector(`#tab-cuenta-${siguiente.id}`)?.focus();
    });
    lista.appendChild(b);
  });
  for (const tab of PESTANAS_CUENTA) {
    const panel = vista.querySelector(`#panel-cuenta-${tab.id}`);
    if (panel) panel.hidden = tab.id !== activa;
  }
}

// ---------- Direcciones ----------
export function renderizarDireccionesCargando(panel) {
  panel.textContent = '';
  panel.appendChild(spinner('Buscando tus direcciones…'));
}

export function renderizarError(panel, mensaje, onReintentar) {
  panel.textContent = '';
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
  panel.appendChild(caja);
}

export function renderizarDirecciones(panel, direcciones, { onNueva, onEditar, onEliminar, onPredeterminar }) {
  panel.textContent = '';

  const cabecera = document.createElement('div');
  cabecera.className = 'cabecera-tabla';
  const h3 = document.createElement('h3');
  h3.textContent = 'Direcciones de envío';
  const btnNueva = document.createElement('button');
  btnNueva.className = 'btn btn-dorado';
  btnNueva.textContent = '+ Nueva dirección';
  btnNueva.setAttribute('aria-label', 'Crear una nueva dirección de envío');
  btnNueva.addEventListener('click', onNueva);
  cabecera.append(h3, btnNueva);
  panel.appendChild(cabecera);

  if (!direcciones.length) {
    const p = document.createElement('p');
    p.className = 'mensaje-vacio';
    p.textContent = 'Todavía no tienes direcciones guardadas. Crea una para recibir tus pedidos.';
    panel.appendChild(p);
    return;
  }

  const lista = document.createElement('ul');
  lista.className = 'lista-direcciones';
  direcciones.forEach((d) => {
    const li = document.createElement('li');
    li.className = 'tarjeta-direccion';

    const info = document.createElement('div');
    info.className = 'tarjeta-direccion__info';
    const titulo = document.createElement('h4');
    titulo.textContent = d.alias;
    if (d.esPredeterminada) {
      const badge = document.createElement('span');
      badge.className = 'badge badge-activo';
      badge.textContent = 'Predeterminada';
      titulo.append(' ', badge);
    }
    const p1 = document.createElement('p');
    p1.textContent = `${d.destinatario} — Tel: ${d.telefono}`;
    const p2 = document.createElement('p');
    p2.textContent = `${d.callePrincipal} ${d.numeracion}${d.calleSecundaria ? ` y ${d.calleSecundaria}` : ''}, ${d.ciudad} (${d.provincia})`;
    const p3 = document.createElement('p');
    p3.className = 'ayuda-password';
    p3.textContent = [d.referencia, d.codigoPostal].filter(Boolean).join(' · ') || '—';
    info.append(titulo, p1, p2, p3);

    const acciones = document.createElement('div');
    acciones.className = 'acciones';
    if (!d.esPredeterminada && onPredeterminar) {
      const btnPred = document.createElement('button');
      btnPred.className = 'btn btn-mini';
      btnPred.textContent = 'Marcar predeterminada';
      btnPred.setAttribute('aria-label', `Usar ${d.alias} como dirección predeterminada`);
      btnPred.addEventListener('click', () => onPredeterminar(d));
      acciones.appendChild(btnPred);
    }
    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn btn-mini';
    btnEditar.textContent = 'Editar';
    btnEditar.setAttribute('aria-label', `Editar la dirección ${d.alias}`);
    btnEditar.addEventListener('click', () => onEditar(d));
    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'btn btn-mini btn-rojo';
    btnEliminar.textContent = 'Eliminar';
    btnEliminar.setAttribute('aria-label', `Eliminar la dirección ${d.alias}`);
    btnEliminar.addEventListener('click', () => onEliminar(d));
    acciones.append(btnEditar, btnEliminar);

    li.append(info, acciones);
    lista.appendChild(li);
  });
  panel.appendChild(lista);
}

// ---------- Pedidos (delega en pedidosView) ----------
export function renderizarPedidosCargando(panel) {
  pedidosVista.renderizarCargando(panel);
}

export function renderizarPedidos(panel, pedidos, { onCancelar }) {
  pedidosVista.renderizar(panel, pedidos, { onCancelar });
}

export function renderizarPedidosError(panel, mensaje) {
  pedidosVista.renderizarError(panel, mensaje);
}

// ---------- Modal crear/editar dirección ----------
// onGuardar(datos) → Promise<boolean>: true cierra el modal.
export function abrirFormularioDireccion(direccion, onGuardar) {
  let modal = document.getElementById('modal-direccion');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-direccion';
    modal.className = 'panel-login';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'titulo-modal-direccion');
    modal.hidden = true;
    document.body.appendChild(modal);
  }
  modal.textContent = '';

  const contenido = document.createElement('div');
  contenido.className = 'panel-login__contenido';

  const btnCerrar = document.createElement('button');
  btnCerrar.className = 'btn-cerrar';
  btnCerrar.setAttribute('aria-label', 'Cerrar formulario de dirección');
  btnCerrar.textContent = '✕';
  btnCerrar.addEventListener('click', () => cerrarModal(modal));

  const h2 = document.createElement('h2');
  h2.id = 'titulo-modal-direccion';
  h2.textContent = direccion ? `Editar "${direccion.alias}"` : 'Nueva dirección de envío';

  const form = construirFormularioDireccion('cuenta');
  if (direccion) form.setValores(direccion);

  const error = document.createElement('p');
  error.className = 'error';
  error.setAttribute('role', 'alert');
  error.setAttribute('aria-live', 'polite');

  const acciones = document.createElement('div');
  acciones.className = 'panel-carrito__acciones';
  const btnCancelar = document.createElement('button');
  btnCancelar.type = 'button';
  btnCancelar.className = 'btn btn-rojo';
  btnCancelar.textContent = 'Cancelar';
  btnCancelar.addEventListener('click', () => cerrarModal(modal));
  const btnGuardar = document.createElement('button');
  btnGuardar.type = 'button';
  btnGuardar.className = 'btn btn-dorado';
  btnGuardar.textContent = 'Guardar';
  btnGuardar.setAttribute('data-foco', '');
  btnGuardar.addEventListener('click', async () => {
    if (!form.validar()) {
      error.textContent = 'Revisa los campos marcados en rojo.';
      return;
    }
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando…';
    try {
      const ok = await onGuardar(form.valores());
      if (ok) cerrarModal(modal);
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar';
    }
  });
  acciones.append(btnCancelar, btnGuardar);

  contenido.append(btnCerrar, h2, form.contenedor, error, acciones);
  modal.appendChild(contenido);
  abrirModal(modal, document.activeElement);
  return modal;
}
