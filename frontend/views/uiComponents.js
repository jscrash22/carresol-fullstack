// uiComponents.js — alertas, avisos, toasts, modales accesibles, cierre
// compartido, esqueletos y spinners.
// Regla anti-XSS: todo se construye con createElement/textContent (o SVG
// mediante createElementNS), nunca con innerHTML.

import { sesion, CLAVES } from '../models/almacenamiento.js';

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

// ---------- Avisos visibles y persistentes (registro, errores, estado) ----------
const AVISO_DURACION_MS = 6000;
let avisoGlobalMostrado = false;

const ICONOS_AVISO = { exito: '✅', error: '⚠️', info: 'ℹ️' };

export function crearAviso({ texto = '', tipo = 'info', id = null, cerrable = true, ms = 0, onCerrar = null } = {}) {
  const caja = document.createElement('div');
  caja.className = `aviso aviso--${tipo}`;
  caja.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  caja.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
  if (id) caja.id = id;

  const icono = document.createElement('span');
  icono.className = 'aviso__icono';
  icono.setAttribute('aria-hidden', 'true');
  icono.textContent = ICONOS_AVISO[tipo] || ICONOS_AVISO.info;

  const mensaje = document.createElement('span');
  mensaje.className = 'aviso__texto';
  mensaje.textContent = texto;

  caja.append(icono, mensaje);

  if (cerrable) {
    caja.appendChild(crearBotonCerrar({
      etiqueta: 'Cerrar aviso',
      compacto: true,
      onCerrar: () => {
        if (onCerrar) onCerrar();
        caja.remove();
      },
    }));
  }
  if (ms > 0) setTimeout(() => caja.remove(), ms);
  return caja;
}

// Pinta un aviso DENTRO del formulario (no solo un toast).
export function mostrarAviso(destino, texto, opciones = {}) {
  if (!destino) return null;
  destino.textContent = '';
  if (!texto) {
    destino.hidden = true;
    return null;
  }
  const caja = crearAviso({ texto, ...opciones });
  destino.appendChild(caja);
  destino.hidden = false;
  return caja;
}

export function guardarAvisoGlobal(texto, tipo = 'exito') {
  sesion.set(CLAVES.AVISO_GLOBAL, { texto, tipo, creadoEn: Date.now() });
  avisoGlobalMostrado = false;
}

export function limpiarAvisoGlobal() {
  sesion.remove(CLAVES.AVISO_GLOBAL);
  avisoGlobalMostrado = false;
}

// Banner superior que sobrevive a la navegación tras el registro.
export function renderizarAvisoGlobal() {
  const destino = document.getElementById('aviso-global');
  if (!destino) return;
  const aviso = sesion.json(CLAVES.AVISO_GLOBAL, null);
  if (!aviso?.texto) {
    destino.textContent = '';
    destino.hidden = true;
    return;
  }
  if (avisoGlobalMostrado && destino.childElementCount) return;
  destino.textContent = '';
  const caja = crearAviso({
    texto: aviso.texto,
    tipo: aviso.tipo || 'exito',
    ms: 0,
    onCerrar: limpiarAvisoGlobal,
  });
  destino.appendChild(caja);
  destino.hidden = false;
  avisoGlobalMostrado = true;
  setTimeout(() => {
    limpiarAvisoGlobal();
    caja.remove();
    if (!destino.childElementCount) destino.hidden = true;
  }, AVISO_DURACION_MS);
}

// ---------- Botón de cierre compartido ----------
export function crearBotonCerrar({ etiqueta = 'Cerrar', onCerrar = null, compacto = false } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `btn-cerrar ${compacto ? 'btn-cerrar--compacto' : 'btn-cerrar--modal'}`.trim();
  btn.setAttribute('aria-label', etiqueta);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const d of ['M6 6l12 12', 'M18 6L6 18']) {
    const trazo = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trazo.setAttribute('d', d);
    svg.appendChild(trazo);
  }
  btn.appendChild(svg);
  if (onCerrar) btn.addEventListener('click', onCerrar);
  return btn;
}

// Barra superior sticky: el botón sigue visible aunque el contenido haga scroll.
export function crearBarraCierre(modal, etiqueta = 'Cerrar', onCerrar = null) {
  const barra = document.createElement('div');
  barra.className = 'modal__barra-cierre';
  barra.appendChild(crearBotonCerrar({
    etiqueta,
    onCerrar: onCerrar || (() => cerrarModal(modal)),
  }));
  return barra;
}

// Mejora los botones ✕ declarados en index.html sin perder sus ids ni listeners.
export function mejorarBotonesCerrarEstaticos(raiz = document) {
  raiz.querySelectorAll('.btn-cerrar').forEach((btn) => {
    if (btn.querySelector('svg')) return;
    const etiqueta = btn.getAttribute('aria-label') || 'Cerrar';
    const reemplazo = crearBotonCerrar({ etiqueta });
    reemplazo.id = btn.id;
    reemplazo.className = `${btn.className} btn-cerrar--modal`.trim();
    btn.replaceWith(reemplazo);
  });
}

// ---------- Spinner y esqueletos ----------
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

export function esqueletos(cantidad = 8) {
  const fragmento = document.createDocumentFragment();
  for (let i = 0; i < cantidad; i += 1) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'skeleton skeleton--card';
    tarjeta.setAttribute('aria-hidden', 'true');
    const imagen = document.createElement('div');
    imagen.className = 'skeleton__bloque skeleton__imagen';
    const titulo = document.createElement('div');
    titulo.className = 'skeleton__bloque skeleton__linea';
    titulo.style.width = '72%';
    const linea = document.createElement('div');
    linea.className = 'skeleton__bloque skeleton__linea';
    linea.style.width = '48%';
    tarjeta.append(imagen, titulo, linea);
    fragmento.appendChild(tarjeta);
  }
  return fragmento;
}

// ---------- Modal accesible (foco atrapado, Esc, fondo, retorno de foco) ----------
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
  function alFondo(e) {
    if (e.target === modal) cerrarModal(modal);
  }
  modal._manejadores = { alTabular, alEscape, alFondo };
  modal.addEventListener('keydown', alTabular);
  modal.addEventListener('click', alFondo);
  document.addEventListener('keydown', alEscape, true);
}

export function cerrarModal(modal) {
  modal.classList.remove('abierto');
  setTimeout(() => { modal.hidden = true; }, 250);
  if (modal._manejadores) {
    modal.removeEventListener('keydown', modal._manejadores.alTabular);
    modal.removeEventListener('click', modal._manejadores.alFondo);
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
    const cancelar = modal.querySelector('#confirmacion-cancelar');
    cancelar.textContent = textoCancelar;

    const cerrar = (respuesta) => {
      cerrarModal(modal);
      ok.removeEventListener('click', alOk);
      cancelar.removeEventListener('click', alNo);
      resolver(respuesta);
    };
    const alOk = () => cerrar(true);
    const alNo = () => cerrar(false);

    const contenido = modal.querySelector('.panel-login__contenido');
    if (!contenido.querySelector('.modal__barra-cierre')) {
      contenido.prepend(crearBarraCierre(modal, 'Cerrar confirmación', () => cerrar(false)));
    }
    ok.addEventListener('click', alOk);
    cancelar.addEventListener('click', alNo);
    abrirModal(modal, document.activeElement);
  });
}
