// uiComponents.js — alertas, toasts, modal accesible y spinners
// Regla anti-XSS: todo se construye con createElement/textContent, nunca innerHTML.

// ---------- Toasts (región aria-live polite) ----------
let contenedorToasts = null;

function asegurarContenedor() {
  if (!contenedorToasts) {
    contenedorToasts = document.createElement('div');
    contenedorToasts.className = 'toasts';
    contenedorToasts.setAttribute('role', 'status');
    contenedorToasts.setAttribute('aria-live', 'polite');
    contenedorToasts.setAttribute('aria-label', 'Notificaciones');
    document.body.appendChild(contenedorToasts);
  }
  return contenedorToasts;
}

export function toast(mensaje, tipo = 'info', ms = 3800) {
  const zona = asegurarContenedor();
  const t = document.createElement('p');
  t.className = `toast toast-${tipo}`;
  t.textContent = mensaje;
  zona.appendChild(t);
  setTimeout(() => t.remove(), ms);
  return t;
}

// ---------- Mensaje accesible en una región ----------
export function mensajeEn(el, texto, tipo = 'info') {
  if (!el) return;
  el.textContent = texto || '';
  el.className = tipo === 'error' ? 'error' : tipo === 'ok' ? 'exito' : 'info';
  el.hidden = !texto;
}

// ---------- Spinner de carga ----------
export function spinner(texto = 'Cargando…') {
  const d = document.createElement('div');
  d.className = 'cargando';
  d.setAttribute('role', 'status');
  d.setAttribute('aria-live', 'polite');
  const s = document.createElement('span');
  s.className = 'spinner';
  s.setAttribute('aria-hidden', 'true');
  const t = document.createElement('span');
  t.textContent = texto;
  d.append(s, t);
  return d;
}

// ---------- Modal accesible (foco atrapado, Esc, retorno de foco) ----------
export function abrirModal(modal, disparador) {
  const ultimoFoco = disparador || document.activeElement;
  // Referencia directa al elemento que abrió el modal (para devolverle el foco)
  modal._disparador = ultimoFoco || null;
  if (!modal.hasAttribute('tabindex')) modal.tabIndex = -1;
  modal.hidden = false;
  // La clase se añade ANTES de calcular los enfocables: con display:none todos
  // tendrían offsetParent null y la lista de foco quedaría vacía.
  modal.classList.add('abierto');

  const enfocables = () =>
    [...modal.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
  const focoInicial = () => modal.querySelector('[data-foco]') || enfocables()[0] || modal;
  // El foco inicial se aplica en el siguiente frame, ya con el modal visible
  requestAnimationFrame(() => focoInicial().focus());

  function alTabular(e) {
    if (e.key !== 'Tab') return;
    const lista = enfocables();
    if (!lista.length) return;
    const primero = lista[0];
    const ultimo = lista[lista.length - 1];
    if (e.shiftKey && document.activeElement === primero) { ultimo.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { primero.focus(); e.preventDefault(); }
  }
  function alEscape(e) {
    if (e.key === 'Escape') cerrarModal(modal);
  }
  modal._manejadores = { alTabular, alEscape };
  modal.addEventListener('keydown', alTabular);
  document.addEventListener('keydown', alEscape, true);
}

export function cerrarModal(modal) {
  modal.classList.remove('abierto');
  setTimeout(() => { modal.hidden = true; }, 250);
  if (modal._manejadores) {
    modal.removeEventListener('keydown', modal._manejadores.alTabular);
    document.removeEventListener('keydown', modal._manejadores.alEscape, true);
    delete modal._manejadores;
  }
  // Retorno del foco al elemento que abrió el modal (si sigue en el DOM)
  const destino = modal._disparador;
  if (destino && destino.isConnected) destino.focus();
}

// ---------- Modal de confirmación (promesa) ----------
export function confirmar({ titulo, mensaje, textoOk = 'Confirmar', textoCancelar = 'Cancelar', peligro = false }) {
  return new Promise((resolver) => {
    let modal = document.getElementById('modal-confirmacion');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-confirmacion';
      modal.className = 'panel-login';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'confirmacion-titulo');
      modal.hidden = true;
      const contenido = document.createElement('div');
      contenido.className = 'panel-login__contenido';
      const h2 = document.createElement('h2');
      h2.id = 'confirmacion-titulo';
      const p = document.createElement('p');
      p.id = 'confirmacion-mensaje';
      const acciones = document.createElement('div');
      acciones.className = 'acciones-modal';
      const btnOk = document.createElement('button');
      btnOk.id = 'confirmacion-ok';
      btnOk.className = 'btn';
      btnOk.setAttribute('data-foco', '');
      const btnNo = document.createElement('button');
      btnNo.id = 'confirmacion-cancelar';
      btnNo.className = 'btn btn-rojo';
      acciones.append(btnNo, btnOk);
      contenido.append(h2, p, acciones);
      modal.appendChild(contenido);
      document.body.appendChild(modal);
    }
    modal.querySelector('#confirmacion-titulo').textContent = titulo;
    modal.querySelector('#confirmacion-mensaje').textContent = mensaje;
    const ok = modal.querySelector('#confirmacion-ok');
    ok.textContent = textoOk;
    ok.className = peligro ? 'btn btn-rojo' : 'btn btn-dorado';
    modal.querySelector('#confirmacion-cancelar').textContent = textoCancelar;

    const cerrar = (respuesta) => {
      cerrarModal(modal);
      ok.removeEventListener('click', alOk);
      cancelar.removeEventListener('click', alNo);
      resolver(respuesta);
    };
    const alOk = () => cerrar(true);
    const alNo = () => cerrar(false);
    ok.addEventListener('click', alOk);
    const cancelar = modal.querySelector('#confirmacion-cancelar');
    cancelar.addEventListener('click', alNo);
    abrirModal(modal, document.activeElement);
  });
}
