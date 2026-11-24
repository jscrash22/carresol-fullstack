// carritoController.js — carrito (por variante), favoritos, detalle de producto
// y entrada al checkout. Orquesta: modelos → vistas (§7: sin lógica de render aquí).
import * as carrito from '../models/carritoModel.js';
import * as favoritos from '../models/favoritosModel.js';
import { api, leerSesion } from '../models/apiClient.js';
import { abrirModal, cerrarModal, toast } from '../views/uiComponents.js';
import * as vista from '../views/carritoView.js';
import * as vistaDetalle from '../views/productoDetalleView.js';
import { configActual } from '../models/configModel.js';
import { limpiarBorradores } from '../models/almacenamiento.js';
import { getProductos, datosAntiguos, invalidarCatalogo } from './catalogoController.js';
import { pedirVolverAlCheckout } from './authController.js';

const $ = (sel) => document.querySelector(sel);

export function inicializar() {
  const avisos = carrito.inicializarCarrito();
  favoritos.inicializarFavoritos();
  refrescarCarrito();
  inicializarPanelCarrito();
  inicializarPanelFavoritos();

  document.addEventListener('carresol:abrir-carrito', abrirCarrito);
  // El checkout vacía el carrito tras confirmar un pedido
  document.addEventListener('carresol:carrito-cambio', refrescarCarrito);
  // El catálogo se recarga en segundo plano → revalidar carrito con stock real
  window.addEventListener('carresol:catalogo-actualizado', () => {
    sincronizarConCatalogo(getProductos(), { avisar: false });
  });
  // Otra pestaña cambió el carrito/favoritos: reflejarlo aquí (§4.1)
  carrito.escucharCambiosDeCarrito(() => {
    refrescarCarrito();
    toast('Carrito actualizado desde otra pestaña.', 'info', 2500);
  });
  favoritos.escucharCambios(() => refrescarFavoritos());
  return avisos;
}

// ---------- Carrito ----------
export function refrescarCarrito() {
  const items = carrito.getCarrito();
  vista.actualizarContadorCarrito(carrito.contarUnidades());
  vista.renderizarCarrito($('#carrito-items'), items, {
    onQuitar: (varianteId) => { carrito.eliminarProducto(varianteId); refrescarCarrito(); },
    onCambiarCantidad: (varianteId, delta) => {
      const res = carrito.cambiarCantidad(varianteId, delta);
      mostrarAlertaCarrito(res.ok ? '' : res.mensaje);
      refrescarCarrito();
    },
  });
  $('#carrito-vacio').hidden = items.length > 0;
  vista.actualizarTotales(carrito.calcularTotales(configActual().iva));
  vista.mostrarFechaActualizacion(carrito.getUltimaActualizacion());
}

function mostrarAlertaCarrito(msg) {
  const el = $('#carrito-alerta');
  el.textContent = msg || '';
}

// Agrega UNA VARIANTE concreta (desde el detalle de producto, §7)
export function agregarAlCarrito(variante, producto, cantidad = 1) {
  const res = carrito.agregarProducto(variante, { producto, cantidad });
  mostrarAlertaCarrito(res.ok ? '' : res.mensaje);
  if (res.ok) {
    const partes = [variante.material, variante.medida].filter(Boolean).join(' ');
    toast(`"${producto.nombre}"${partes ? ` (${partes})` : ''} agregado al carrito.`, 'ok', 2200);
  }
  refrescarCarrito();
  return res;
}

// Detalle de producto: selector de material y medida + stock por variante
export function abrirDetalleProducto(producto, disparador) {
  vistaDetalle.abrirDetalleProducto(producto, {
    onAgregar: agregarAlCarrito,
    onToggleFav: toggleFavorito,
    disparador,
  });
}

// Al cargar el catálogo: revalida precios/stock por variante y avisa (§7)
export function sincronizarConCatalogo(productosApi, { avisar = true } = {}) {
  const { avisos } = carrito.sincronizarConCatalogo(productosApi);
  refrescarCarrito();
  if (avisar) {
    avisos.slice(0, 3).forEach((a) => toast(a, 'info', 5000));
    if (avisos.length > 3) toast(`Y ${avisos.length - 3} avisos más sobre tu carrito.`, 'info', 5000);
  }
  return avisos;
}

// Al INICIAR SESIÓN (§4.1): el destino de los datos locales depende del DUEÑO.
//  • dueño `invitado` → fusión con el carrito del servidor (PUT) y subida de favoritos.
//  • dueño otro usuario → DESCARTAR lo local (nunca fusionar) y cargar lo del servidor.
//  • dueño este usuario → conservar el espejo y recargar del servidor.
export async function sincronizarTrasLogin(productosCatalogo = []) {
  const id = String(leerSesion()?.usuario?.id ?? '');
  const duenoAnterior = carrito.getDueno();
  const esInvitado = duenoAnterior === 'invitado';
  const esOtro = !esInvitado && duenoAnterior !== id;

  if (esOtro) {
    carrito.vaciarPorCierreDeSesion();
    favoritos.descartarPorCierreDeSesion();
  }

  try {
    if (esInvitado && carrito.getCarrito().length) {
      const servidor = await api.put('/carrito', { items: carrito.itemsParaServidor() });
      carrito.adoptarCarritoServidor(servidor, productosCatalogo, id);
    } else if (!esInvitado) {
      const servidor = await api.get('/carrito');
      carrito.adoptarCarritoServidor(servidor, productosCatalogo, id);
    }
  } catch { /* sin conexión: se mantiene el espejo local del usuario */ }

  carrito.setDueno(id);
  favoritos.setDueno(id);

  if (esInvitado) await favoritos.ligarAServidor();
  else if (esOtro) await favoritos.adoptarDelServidor();

  refrescarCarrito();
  refrescarFavoritos();
}

// Al CERRAR sesión (manual o por 401): si el dueño era un usuario, se vacía el
// carrito local, el espejo de favoritos y los borradores. Nunca se toca el
// carrito guardado en el servidor, que sigue siendo de ese usuario.
export function alCerrarSesion({ conservarDatos = false } = {}) {
  if (!conservarDatos) {
    if (carrito.getDueno() !== 'invitado') {
      carrito.vaciarPorCierreDeSesion();
      favoritos.descartarPorCierreDeSesion();
    }
    limpiarBorradores();
  }
  // Si la sesión caduca DURANTE el checkout se conservan carrito y borradores
  // para reanudarlos tras el login (§4.1.4).
  favoritos.volverAModoLocal();
  refrescarCarrito();
  refrescarFavoritos();
}

// ---------- Favoritos ----------
export async function toggleFavorito(producto) {
  try {
    const ahora = await favoritos.toggleFavorito(producto);
    refrescarFavoritos();
    toast(ahora ? `"${producto.nombre}" agregado a favoritos.` : `"${producto.nombre}" quitado de favoritos.`, 'ok', 2000);
    return ahora;
  } catch (err) {
    toast(err.esRed ? 'No se pudo conectar con el servidor.' : (err.message || 'No se pudo actualizar favoritos.'), 'error');
    throw err; // el botón ♥ NO cambia de estado
  }
}

export function refrescarFavoritos() {
  const lista = favoritos.getFavoritos();
  vista.actualizarContadorFavoritos(lista.length);
  vista.renderizarFavoritos($('#lista-favoritos'), $('#favoritos-vacio'), lista, {
    onVerDetalle: abrirDetalleProducto,
    onQuitar: toggleFavorito,
  });
}

// ---------- Paneles ----------
function inicializarPanelCarrito() {
  const panel = $('#panel-carrito');
  $('#btn-abrir-carrito').addEventListener('click', abrirCarrito);
  $('#btn-cont-carrito').addEventListener('click', abrirCarrito);

  $('#btn-cerrar-carrito').addEventListener('click', cerrarCarrito);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('abierto')) cerrarCarrito();
  });

  $('#btn-cont-fav').addEventListener('click', abrirFavoritos);

  $('#btn-vaciar').addEventListener('click', () => {
    carrito.vaciarCarrito();
    refrescarCarrito();
    toast('Carrito vaciado.', 'info');
  });

  $('#btn-finalizar').addEventListener('click', alConfirmarPedido);
}

function abrirCarrito() {
  abrirModal($('#panel-carrito'), document.activeElement);
  // Revalida precios/stock con el catálogo en memoria y pide frescura si está
  // viejo (>30 s). La recarga llega por el evento carresol:catalogo-actualizado.
  sincronizarConCatalogo(getProductos(), { avisar: true });
  if (datosAntiguos()) invalidarCatalogo();
  refrescarCarrito();
}

function cerrarCarrito() {
  cerrarModal($('#panel-carrito'));
}

function inicializarPanelFavoritos() {
  const panel = $('#panel-favoritos');
  $('#btn-cerrar-favoritos').addEventListener('click', () => cerrarModal(panel));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('abierto')) cerrarModal(panel);
  });
}

function abrirFavoritos() {
  abrirModal($('#panel-favoritos'), document.activeElement);
  refrescarFavoritos();
}

// ---------- Entrada al checkout: login obligatorio ----------
function alConfirmarPedido() {
  if (!leerSesion()) {
    // No se envía NADA al servidor: primero login (regla del Reto 1 conservada)
    toast('Inicia sesión para finalizar tu compra.', 'info');
    pedirVolverAlCheckout();
    cerrarModal($('#panel-carrito'));
    location.hash = '#/login';
    return;
  }
  if (!carrito.getCarrito().length) {
    mostrarAlertaCarrito('Tu carrito está vacío.');
    return;
  }
  cerrarModal($('#panel-carrito'));
  location.hash = '#/checkout';
}
