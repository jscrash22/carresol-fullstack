// adminController.js — orquesta el panel de administración (§7): carga los
// datos de cada pestaña y ejecuta las acciones (crear/editar/eliminar, estados
// de pedidos, pago, envío, compras, mensajes, parámetros, auditoría).
import * as admin from '../models/adminModel.js';
import * as vista from '../views/adminView.js';
import { toast, confirmar } from '../views/uiComponents.js';
import { sesion, CLAVES } from '../models/almacenamiento.js';
import { invalidarCatalogo, getProductos } from './catalogoController.js';

const $ = (sel) => document.querySelector(sel);

let pestanaActiva = sesion.get(CLAVES.PESTANA_ADMIN, 'resumen') || 'resumen';
const filtros = {
  pedidos: 'todos',
  movimientos: { tipo: 'todos', varianteId: undefined },
  mensajes: 'todos',
  auditoria: { tabla: undefined, accion: undefined },
};

const mensajeError = (err) => (err.esRed ? 'No se pudo conectar con el servidor.' : err.message);

export async function cargarPanel() {
  const vistaEl = $('#vista-admin');
  vista.inicializarEstructura(vistaEl);
  vista.renderizarPestanas(vistaEl, pestanaActiva, cargarTab);
  await cargarTab(pestanaActiva);
}

async function cargarTab(tab) {
  const vistaEl = $('#vista-admin');
  pestanaActiva = tab;
  sesion.set(CLAVES.PESTANA_ADMIN, tab);
  vista.renderizarPestanas(vistaEl, tab, cargarTab);
  const panel = $(`#panel-${tab}`);
  if (!panel) return;
  switch (tab) {
    case 'resumen': return cargarResumen(panel);
    case 'productos': return cargarProductos(panel);
    case 'catalogo': return cargarCatalogoTab(panel);
    case 'pedidos': return cargarPedidos(panel);
    case 'usuarios': return cargarUsuarios(panel);
    case 'proveedores': return cargarProveedores(panel);
    case 'compras': return cargarCompras(panel);
    case 'inventario': return cargarInventario(panel);
    case 'mensajes': return cargarMensajes(panel);
    case 'parametros': return cargarParametros(panel);
    case 'auditoria': return cargarAuditoria(panel);
  }
}

function recargar() {
  return cargarTab(pestanaActiva);
}

// ---------- 1. Resumen ----------
async function cargarResumen(panel) {
  vista.renderizarCargando(panel, 'Calculando el resumen del negocio…');
  try {
    vista.renderizarResumen(panel, await admin.resumen());
  } catch (err) {
    vista.renderizarError(panel, mensajeError(err), recargar);
  }
}

// ---------- 2. Productos ----------
async function cargarProductos(panel) {
  vista.renderizarCargando(panel, 'Cargando productos…');
  try {
    const [productos, categorias, materiales] = await Promise.all([
      admin.listarProductosAdmin(),
      admin.listarCategorias(),
      admin.listarMateriales(),
    ]);
    vista.renderizarProductos(panel, productos, {
      onNuevo: () => vista.abrirFormularioProducto(null, { categorias, materiales, onGuardar: guardarProducto }),
      onEditar: (p) => vista.abrirFormularioProducto(p, { categorias, materiales, onGuardar: guardarProducto }),
      onEliminar: eliminarProducto,
    });
  } catch (err) {
    vista.renderizarError(panel, mensajeError(err), recargar);
  }
}

async function guardarProducto(datos, id) {
  try {
    if (id) await admin.actualizarProducto(id, datos);
    else await admin.crearProducto(datos);
    toast(id ? 'Producto actualizado.' : 'Producto creado.', 'ok');
    invalidarCatalogo(); // precios/variantes/imágenes nuevas en el catálogo
    await recargar();
    return true;
  } catch (err) {
    return mensajeError(err);
  }
}

async function eliminarProducto(p) {
  const ok = await confirmar({
    titulo: 'Eliminar producto',
    mensaje: `¿Eliminar "${p.nombre}"? Si tiene ventas solo se desactiva (borrado lógico).`,
    textoOk: 'Eliminar',
    peligro: true,
  });
  if (!ok) return;
  try {
    await admin.eliminarProducto(p.id);
    toast('Producto eliminado.', 'ok');
    invalidarCatalogo();
    await recargar();
  } catch (err) {
    toast(mensajeError(err), 'error');
  }
}

// ---------- 3. Categorías y materiales ----------
async function cargarCatalogoTab(panel) {
  vista.renderizarCargando(panel, 'Cargando categorías y materiales…');
  try {
    const [categorias, materiales] = await Promise.all([admin.listarCategorias(), admin.listarMateriales()]);
    vista.renderizarCatalogo(panel, {
      categorias,
      materiales,
      onNuevaCategoria: () => vista.abrirFormularioCategoria(null, guardarCategoria),
      onEditarCategoria: (c) => vista.abrirFormularioCategoria(c, guardarCategoria),
      onNuevoMaterial: () => vista.abrirFormularioMaterial(null, { categorias }, guardarMaterial),
      onEditarMaterial: (m) => vista.abrirFormularioMaterial(m, { categorias }, guardarMaterial),
    });
  } catch (err) {
    vista.renderizarError(panel, mensajeError(err), recargar);
  }
}

async function guardarCategoria(datos, id) {
  try {
    if (id) await admin.actualizarCategoria(id, datos);
    else await admin.crearCategoria(datos);
    toast(id ? 'Categoría actualizada.' : 'Categoría creada.', 'ok');
    await recargar();
    return true;
  } catch (err) {
    return mensajeError(err);
  }
}

async function guardarMaterial(datos, id) {
  try {
    if (id) await admin.actualizarMaterial(id, datos);
    else await admin.crearMaterial(datos);
    toast(id ? 'Material actualizado.' : 'Material creado.', 'ok');
    await recargar();
    return true;
  } catch (err) {
    return mensajeError(err);
  }
}

// ---------- 4. Pedidos ----------
async function cargarPedidos(panel) {
  vista.renderizarCargando(panel, 'Cargando pedidos…');
  try {
    const pedidos = await admin.listarPedidos(filtros.pedidos);
    vista.renderizarPedidos(panel, pedidos, {
      filtroEstado: filtros.pedidos,
      onFiltrarEstado: (estado) => { filtros.pedidos = estado; return cargarTab('pedidos'); },
      onCambiarEstado: cambiarEstadoPedido,
      onConfirmarPago: confirmarPago,
      onRegistrarEnvio: (p) => vista.abrirFormularioEnvio(p, guardarEnvio),
      productos: getProductos(),
    });
  } catch (err) {
    vista.renderizarError(panel, mensajeError(err), recargar);
  }
}

async function cambiarEstadoPedido(pedido, estado) {
  if (estado === pedido.estado) return;
  try {
    await admin.cambiarEstadoPedido(pedido.id, estado);
    toast(`Pedido #${pedido.numeroPedido}: ${estado}.`, 'ok');
    if (estado === 'cancelado') invalidarCatalogo(); // el servidor repone el stock
    await cargarTab('pedidos');
  } catch (err) {
    toast(mensajeError(err), 'error'); // transición inválida u otro error del servidor
  }
}

async function confirmarPago(pedido) {
  const ok = await confirmar({
    titulo: 'Confirmar pago',
    mensaje: `¿Registrar el pago del pedido #${pedido.numeroPedido} (${pedido.usuario?.email}) por ${pedido.total.toFixed(2)} USD?`,
    textoOk: 'Confirmar pago',
  });
  if (!ok) return;
  try {
    await admin.confirmarPagoPedido(pedido.id);
    toast(`Pago del pedido #${pedido.numeroPedido} confirmado.`, 'ok');
    await cargarTab('pedidos');
  } catch (err) {
    toast(mensajeError(err), 'error');
  }
}

async function guardarEnvio(pedido, datos) {
  try {
    await admin.registrarEnvio(pedido.id, datos);
    toast(`Envío del pedido #${pedido.numeroPedido} registrado.`, 'ok');
    await cargarTab('pedidos');
    return true;
  } catch (err) {
    return mensajeError(err);
  }
}

// ---------- 5. Usuarios ----------
async function cargarUsuarios(panel) {
  vista.renderizarCargando(panel, 'Cargando usuarios…');
  try {
    vista.renderizarUsuarios(panel, await admin.listarUsuarios(), {
      onCambiar: (u) => vista.abrirFormularioUsuario(u, (datos) => guardarUsuario(u, datos)),
    });
  } catch (err) {
    vista.renderizarError(panel, mensajeError(err), recargar);
  }
}

async function guardarUsuario(usuario, datos) {
  const cambios = [];
  if (datos.role !== usuario.role) cambios.push(`rol: ${usuario.role} → ${datos.role}`);
  if (datos.activo !== usuario.activo) cambios.push(`estado: ${usuario.activo ? 'activo' : 'inactivo'} → ${datos.activo ? 'activo' : 'inactivo'}`);
  if (!cambios.length) return 'No se solicitó ningún cambio.';

  const ok = await confirmar({
    titulo: 'Confirmar cambio de usuario',
    mensaje: `¿Aplicar en ${usuario.nombre} (${usuario.email}) los cambios: ${cambios.join(', ')}?`,
    textoOk: 'Aplicar cambios',
    peligro: datos.activo === false || datos.role !== 'admin',
  });
  if (!ok) return true; // cierra el modal sin cambios
  try {
    await admin.cambiarUsuario(usuario.id, datos);
    toast(`Usuario ${usuario.nombre} actualizado.`, 'ok');
    await recargar();
    return true;
  } catch (err) {
    return mensajeError(err);
  }
}

// ---------- 6. Proveedores ----------
async function cargarProveedores(panel) {
  vista.renderizarCargando(panel, 'Cargando proveedores…');
  try {
    const proveedores = await admin.listarProveedores(true); // incluye inactivos
    vista.renderizarProveedores(panel, proveedores, {
      onNuevo: () => vista.abrirFormularioProveedor(null, guardarProveedor),
      onEditar: (p) => vista.abrirFormularioProveedor(p, guardarProveedor),
      onEliminar: eliminarProveedor,
    });
  } catch (err) {
    vista.renderizarError(panel, mensajeError(err), recargar);
  }
}

async function guardarProveedor(datos, id) {
  try {
    if (id) await admin.actualizarProveedor(id, datos);
    else await admin.crearProveedor(datos);
    toast(id ? 'Proveedor actualizado.' : 'Proveedor creado.', 'ok');
    await recargar();
    return true;
  } catch (err) {
    return mensajeError(err);
  }
}

async function eliminarProveedor(p) {
  const ok = await confirmar({
    titulo: 'Eliminar proveedor',
    mensaje: `¿Eliminar al proveedor "${p.nombre}"? Si tiene compras registradas solo se desactiva.`,
    textoOk: 'Eliminar',
    peligro: true,
  });
  if (!ok) return;
  try {
    await admin.eliminarProveedor(p.id);
    toast('Proveedor eliminado.', 'ok');
    await recargar();
  } catch (err) {
    toast(mensajeError(err), 'error');
  }
}

// ---------- 7. Compras ----------
async function cargarCompras(panel) {
  vista.renderizarCargando(panel, 'Cargando compras…');
  try {
    const compras = await admin.listarCompras();
    const [proveedores, productos] = await Promise.all([admin.listarProveedores(), admin.listarProductosAdmin()]);
    const abrirFormulario = (compra) =>
      vista.abrirFormularioCompra(compra, { proveedores, productos }, guardarCompra);
    vista.renderizarCompras(panel, compras, {
      onNueva: () => abrirFormulario(null),
      onEditar: abrirFormulario,
      onCambiarEstado: cambiarEstadoCompra,
      productos,
    });
  } catch (err) {
    vista.renderizarError(panel, mensajeError(err), recargar);
  }
}

async function guardarCompra(datos, id) {
  try {
    if (id) await admin.actualizarCompra(id, datos);
    else await admin.crearCompra(datos);
    toast(id ? 'Compra actualizada (borrador).' : 'Compra creada en borrador.', 'ok');
    await cargarTab('compras');
    return true;
  } catch (err) {
    return mensajeError(err);
  }
}

async function cambiarEstadoCompra(compra, estado) {
  const textos = {
    ordenada: `¿Marcar la compra #${compra.numeroCompra} como ORDENADA al proveedor ${compra.proveedor?.nombre}?`,
    recibida: `¿Registrar la RECEPCIÓN de la compra #${compra.numeroCompra}? El stock de sus variantes se repone.`,
    cancelada: `¿Cancelar la compra #${compra.numeroCompra}?`,
  };
  const ok = await confirmar({
    titulo: estado === 'recibida' ? 'Recibir compra' : estado === 'ordenada' ? 'Ordenar compra' : 'Cancelar compra',
    mensaje: textos[estado],
    textoOk: estado === 'cancelada' ? 'Cancelar compra' : 'Confirmar',
    peligro: estado === 'cancelada',
  });
  if (!ok) return;
  try {
    await admin.cambiarEstadoCompra(compra.id, estado);
    toast(estado === 'recibida'
      ? `Compra #${compra.numeroCompra} recibida: stock repuesto.`
      : `Compra #${compra.numeroCompra}: ${estado}.`, 'ok');
    if (estado === 'recibida' || estado === 'cancelada') invalidarCatalogo();
    await cargarTab('compras');
    // La pestaña de inventario se recarga sola al volver a ella (cargarTab
    // siempre consulta de nuevo el stock bajo y el kardex).
  } catch (err) {
    toast(mensajeError(err), 'error');
  }
}

// ---------- 8. Inventario ----------
async function cargarInventario(panel) {
  vista.renderizarCargando(panel, 'Cargando inventario…');
  try {
    const [stockBajo, movimientos] = await Promise.all([
      admin.stockBajo(),
      admin.movimientos(filtros.movimientos),
    ]);
    vista.renderizarInventario(panel, {
      stockBajo,
      movimientos,
      filtroTipo: filtros.movimientos.tipo,
      onFiltrar: (tipo, varianteId) => {
        filtros.movimientos = { tipo, varianteId };
        return cargarTab('inventario');
      },
      productos: getProductos(),
    });
  } catch (err) {
    vista.renderizarError(panel, mensajeError(err), recargar);
  }
}

// ---------- 9. Mensajes de contacto ----------
async function cargarMensajes(panel) {
  vista.renderizarCargando(panel, 'Cargando la bandeja de mensajes…');
  const leido = filtros.mensajes === 'todos' ? undefined : filtros.mensajes === 'true';
  try {
    const mensajes = await admin.bandejaContacto(leido);
    vista.renderizarMensajes(panel, mensajes, {
      filtroLeido: filtros.mensajes,
      onFiltrar: (valor) => { filtros.mensajes = valor; return cargarTab('mensajes'); },
      onMarcarLeido: marcarMensajeLeido,
    });
  } catch (err) {
    vista.renderizarError(panel, mensajeError(err), recargar);
  }
}

async function marcarMensajeLeido(mensaje) {
  try {
    await admin.marcarMensajeLeido(mensaje.id);
    toast('Mensaje marcado como leído.', 'ok');
    await cargarTab('mensajes');
  } catch (err) {
    toast(mensajeError(err), 'error');
  }
}

// ---------- 10. Parámetros ----------
async function cargarParametros(panel) {
  vista.renderizarCargando(panel, 'Cargando parámetros…');
  try {
    const parametros = await admin.listarParametros();
    vista.renderizarParametros(panel, parametros, {
      onGuardar: guardarParametro,
    });
  } catch (err) {
    vista.renderizarError(panel, mensajeError(err), recargar);
  }
}

async function guardarParametro(parametro, valor) {
  if (!valor) { toast('El valor no puede estar vacío.', 'error'); return; }
  try {
    await admin.actualizarParametro(parametro.clave, valor);
    toast(`Parámetro "${parametro.clave}" actualizado a "${valor}".`, 'ok');
    await cargarTab('parametros');
  } catch (err) {
    toast(mensajeError(err), 'error');
  }
}

// ---------- 11. Auditoría ----------
async function cargarAuditoria(panel) {
  vista.renderizarCargando(panel, 'Consultando la auditoría…');
  try {
    const datos = await admin.auditoria(filtros.auditoria);
    vista.renderizarAuditoria(panel, datos, {
      filtros: filtros.auditoria,
      onFiltrar: (tabla, accion) => {
        filtros.auditoria = { tabla, accion };
        return cargarTab('auditoria');
      },
    });
  } catch (err) {
    vista.renderizarError(panel, mensajeError(err), recargar);
  }
}
