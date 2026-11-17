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

const $ = (sel) => document.querySelector(sel);

let refs = null;
let formDireccion = null;

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
    totales: carrito.calcularTotales(),
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
    document.dispatchEvent(new CustomEvent('carresol:carrito-cambio'));
    $('#checkout-contenido').hidden = true;
    vista.renderizarExito($('#checkout-exito'), pedido);
    toast(`Pedido n.º ${pedido.numeroPedido} confirmado. ¡Gracias por tu compra!`, 'ok', 6000);
  } catch (err) {
    aviso.textContent = err.esRed
      ? 'No se pudo conectar con el servidor. Intenta de nuevo.'
      : (err.message || 'No se pudo registrar el pedido.');
    toast(aviso.textContent, 'error', 6000);
    // El carrito queda intacto para reintentar; si el stock cambió, la vista
    // de pedidos del catálogo lo revalidará al recargar.
  } finally {
    refs.btnConfirmar.disabled = false;
    refs.btnConfirmar.textContent = 'Confirmar pedido';
  }
}
