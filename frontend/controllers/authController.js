// authController.js — maneja login, registro, sesión actual y cierre de sesión
import * as auth from '../models/authModel.js';
import { toast, abrirModal, cerrarModal, mensajeEn } from '../views/uiComponents.js';
import { cambiarTab, validarPassword, validarEmail, marcarCampo, mostrarErroresBackend } from '../views/loginView.js';
import { sesion, CLAVES } from '../models/almacenamiento.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);

export function pedirVolverAlCheckout() {
  sesion.set(CLAVES.DESTINO_TRAS_LOGIN, '#/checkout');
}

function destinoTrasLogin() {
  const destino = sesion.get(CLAVES.DESTINO_TRAS_LOGIN, '#/catalogo') || '#/catalogo';
  sesion.remove(CLAVES.DESTINO_TRAS_LOGIN);
  return destino;
}

// Borrador SOLO del correo (nunca contraseñas) para no perderlo al recargar.
function recordarCorreo(email) {
  sesion.set(CLAVES.BORRADOR_LOGIN, { email });
}

export function inicializarAuth({ alCambiarSesion }) {
  const vista = $('#vista-login');

  // Tabs login/registro con teclado (izquierda/derecha)
  $('#tab-login').addEventListener('click', () => cambiarTab(vista, 'login'));
  $('#tab-registro').addEventListener('click', () => cambiarTab(vista, 'registro'));

  const borrador = sesion.json(CLAVES.BORRADOR_LOGIN, null);
  if (borrador?.email) $('#login-email').value = borrador.email;

  // ---- Login ----
  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    recordarCorreo(email);
    let valido = true;
    valido = marcarCampo($('#login-email'), $('#error-login-email'), validarEmail(email), 'Correo electrónico inválido.') && valido;
    valido = marcarCampo($('#login-password'), $('#error-login-password'), password.length > 0, 'Ingresa tu contraseña.') && valido;
    if (!valido) return;

    try {
      const usuario = await auth.iniciarSesion(email, password);
      mensajeEn($('#login-aviso'), '');
      $('#form-login').reset();
      toast(`¡Bienvenido/a, ${usuario.nombre}!`, 'ok');
      // Espera la sincronización de carrito/favoritos antes de navegar (§7)
      await alCambiarSesion(usuario);
      location.hash = destinoTrasLogin();
    } catch (err) {
      mensajeEn($('#login-aviso'), err.message, 'error');
    }
  });

  // ---- Registro ----
  $('#form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = $('#reg-nombre').value.trim();
    const email = $('#reg-email').value.trim();
    const password = $('#reg-password').value;
    let valido = true;
    valido = marcarCampo($('#reg-nombre'), $('#error-reg-nombre'), nombre.length >= 3, 'El nombre debe tener al menos 3 caracteres.') && valido;
    valido = marcarCampo($('#reg-email'), $('#error-reg-email'), validarEmail(email), 'Correo electrónico inválido.') && valido;
    valido = marcarCampo($('#reg-password'), $('#error-reg-password'), validarPassword(password),
      'Contraseña débil: mínimo 8 caracteres, una mayúscula, una minúscula y un número.') && valido;
    if (!valido) return;

    try {
      const usuario = await auth.registrar(nombre, email, password);
      mensajeEn($('#login-aviso'), '');
      $('#form-registro').reset();
      toast(`Cuenta creada. ¡Bienvenido/a, ${usuario.nombre}!`, 'ok');
      await alCambiarSesion(usuario);
      location.hash = destinoTrasLogin();
    } catch (err) {
      if (err.detalles?.length) mostrarErroresBackend(vista, err);
      else mensajeEn($('#login-aviso'), err.message, 'error');
    }
  });

  // Validación en vivo de la contraseña del registro (requisitos visibles)
  $('#reg-password').addEventListener('input', (e) => {
    const v = e.target.value;
    const ayudas = $('#reg-ayuda-password');
    const reglas = [
      ['8+ caracteres', v.length >= 8],
      ['mayúscula', /[A-Z]/.test(v)],
      ['minúscula', /[a-z]/.test(v)],
      ['número', /\d/.test(v)],
    ];
    ayudas.textContent = 'Requisitos: ' + reglas.map(([t, ok]) => `${ok ? '✓' : '•'} ${t}`).join(' · ');
  });

  // ---- Cerrar sesión ----
  $('#btn-salir').addEventListener('click', () => {
    auth.cerrarSesionLocal();
    toast('Sesión cerrada.', 'info');
    alCambiarSesion(null);
    location.hash = '#/inicio';
  });
}
