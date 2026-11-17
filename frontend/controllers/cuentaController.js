// cuentaController.js — "Mi cuenta" (§7): datos de la sesión, direcciones (CRUD)
// y mis pedidos con cancelación. Login obligatorio (el router ya lo exige).
import { sesionGuardada } from '../models/authModel.js';
import * as direccionesApi from '../models/direccionModel.js';
import { misPedidos, cancelarPedido } from '../models/pedidoModel.js';
import * as cuentaVista from '../views/cuentaView.js';
import { toast, confirmar } from '../views/uiComponents.js';

const $ = (sel) => document.querySelector(sel);

let pestanaActiva = 'direcciones';

export async function cargarCuenta() {
  const sesion = sesionGuardada();
  if (!sesion) {
    toast('Inicia sesión para ver tu cuenta.', 'info');
    location.hash = '#/login';
    return;
  }
  const vista = $('#vista-cuenta');
  // Resumen de la cuenta (nombre y correo de la sesión revalidada al arrancar)
  const datos = $('#cuenta-datos');
  if (datos) {
    datos.textContent = `${sesion.usuario?.nombre ?? ''} · ${sesion.usuario?.email ?? ''}`;
  }
  cuentaVista.inicializarEstructura(vista, cargarTab);
  await cargarTab(pestanaActiva);
}

async function cargarTab(tab) {
  const vista = $('#vista-cuenta');
  pestanaActiva = tab;
  cuentaVista.renderizarPestanas(vista, tab, cargarTab);
  const panel = $(`#panel-cuenta-${tab}`);
  if (tab === 'direcciones') await cargarDirecciones(panel);
  else await cargarMisPedidosCuenta(panel);
}

// ---------- Direcciones ----------
async function cargarDirecciones(panel) {
  cuentaVista.renderizarDireccionesCargando(panel);
  try {
    const direcciones = await direccionesApi.listar();
    cuentaVista.renderizarDirecciones(panel, direcciones, {
      onNueva: () => abrirFormularioDireccion(null),
      onEditar: (d) => abrirFormularioDireccion(d),
      onEliminar: eliminarDireccion,
      onPredeterminar: (d) => guardarDireccion(d.id, { esPredeterminada: true }),
    });
  } catch (err) {
    cuentaVista.renderizarError(panel, err.esRed
      ? 'No se pudo conectar con el servidor.'
      : err.message, () => cargarDirecciones(panel));
  }
}

// Devuelve true si todo salió bien (el modal se cierra); false mantiene el formulario
async function guardarDireccion(id, datos) {
  try {
    if (id) await direccionesApi.actualizar(id, datos);
    else await direccionesApi.crear(datos);
    toast(id ? 'Dirección actualizada.' : 'Dirección guardada.', 'ok');
    await cargarDirecciones($(`#panel-cuenta-${pestanaActiva}`));
    return true;
  } catch (err) {
    toast(err.esRed ? 'No se pudo conectar con el servidor.' : err.message, 'error');
    return false;
  }
}

function abrirFormularioDireccion(direccion) {
  cuentaVista.abrirFormularioDireccion(direccion, (datos) =>
    guardarDireccion(direccion?.id ?? null, datos));
}

async function eliminarDireccion(direccion) {
  const ok = await confirmar({
    titulo: 'Eliminar dirección',
    mensaje: `¿Eliminar la dirección "${direccion.alias}" (${direccion.ciudad})? Esta acción no se puede deshacer.`,
    textoOk: 'Eliminar',
    peligro: true,
  });
  if (!ok) return;
  try {
    await direccionesApi.eliminar(direccion.id);
    toast('Dirección eliminada.', 'ok');
    await cargarDirecciones($(`#panel-cuenta-${pestanaActiva}`));
  } catch (err) {
    toast(err.esRed ? 'No se pudo conectar con el servidor.' : err.message, 'error');
  }
}

// ---------- Mis pedidos ----------
async function cargarMisPedidosCuenta(panel) {
  cuentaVista.renderizarPedidosCargando(panel);
  try {
    const pedidos = await misPedidos();
    cuentaVista.renderizarPedidos(panel, pedidos, { onCancelar: cancelarMiPedido });
  } catch (err) {
    cuentaVista.renderizarPedidosError(panel, err.esRed
      ? 'No se pudo conectar con el servidor. Revisa que la API esté en marcha.'
      : err.message);
  }
}

async function cancelarMiPedido(pedido) {
  const numero = pedido.numeroPedido ?? pedido.id;
  const ok = await confirmar({
    titulo: 'Cancelar pedido',
    mensaje: `¿Cancelar tu pedido n.º ${numero} por un total de $${pedido.total.toFixed(2)}?`,
    textoOk: 'Cancelar pedido',
    peligro: true,
  });
  if (!ok) return;
  try {
    await cancelarPedido(pedido.id);
    toast(`Pedido n.º ${numero} cancelado.`, 'ok');
  } catch (err) {
    toast(err.esRed ? 'No se pudo conectar con el servidor.' : err.message, 'error');
  } finally {
    await cargarMisPedidosCuenta($(`#panel-cuenta-${pestanaActiva}`));
  }
}
