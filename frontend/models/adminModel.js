// adminModel.js — modelo del panel de administración (requiere rol admin)
// Cubre todos los módulos del §7: resumen, productos, catálogo (categorías y
// materiales), pedidos, usuarios, proveedores, compras, inventario, mensajes
// de contacto, parámetros y auditoría.
import { api } from './apiClient.js';

// ---------- Usuarios y pedidos ----------
export function listarUsuarios() {
  return api.get('/admin/usuarios');
}

export function listarPedidos(estado) {
  const q = estado && estado !== 'todos' ? `?estado=${encodeURIComponent(estado)}` : '';
  return api.get(`/admin/pedidos${q}`);
}

export function cambiarEstadoPedido(id, estado, comentario) {
  return api.patch(`/pedidos/${id}/estado`, { estado, comentario });
}

export function confirmarPagoPedido(id) {
  return api.patch(`/pedidos/${id}/pago`, {});
}

export function registrarEnvio(id, datos) {
  return api.patch(`/pedidos/${id}/envio`, datos);
}

export function resumen() {
  return api.get('/admin/resumen');
}

// ---------- Productos ----------
export function listarProductosAdmin() {
  return api.get('/productos?inactivos=true'); // el backend solo honra el flag para admins
}

export function crearProducto(datos) {
  return api.post('/productos', datos);
}

export function actualizarProducto(id, datos) {
  return api.put(`/productos/${id}`, datos);
}

export function eliminarProducto(id) {
  return api.delete(`/productos/${id}`);
}

// ---------- Catálogo: categorías y materiales ----------
export function listarCategorias() {
  return api.get('/admin/categorias?inactivas=true');
}

export function crearCategoria(datos) {
  return api.post('/admin/categorias', datos);
}

export function actualizarCategoria(id, datos) {
  return api.put(`/admin/categorias/${id}`, datos);
}

export function listarMateriales() {
  return api.get('/admin/materiales?inactivas=true');
}

export function crearMaterial(datos) {
  return api.post('/admin/materiales', datos);
}

export function actualizarMaterial(id, datos) {
  return api.put(`/admin/materiales/${id}`, datos);
}

// ---------- Proveedores ----------
export function listarProveedores(inactivos = false) {
  return api.get(`/proveedores${inactivos ? '?inactivos=true' : ''}`);
}

export function crearProveedor(datos) {
  return api.post('/proveedores', datos);
}

export function actualizarProveedor(id, datos) {
  return api.put(`/proveedores/${id}`, datos);
}

export function eliminarProveedor(id) {
  return api.delete(`/proveedores/${id}`);
}

// ---------- Compras ----------
export function listarCompras(estado) {
  const q = estado && estado !== 'todos' ? `?estado=${encodeURIComponent(estado)}` : '';
  return api.get(`/compras${q}`);
}

export function crearCompra(datos) {
  return api.post('/compras', datos);
}

export function actualizarCompra(id, datos) {
  return api.put(`/compras/${id}`, datos);
}

export function cambiarEstadoCompra(id, estado) {
  return api.patch(`/compras/${id}/estado`, { estado });
}

// ---------- Inventario ----------
export function stockBajo() {
  return api.get('/inventario/stock-bajo');
}

export function movimientos({ varianteId, tipo } = {}) {
  const params = new URLSearchParams();
  if (varianteId) params.set('varianteId', String(varianteId));
  if (tipo && tipo !== 'todos') params.set('tipo', tipo);
  const q = params.toString();
  return api.get(`/inventario/movimientos${q ? `?${q}` : ''}`);
}

// ---------- Mensajes de contacto ----------
export function bandejaContacto(leido) {
  const q = leido === undefined ? '' : `?leido=${String(leido)}`;
  return api.get(`/contacto${q}`);
}

export function marcarMensajeLeido(id) {
  return api.patch(`/contacto/${id}/leido`, {});
}

// ---------- Parámetros ----------
export function listarParametros() {
  return api.get('/admin/parametros');
}

export function actualizarParametro(clave, valor) {
  return api.put(`/admin/parametros/${clave}`, { valor });
}

// ---------- Auditoría ----------
export function auditoria({ tabla, accion } = {}) {
  const params = new URLSearchParams();
  if (tabla) params.set('tabla', tabla);
  if (accion) params.set('accion', accion);
  const q = params.toString();
  return api.get(`/admin/auditoria${q ? `?${q}` : ''}`);
}
