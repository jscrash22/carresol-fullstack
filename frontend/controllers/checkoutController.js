// checkoutController.js — orquesta el checkout (§7): cargar direcciones,
// validar el formulario, crear la dirección nueva si hace falta y confirmar
// el pedido (el servidor recalcula precios/stock). Login obligatorio.
import * as direccionesApi from '../models/direccionModel.js';
import { confirmarPedido } from '../models/pedidoModel.js';
import * as carrito from '../models/carritoModel.js';
import { toast } from '../views/uiComponents.js';
import * as vista from '../views/checkoutView.js';
import { pedirVolverAlCheckout } from './authController.js';
import { leerSesion } from '../models/apiClient.js';
import { sesion, CLAVES } from '../models/almacenamiento.js';
import { configActual } from '../models/configModel.js';
import { getProductos, recargarCatalogo, invalidarCatalogo } from './catalogoController.js';

const $ = (sel) => document.querySelector(sel);

let refs = null;
let formDireccion = null;

// Borrador del checkout en sessionStorage. Solo opciones y texto: nunca
// contraseñas ni datos de tarjeta (el pago es simulado).
function guardarBorrador() {
  if (!refs) return;
  sesion.set(CLAVES.BORRADOR_CHECKOUT, {
    direccionId: refs.radiosDireccion.find((r) => r.checked)?.value ?? null,
    metodoPago: refs.radiosPago.find((r) => r.checked)?.value ?? 'tarjeta',
    tipoIdentificacion: refs.radiosFacturacion.find((r) => r.checked)?.value ?? 'consumidor_final',
    identificacion: refs.inputIdentificacion?.value ?? '',
    razonSocial: refs.inputRazonSocial?.value ?? '',
    notas: refs.textareaNotas?.value ?? '',
  });
  sesion.set(CLAVES.PASO_CHECKOUT, 'confirmacion');
}

function aplicarBorrador() {
  const borrador = sesion.json(CLAVES.BORRADOR_CHECKOUT, null);
  if (!borrador || !refs) return;
  const marcar = (lista, valor) => {
    const opcion = (lista ?? []).find((r) => r.value === valor);
    if (opcion) opcion.checked = true;
  };
  marcar(refs.radiosDireccion, borrador.direccionId);
  marcar(refs.radiosPago, borrador.metodoPago);
  marcar(refs.radiosFacturacion, borrador.tipoIdentificacion);
  if (refs.inputIdentificacion) refs.inputIdentificacion.value = borrador.identificacion ?? '';
  if (refs.inputRazonSocial) refs.inputRazonSocial.value = borrador.razonSocial ?? '';
  if (refs.textareaNotas) refs.textareaNotas.value = borrador.notas ?? '';
}

export async function cargarCheckout() {
  const contenedor = $('#checkout-contenido');
  const exito = $('#checkout-exito');
  exito.hidden = true;
  contenedor.hidden = false;

  if (!leerSesion()) {
    toast('Inicia sesión para finalizar tu compra.', 'info');
    pedirVolverAlCheckout();
    location.hash = '#/login';
    return;
  }
  const items = carrito.getCarrito();
  if (!items.length) {
    toast('Tu carrito está vacío. Agrega productos para continuar.', 'info');
    location.hash = '#/catalogo';
    return;
  }

  let direcciones = [];
  try {
    direcciones = await direccionesApi.listar();
  } catch (err) {
    vistaVacia(`No se pudieron cargar tus direcciones: ${err.message}`);
    return;
  }

  formDireccion = null;
  refs = vista.construirCheckout(contenedor, {
    direcciones,
    items,
    totales: carrito.calcularTotales(configActual().iva),
    onAgregarNueva: () => {
      if (!formDireccion) {
        formDireccion = vista.pintarFormularioDireccion(refs.cajaNuevaDireccion);
        // Al elegir "nueva", se deseleccionan las existentes
        refs.radiosDireccion.forEach((r) => { r.checked = false; });
        refs.cajaNuevaDireccion.querySelector('input')?.focus();
      } else {
        formDireccion.reset();
        refs.cajaNuevaDireccion.hidden = !refs.cajaNuevaDireccion.hidden;
      }
    },
  });

  // Sin direcciones guardadas: el formulario de nueva dirección arranca abierto
  if (!direcciones.length) {
    formDireccion = vista.pintarFormularioDireccion(refs.cajaNuevaDireccion);
  }

  aplicarBorrador();
  refs.formulario.addEventListener('change', guardarBorrador);
  refs.formulario.addEventListener('input', guardarBorrador);
  refs.formulario.addEventListener('submit', alConfirmar);
}

function vistaVacia(mensaje) {
  const contenedor = $('#checkout-contenido');
  contenedor.textContent = '';
  const p = document.createElement('p');
  p.className = 'estado-error';
  p.setAttribute('role', 'alert');
  p.textContent = mensaje;
  contenedor.appendChild(p);
}

async function alConfirmar(e) {
  e.preventDefault();
  const aviso = refs.aviso;
  aviso.textContent = '';

  // ---- 1. Dirección ----
  let direccionId = null;
  const radioElegido = refs.radiosDireccion.find((r) => r.checked);
  if (radioElegido) {
    direccionId = Number(radioElegido.value);
  } else if (formDireccion) {
    if (!formDireccion.validar()) {
      aviso.textContent = 'Revisa los campos de la dirección marcados en rojo.';
      return;
    }
    refs.btnConfirmar.disabled = true;
    refs.btnConfirmar.textContent = 'Guardando dirección…';
    try {
      const creada = await direccionesApi.crear(formDireccion.valores());
      direccionId = Number(creada.id);
      toast(`Dirección "${creada.alias}" guardada.`, 'ok', 2500);
    } catch (err) {
      aviso.textContent = err.message;
      refs.btnConfirmar.disabled = false;
      refs.btnConfirmar.textContent = 'Confirmar pedido';
      return;
    }
  }
  if (!direccionId) {
    aviso.textContent = 'Elige una dirección de envío o crea una nueva.';
    return;
  }

  // ---- 2. Método de pago ----
  const metodoPago = refs.radiosPago.find((r) => r.checked)?.value ?? 'tarjeta';

  // ---- 3. Facturación ----
  const tipoIdentificacion = refs.radiosFacturacion.find((r) => r.checked)?.value ?? 'consumidor_final';
  const facturacion = { tipoIdentificacion };
  if (tipoIdentificacion === 'cedula' || tipoIdentificacion === 'ruc') {
    const identificacion = refs.inputIdentificacion.value.trim();
    const digitos = tipoIdentificacion === 'cedula' ? 10 : 13;
    if (!new RegExp(`^\\d{${digitos}}$`).test(identificacion)) {
      refs.inputIdentificacion.setAttribute('aria-invalid', 'true');
      refs.errIdentificacion.textContent = `La ${tipoIdentificacion === 'cedula' ? 'cédula' : 'RUC'} debe tener ${digitos} dígitos.`;
      aviso.textContent = 'Revisa los datos de facturación.';
      return;
    }
    refs.inputIdentificacion.removeAttribute('aria-invalid');
    refs.errIdentificacion.textContent = '';
    facturacion.identificacion = identificacion;
  }
  if (tipoIdentificacion === 'ruc') {
    const razonSocial = refs.inputRazonSocial.value.trim();
    if (razonSocial.length < 3) {
      refs.inputRazonSocial.setAttribute('aria-invalid', 'true');
      refs.errRazonSocial.textContent = 'La razón social admite entre 3 y 120 caracteres.';
      aviso.textContent = 'Revisa los datos de facturación.';
      return;
    }
    refs.inputRazonSocial.removeAttribute('aria-invalid');
    refs.errRazonSocial.textContent = '';
    facturacion.razonSocial = razonSocial;
  }

  // ---- 4. Confirmar (el servidor valida stock y recalcula todo) ----
  const notas = refs.textareaNotas.value.trim() || undefined;
  refs.btnConfirmar.disabled = true;
  refs.btnConfirmar.textContent = 'Procesando pedido…';
  try {
    const pedido = await confirmarPedido(carrito.itemsParaServidor(), {
      direccionId,
      metodoPago,
      notas,
      ...(Object.keys(facturacion).length ? { facturacion } : {}),
    });
    carrito.vaciarCarrito();
    sesion.remove(CLAVES.BORRADOR_CHECKOUT);
    sesion.remove(CLAVES.PASO_CHECKOUT);
    document.dispatchEvent(new CustomEvent('carresol:carrito-cambio'));
    // El pedido descuenta stock: invalidar para que tarjetas/detalle y admin
    // muestren las cifras reales sin recargar la página (§4.2).
    invalidarCatalogo();
    $('#checkout-contenido').hidden = true;
    vista.renderizarExito($('#checkout-exito'), pedido);
    toast(`Pedido n.º ${pedido.numeroPedido} confirmado. ¡Gracias por tu compra!`, 'ok', 6000);
  } catch (err) {
    aviso.textContent = err.esRed
      ? 'No se pudo conectar con el servidor. Intenta de nuevo.'
      : (err.message || 'No se pudo registrar el pedido.');
    toast(aviso.textContent, 'error', 6000);
    guardarBorrador(); // se conserva para reintentar tras un 401/red caída
    // Fallo por stock: recargar catálogo y ajustar carrito a las unidades reales.
    const porStock = /stock|unidades|inventario/i.test(err.message || '');
    if (porStock) {
      await recargarCatalogo({ silencioso: true });
      const cambios = carrito.sincronizarConCatalogo(getProductos());
      document.dispatchEvent(new CustomEvent('carresol:carrito-cambio'));
      cambios.avisos.slice(0, 3).forEach((a) => toast(a, 'info', 6000));
    }
  } finally {
    refs.btnConfirmar.disabled = false;
    refs.btnConfirmar.textContent = 'Confirmar pedido';
  }
}
