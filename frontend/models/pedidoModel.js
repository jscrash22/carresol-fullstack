// pedidoModel.js — modelo de pedidos: confirmar compra, historial y detalle
import { api } from './apiClient.js';

// El servidor recalcula precios y valida stock; solo se envían ids y cantidades.
// extras: { direccionId, metodoPago, notas, facturacion: { tipoIdentificacion,
//           identificacion, razonSocial, email, telefono, direccionFiscal } }
export async function confirmarPedido(items, extras = {}) {
  const cuerpo = { items, ...extras };
  if (extras.facturacion) cuerpo.facturacion = extras.facturacion;
  return api.post('/pedidos', cuerpo);
}

export async function misPedidos() {
  return api.get('/pedidos/mis-pedidos');
}

export async function detallePedido(id) {
  return api.get(`/pedidos/${id}`);
}

// El usuario solo puede cancelar SUS pedidos (el backend lo verifica)
export async function cancelarPedido(id) {
  return api.patch(`/pedidos/${id}/estado`, { estado: 'cancelado', comentario: 'Cancelado por el cliente desde la web.' });
}
