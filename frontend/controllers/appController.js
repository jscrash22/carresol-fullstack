// appController.js — arranque de la aplicación, router por hash y navegación
// Vistas del Reto 2 (§7): inicio, catálogo, login, mi cuenta (direcciones y
// pedidos), checkout, admin y contacto (ahora contra la API).
import { sesionGuardada, cerrarSesionLocal, usuarioActual } from '../models/authModel.js';
import { tokenExpirado, iniciarAvisoDespertar, detenerAvisoDespertar } from '../models/apiClient.js';
import { sesion, CLAVES } from '../models/almacenamiento.js';
import { cargarConfiguracionPublica } from '../models/configModel.js';
import * as catalogo from './catalogoController.js';
import * as carritoCtrl from './carritoController.js';
import * as cuentaCtrl from './cuentaController.js';
import { cargarCheckout } from './checkoutController.js';
import * as adminCtrl from './adminController.js';
import { inicializarAuth } from './authController.js';
import * as contactoModel from '../models/contactoModel.js';
import { toast, mejorarBotonesCerrarEstaticos, renderizarAvisoGlobal } from '../views/uiComponents.js';

const $ = (sel) => document.querySelector(sel);

const VISTAS = ['inicio', 'catalogo', 'login', 'cuenta', 'checkout', 'admin', 'contacto'];
// El Reto 1 enlazaba #/pedidos: se redirige a la nueva vista de cuenta
const ALIAS = { pedidos: 'cuenta' };

// Validaciones regex del formulario de contacto (conservadas del Reto 1)
const validarNombre = (v) => /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{3,60}$/.test(v);
const validarEmail = (v) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v);
const validarTelefono = (v) => !v.trim() || /^(\+?\d{1,3}[\s-]?)?\d{7,12}$/.test(v.trim());
const validarMensaje = (v) => { const l = v.trim().length; return l >= 10 && l <= 500; };

function aplicarCampo(input, span, valido, mensaje) {
  if (valido) {
    input.removeAttribute('aria-invalid');
    span.textContent = '';
  } else {
    input.setAttribute('aria-invalid', 'true');
    span.textContent = mensaje;
  }
  return valido;
}

// ---------- Navegación SPA ----------
function mostrarVista(nombre) {
  VISTAS.forEach((v) => {
    const seccion = $(`#vista-${v}`);
    if (seccion) seccion.hidden = v !== nombre;
  });
  // Foco al encabezado de la vista activa (accesibilidad al navegar)
  const activa = $(`#vista-${nombre}`);
  const titulo = activa?.querySelector('h1, h2');
  if (titulo) {
    titulo.setAttribute('tabindex', '-1');
    titulo.focus({ preventScroll: false });
  }
  window.scrollTo({ top: 0 });
}

function rutaActual() {
  const hash = location.hash.replace('#/', '').split('?')[0];
  if (ALIAS[hash]) return ALIAS[hash];
  return VISTAS.includes(hash) ? hash : 'inicio';
}

// Las vistas protegidas recuerdan su destino en sessionStorage (§4.1): tras
// iniciar sesión se vuelve automáticamente a ahí, incluso en el checkout.
function protegida(ruta) {
  if (!['cuenta', 'checkout', 'admin'].includes(ruta)) return false;
  if (!sesionGuardada()) {
    sesion.set(CLAVES.DESTINO_TRAS_LOGIN, `#/${ruta}`);
    location.hash = '#/login';
    toast('Inicia sesión para continuar; volveremos a esta vista.', 'info');
    return true;
  }
  return false;
}

async function navegar(ruta) {
  if (protegida(ruta)) { mostrarVista('login'); renderizarAvisoGlobal(); return; }
  mostrarVista(ruta);
  renderizarAvisoGlobal();

  // Frescura al entrar en inicio/catálogo: si los datos tienen >30 s se recarga
  // en segundo plano (sin spinner); el evento actualiza tarjetas y carrito.
  if ((ruta === 'inicio' || ruta === 'catalogo') && catalogo.datosAntiguos()) {
    catalogo.recargarCatalogo({ silencioso: true });
  }

  if (ruta === 'cuenta') await cuentaCtrl.cargarCuenta();
  if (ruta === 'checkout') await cargarCheckout();
  if (ruta === 'admin') {
    const sesionActual = sesionGuardada();
    if (!sesionActual || sesionActual.usuario?.role !== 'admin') {
      location.hash = '#/inicio';
      toast('El panel de administración requiere una cuenta de administrador.', 'error');
      return;
    }
    await adminCtrl.cargarPanel();
  }
  if (ruta === 'login' && sesionGuardada()) {
    location.hash = '#/catalogo';
  }
}

// ---------- Header según sesión ----------
function actualizarHeader(usuario) {
  const saludo = $('#saludo');
  const btnSalir = $('#btn-salir');
  const navAdmin = $('#nav-admin');
  const navCuenta = $('#nav-cuenta');
  const btnCuenta = $('#btn-usuario');

  if (usuario) {
    saludo.hidden = false;
    saludo.textContent = `Hola, ${usuario.nombre}`;
    btnSalir.hidden = false;
    navCuenta.hidden = false;
    navAdmin.hidden = usuario.role !== 'admin'; // el panel solo aparece para admin
    btnCuenta.setAttribute('aria-label', `Cuenta de ${usuario.nombre} (sesión activa)`);
  } else {
    saludo.hidden = true;
    btnSalir.hidden = true;
    navCuenta.hidden = true;
    navAdmin.hidden = true;
    btnCuenta.setAttribute('aria-label', 'Iniciar sesión');
  }
}

// Sesión vencida en plena navegación: la API responde 401 y el apiClient limpia
// la sesión; aquí se avisa y se vuelve al login (regla del Reto 1 conservada).
function inicializarSesionExpirada() {
  window.addEventListener('carresol:sesion-expirada', () => {
    const enCheckout = rutaActual() === 'checkout';
    carritoCtrl.alCerrarSesion({ conservarDatos: enCheckout });
    actualizarHeader(null);
    sesion.set(CLAVES.DESTINO_TRAS_LOGIN, enCheckout ? '#/checkout' : '#/login');
    toast(enCheckout
      ? 'Tu sesión expiró. Tu carrito y borradores se conservan: vuelve a entrar para terminar el pedido.'
      : 'Tu sesión expiró. Inicia sesión de nuevo.', 'info', 6000);
    if (rutaActual() !== 'login') location.hash = '#/login';
  });
}

// ---------- Menú hamburguesa (conservado del Reto 1) ----------
function inicializarMenu() {
  const btn = $('#btn-menu');
  const nav = $('#menu-principal');
  btn.addEventListener('click', () => {
    const abierto = nav.classList.toggle('abierto');
    btn.setAttribute('aria-expanded', String(abierto));
    btn.setAttribute('aria-label', abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  });
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('abierto');
    btn.setAttribute('aria-expanded', 'false');
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('abierto')) {
      nav.classList.remove('abierto');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('abierto') && !nav.contains(e.target) && e.target !== btn) {
      nav.classList.remove('abierto');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

// ---------- Formulario de contacto (ahora contra POST /api/contacto) ----------
function inicializarFormulario() {
  const form = $('#form-contacto');
  const btn = form.querySelector('button[type="submit"]');
  const exito = $('#form-exito');
  const campos = [
    { input: $('#nombre'), error: $('#error-nombre'), validar: validarNombre, msg: 'Nombre inválido (3-60 letras).' },
    { input: $('#email'), error: $('#error-email'), validar: validarEmail, msg: 'Correo inválido.' },
    { input: $('#telefono'), error: $('#error-telefono'), validar: validarTelefono, msg: 'Teléfono inválido.' },
    { input: $('#mensaje'), error: $('#error-mensaje'), validar: validarMensaje, msg: 'El mensaje debe tener entre 10 y 500 caracteres.' },
  ];
  campos.forEach((c) => {
    c.input.addEventListener('input', () => aplicarCampo(c.input, c.error, c.validar(c.input.value), c.msg));
    c.input.addEventListener('blur', () => aplicarCampo(c.input, c.error, c.validar(c.input.value), c.msg));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    exito.textContent = '';
    let valido = true;
    campos.forEach((c) => { valido = aplicarCampo(c.input, c.error, c.validar(c.input.value), c.msg) && valido; });
    if (!valido) return;

    btn.disabled = true;
    btn.textContent = 'Enviando…';
    try {
      await contactoModel.enviar({
        nombre: $('#nombre').value.trim(),
        email: $('#email').value.trim(),
        telefono: $('#telefono').value.trim() || undefined,
        mensaje: $('#mensaje').value.trim(),
      });
      exito.className = 'exito';
      exito.textContent = '¡Gracias! Tu mensaje fue enviado correctamente.';
      form.reset();
      toast('Mensaje de contacto enviado.', 'ok');
    } catch (err) {
      exito.className = 'error';
      exito.textContent = err.esRed
        ? 'No se pudo conectar con el servidor. Intenta de nuevo.'
        : (err.message || 'No se pudo enviar el mensaje.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar';
    }
  });
}

// ---------- Cambio de sesión: header + sincronización de carrito/favoritos ----------
async function alCambiarSesion(usuario) {
  actualizarHeader(usuario);
  if (usuario) {
    // §7: al iniciar sesión el carrito se sincroniza (PUT /api/carrito) y los
    // favoritos se ligan a la cuenta.
    await carritoCtrl.sincronizarTrasLogin(catalogo.getProductos());
  } else {
    carritoCtrl.alCerrarSesion();
  }
}

// ---------- Arranque ----------
async function revalidarSesionGuardada(sesionActual) {
  try {
    return await usuarioActual();
  } catch (err) {
    if (err?.esRed) {
      // API caída al revalidar: NO se cierra la sesión (no es un 401).
      return sesionActual.usuario ?? null;
    }
    // 401 real: apiClient ya limpió el token y avisó al usuario.
    carritoCtrl.alCerrarSesion();
    return null;
  }
}

async function iniciar() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  inicializarMenu();
  inicializarFormulario();
  inicializarSesionExpirada();
  mejorarBotonesCerrarEstaticos();
  renderizarAvisoGlobal();

  // Botón de cuenta: va a la vista de login (si ya hay sesión, redirige al catálogo)
  $('#btn-usuario').addEventListener('click', () => { location.hash = '#/login'; });

  const avisosCarrito = carritoCtrl.inicializar();
  // Pinta la estructura y las tarjetas (copia cacheada o esqueletos) ANTES de
  // esperar a la API. El catálogo se revalida en segundo plano más abajo.
  catalogo.inicializar({
    onVerDetalle: carritoCtrl.abrirDetalleProducto,
    onToggleFav: carritoCtrl.toggleFavorito,
  });
  avisosCarrito.forEach((aviso) => toast(aviso, 'info', 6000));

  // JWT vencido: se cierra SIN llamar a la API (§4.1.4) y se avisa en aria-live.
  if (tokenExpirado()) {
    cerrarSesionLocal();
    carritoCtrl.alCerrarSesion();
    toast('Tu sesión había vencido. Inicia sesión de nuevo.', 'info', 6000);
  }

  iniciarAvisoDespertar();
  let usuario = null;
  try {
    const sesionActual = sesionGuardada();
    // En paralelo (no en serie): sesión, configuración pública y catálogo.
    const [resSesion] = await Promise.allSettled([
      sesionActual ? revalidarSesionGuardada(sesionActual) : Promise.resolve(null),
      cargarConfiguracionPublica(),
      catalogo.cargarCatalogo(),
    ]);
    usuario = resSesion.status === 'fulfilled' ? resSesion.value : null;

    actualizarHeader(usuario);
    carritoCtrl.refrescarCarrito();
    carritoCtrl.sincronizarConCatalogo(catalogo.getProductos());
    carritoCtrl.refrescarFavoritos();

    // Con sesión vigente: liga favoritos y carrito a la cuenta (§7)
    if (usuario) {
      await carritoCtrl.sincronizarTrasLogin(catalogo.getProductos());
    }
  } finally {
    detenerAvisoDespertar();
  }

  // Router
  window.addEventListener('hashchange', () => navegar(rutaActual()));
  await navegar(rutaActual());

  // Formularios de sesión (login/registro/cierre)
  inicializarAuth({ alCambiarSesion });
}

document.addEventListener('DOMContentLoaded', iniciar);
