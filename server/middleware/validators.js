// validators.js — validación y sanitización de entrada con express-validator
// (todas las reglas del contrato §6 + reglas de negocio del modelo ER)
//
// Nota de implementación: las cadenas de express-validator son mutables, así
// que los conjuntos de reglas reutilizables se declaran como FÁBRICAS
// (funciones que crean cadenas nuevas) para que las variantes "parcial"
// (PUT) no alteren las reglas de las variantes "alta" (POST).
import { body, param, query, validationResult } from 'express-validator';
import { ApiError, CODIGOS } from '../utils/respuestas.js';

// Categorías sembradas (para el filtro del catálogo; el alta de productos
// valida la existencia real contra la BD en productoModel)
export const CATEGORIAS = ['relojes', 'collares', 'pulseras', 'anillos', 'aretes'];

const ESTADOS_PEDIDO = ['pendiente', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado'];
const METODOS_PAGO = ['tarjeta', 'transferencia', 'deposito', 'contra_entrega'];
const ESTADOS_COMPRA = ['borrador', 'ordenada', 'recibida', 'cancelada'];
const TIPOS_MEDIDA = ['unica', 'talla', 'largo', 'diametro'];
const CANALES = ['email', 'telefono', 'whatsapp'];
const TIPOS_IDENTIFICACION = ['cedula', 'ruc', 'pasaporte', 'consumidor_final'];
const ESTADOS_ENVIO = ['pendiente', 'preparando', 'en_transito', 'entregado', 'devuelto'];

// Convierte los errores de express-validator en la respuesta consistente (422)
export function validar(reglas) {
  return [
    ...reglas,
    (req, res, next) => {
      const errores = validationResult(req);
      if (errores.isEmpty()) return next();
      const detalles = errores.array().map((e) => ({
        campo: e.path || e.param,
        mensaje: e.msg,
      }));
      return next(new ApiError(CODIGOS.VALIDACION, 'Datos inválidos: revisa los campos enviados.', detalles));
    },
  ];
}

const esId = (valor) => Number.isInteger(Number(valor)) && Number(valor) > 0;
const slugValido = (v) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(v));

// Cédula ecuatoriana válida (módulo 10, provincia 1-24, tercer dígito < 6)
export function cedulaValida(valor) {
  if (!/^\d{10}$/.test(valor)) return false;
  const d = valor.split('').map(Number);
  const provincia = d[0] * 10 + d[1];
  if (provincia < 1 || provincia > 24) return false;
  if (d[2] >= 6) return false;
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let prod = d[i] * (i % 2 === 0 ? 2 : 1);
    if (prod > 9) prod -= 9;
    suma += prod;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === d[9];
}

// ---------- Auth ----------
export const validarRegistro = validar([
  body('nombre')
    .trim().escape()
    .isLength({ min: 3, max: 80 }).withMessage('El nombre debe tener entre 3 y 80 caracteres.'),
  body('email')
    .trim().normalizeEmail().isEmail().withMessage('El correo electrónico no es válido.')
    .isLength({ max: 120 }).withMessage('El correo es demasiado largo.'),
  body('password')
    .isLength({ min: 8, max: 72 }).withMessage('La contraseña debe tener entre 8 y 72 caracteres.')
    .matches(/[A-ZÁÉÍÓÚÑ]/).withMessage('La contraseña necesita al menos una mayúscula.')
    .matches(/\d/).withMessage('La contraseña necesita al menos un número.'),
  body('telefono')
    .optional({ values: 'falsy' }).trim()
    .matches(/^0\d{8,9}$/).withMessage('El teléfono debe tener el formato 0XXXXXXXXX (10 dígitos).'),
  body('cedula')
    .optional({ values: 'falsy' }).trim()
    .custom((v) => cedulaValida(v)).withMessage('La cédula no es válida (10 dígitos, Ecuador).'),
]);

export const validarLogin = validar([
  body('email').trim().normalizeEmail().isEmail().withMessage('El correo electrónico no es válido.'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria.'),
]);

// Recuperación de contraseña (P2): token de 64 hex + contraseña fuerte
export const validarForgotPassword = validar([
  body('email').trim().normalizeEmail().isEmail().withMessage('El correo electrónico no es válido.'),
]);

export const validarResetPassword = validar([
  body('token')
    .trim().isLength({ min: 64, max: 64 }).isHexadecimal()
    .withMessage('El token de recuperación no es válido.'),
  body('password')
    .isLength({ min: 8, max: 72 }).withMessage('La contraseña debe tener entre 8 y 72 caracteres.')
    .matches(/[A-ZÁÉÍÓÚÑ]/).withMessage('La contraseña necesita al menos una mayúscula.')
    .matches(/\d/).withMessage('La contraseña necesita al menos un número.'),
]);

// ---------- Params ----------
export const validarIdProducto = validar([
  param('id').custom(esId).withMessage('El id debe ser un entero positivo.'),
]);
export const validarIdPedido = validar([param('id').custom(esId).withMessage('El id debe ser un entero positivo.')]);
export const validarIdCompra = validar([param('id').custom(esId).withMessage('El id debe ser un entero positivo.')]);
export const validarIdProveedor = validar([param('id').custom(esId).withMessage('El id debe ser un entero positivo.')]);
export const validarIdDireccion = validar([param('id').custom(esId).withMessage('El id debe ser un entero positivo.')]);
export const validarIdMensaje = validar([param('id').custom(esId).withMessage('El id debe ser un entero positivo.')]);
export const validarIdVariante = validar([
  param('varianteId').custom(esId).withMessage('El id de variante debe ser un entero positivo.'),
]);
export const validarIdFavorito = validar([
  param('productoId').custom(esId).withMessage('El id de producto debe ser un entero positivo.'),
]);

// ---------- Catálogo (público) ----------
export const validarCategoriaQuery = validar([
  query('categoria').optional().custom(slugValido).withMessage('La categoría debe ser un slug (ej. relojes).'),
  query('destacado').optional().isIn(['true', 'false']).withMessage('destacado debe ser true o false.'),
  query('q').optional().trim().escape().isLength({ max: 60 }).withMessage('La búsqueda admite hasta 60 caracteres.'),
]);

// ---------- Productos (admin) ----------
const reglasProducto = () => [
  body('nombre')
    .optional({ values: 'falsy' }).trim().escape()
    .isLength({ min: 3, max: 120 }).withMessage('El nombre debe tener entre 3 y 120 caracteres.'),
  body('descripcion')
    .optional({ values: 'falsy' }).trim().escape()
    .isLength({ max: 1000 }).withMessage('La descripción admite hasta 1000 caracteres.'),
  body('categoria')
    .optional({ values: 'falsy' }).custom(slugValido).withMessage('La categoría debe ser un slug (ej. relojes).'),
  body('categoriaId')
    .optional({ values: 'falsy' }).custom(esId).withMessage('categoriaId debe ser entero positivo.'),
  body('precioBase')
    .optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('precioBase debe ser un número ≥ 0.'),
  body('precio')
    .optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('precio debe ser un número ≥ 0.'),
  body('stock').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('stock debe ser entero ≥ 0.'),
  body('imagen').optional({ values: 'falsy' }).trim()
    .isLength({ max: 300 }).withMessage('La URL de imagen admite 300 caracteres.'),
  body('alt').optional({ values: 'falsy' }).trim().escape().isLength({ max: 160 }).withMessage('alt admite 160 caracteres.'),
  body('destacado').optional().isBoolean().withMessage('destacado debe ser booleano.'),
  body('activo').optional().isBoolean().withMessage('activo debe ser booleano.'),
  body('materiales')
    .optional({ values: 'falsy' }).isArray({ max: 20 }).withMessage('materiales debe ser un arreglo de ids.')
    .custom((arr) => arr.every((id) => esId(id))).withMessage('Cada material debe ser un id entero positivo.'),
  body('variantes')
    .optional({ values: 'falsy' }).isArray({ min: 1, max: 30 }).withMessage('variantes debe ser un arreglo no vacío.')
    .custom((arr) => arr.every((v) => esId(v.materialId)
      && TIPOS_MEDIDA.includes(v.tipoMedida)
      && typeof v.medida === 'string' && v.medida.length >= 1 && v.medida.length <= 30
      && Number.isFinite(Number(v.precio)) && Number(v.precio) >= 0
      && Number.isInteger(Number(v.stock)) && Number(v.stock) >= 0
      && (v.stockMinimo === undefined || (Number.isInteger(Number(v.stockMinimo)) && Number(v.stockMinimo) >= 0))))
    .withMessage('Cada variante necesita materialId, tipoMedida válido, medida (1-30), precio ≥ 0 y stock ≥ 0.'),
];

const CAMPOS_PRODUCTO = ['nombre', 'descripcion', 'categoria', 'categoriaId', 'precioBase', 'precio', 'stock',
  'imagen', 'alt', 'destacado', 'activo', 'materiales', 'variantes'];

// POST: nombre, categoría y precio son obligatorios (el resto opcional)
export const validarProducto = validar([
  ...reglasProducto(),
  body('nombre').exists({ values: 'falsy' }).withMessage('El nombre es obligatorio.'),
  body().custom((b) => !!(b.categoria || b.categoriaId))
    .withMessage('Indica la categoría (slug o categoriaId).'),
  body().custom((b) => b.precioBase !== undefined || b.precio !== undefined)
    .withMessage('Indica el precio (precioBase o precio).'),
]);

// PUT: igual que el POST pero todos los campos opcionales (al menos uno presente)
export const validarProductoParcial = validar([
  ...reglasProducto(),
  body().custom((b) => CAMPOS_PRODUCTO.some((k) => b[k] !== undefined))
    .withMessage('Envía al menos un campo para actualizar.'),
]);

// ---------- Pedidos ----------
export const validarPedido = validar([
  body('items')
    .isArray({ min: 1, max: 50 }).withMessage('items debe ser un arreglo con al menos un producto.'),
  body('items.*.varianteId').optional({ values: 'falsy' }).custom(esId).withMessage('varianteId debe ser entero positivo.'),
  body('items.*.productoId').optional({ values: 'falsy' }).custom(esId).withMessage('productoId debe ser entero positivo.'),
  body('items.*.cantidad')
    .isInt({ min: 1, max: 50 }).withMessage('La cantidad por item debe estar entre 1 y 50.'),
  body()
    .custom((b) => b.items.every((i) => i.varianteId || i.productoId))
    .withMessage('Cada item necesita varianteId o productoId.'),
  body('direccionId').optional({ values: 'falsy' }).custom(esId).withMessage('direccionId debe ser entero positivo.'),
  body('metodoPago')
    .optional({ values: 'falsy' }).isIn(METODOS_PAGO)
    .withMessage(`metodoPago debe ser uno de: ${METODOS_PAGO.join(', ')}.`),
  body('notas').optional({ values: 'falsy' }).trim().escape()
    .isLength({ max: 500 }).withMessage('Las notas admiten 500 caracteres.'),
  body('facturacion.tipoIdentificacion')
    .optional({ values: 'falsy' }).isIn(TIPOS_IDENTIFICACION)
    .withMessage(`tipoIdentificacion debe ser: ${TIPOS_IDENTIFICACION.join(', ')}.`),
  body('facturacion.identificacion')
    .optional({ values: 'falsy' }).trim()
    .isLength({ min: 5, max: 20 }).withMessage('La identificación admite entre 5 y 20 caracteres.'),
  body('facturacion.razonSocial')
    .optional({ values: 'falsy' }).trim().escape()
    .isLength({ max: 120 }).withMessage('La razón social admite 120 caracteres.'),
  body('facturacion.email')
    .optional({ values: 'falsy' }).trim().normalizeEmail().isEmail().withMessage('El email de facturación no es válido.'),
  body('facturacion.telefono')
    .optional({ values: 'falsy' }).trim()
    .matches(/^0\d{8,9}$/).withMessage('El teléfono debe tener el formato 0XXXXXXXXX.'),
  body('facturacion.direccionFiscal')
    .optional({ values: 'falsy' }).trim().escape()
    .isLength({ max: 200 }).withMessage('La dirección fiscal admite 200 caracteres.'),
]);

export const validarEstadoPedido = validar([
  param('id').custom(esId).withMessage('El id debe ser un entero positivo.'),
  body('estado').isIn(ESTADOS_PEDIDO).withMessage(`estado debe ser: ${ESTADOS_PEDIDO.join(', ')}.`),
  body('comentario').optional({ values: 'falsy' }).trim().escape()
    .isLength({ max: 200 }).withMessage('El comentario admite 200 caracteres.'),
]);

export const validarEnvio = validar([
  param('id').custom(esId).withMessage('El id debe ser un entero positivo.'),
  body('estado').optional().isIn(ESTADOS_ENVIO).withMessage(`estado debe ser: ${ESTADOS_ENVIO.join(', ')}.`),
  body('transportista').optional({ values: 'falsy' }).trim().escape()
    .isLength({ max: 80 }).withMessage('El transportista admite 80 caracteres.'),
  body('numeroGuia').optional({ values: 'falsy' }).trim()
    .isLength({ max: 40 }).withMessage('El número de guía admite 40 caracteres.'),
  body('costo').optional().isFloat({ min: 0 }).withMessage('El costo de envío debe ser ≥ 0.'),
  body('fechaEstimada').optional({ values: 'falsy' }).isISO8601().withMessage('fechaEstimada debe ser fecha ISO.'),
]);

export const validarPedidosQuery = validar([
  query('estado').optional().isIn(ESTADOS_PEDIDO).withMessage(`estado debe ser: ${ESTADOS_PEDIDO.join(', ')}.`),
]);

// ---------- Direcciones ----------
const reglasDireccion = () => [
  body('alias').trim().escape().isLength({ min: 2, max: 40 }).withMessage('El alias admite entre 2 y 40 caracteres.'),
  body('destinatario').trim().escape().isLength({ min: 3, max: 80 }).withMessage('El destinatario admite entre 3 y 80 caracteres.'),
  body('telefono').trim().matches(/^0\d{8,9}$/).withMessage('El teléfono debe tener el formato 0XXXXXXXXX.'),
  body('provincia').trim().escape().isLength({ min: 3, max: 40 }).withMessage('La provincia admite entre 3 y 40 caracteres.'),
  body('ciudad').trim().escape().isLength({ min: 3, max: 60 }).withMessage('La ciudad admite entre 3 y 60 caracteres.'),
  body('callePrincipal').trim().escape().isLength({ min: 3, max: 120 }).withMessage('La calle principal admite entre 3 y 120 caracteres.'),
  body('calleSecundaria').optional({ values: 'falsy' }).trim().escape().isLength({ max: 120 }).withMessage('La calle secundaria admite 120 caracteres.'),
  body('numeracion').trim().escape().isLength({ min: 1, max: 40 }).withMessage('La numeración admite hasta 40 caracteres.'),
  body('referencia').optional({ values: 'falsy' }).trim().escape().isLength({ max: 200 }).withMessage('La referencia admite 200 caracteres.'),
  body('codigoPostal').optional({ values: 'falsy' }).trim().isLength({ max: 12 }).withMessage('El código postal admite 12 caracteres.'),
  body('esPredeterminada').optional().isBoolean().withMessage('esPredeterminada debe ser booleano.'),
];

export const validarDireccion = validar(reglasDireccion());

export const validarDireccionParcial = validar(
  reglasDireccion().map((regla) => regla.optional({ values: 'falsy' })),
);

// ---------- Carrito ----------
export const validarCarritoSync = validar([
  body('items')
    .isArray({ max: 50 }).withMessage('items debe ser un arreglo (máximo 50).'),
  body('items.*.varianteId').custom(esId).withMessage('varianteId debe ser entero positivo.'),
  body('items.*.cantidad').isInt({ min: 1, max: 50 }).withMessage('La cantidad debe estar entre 1 y 50.'),
]);

export const validarItemCarrito = validar([
  body('varianteId').custom(esId).withMessage('varianteId debe ser entero positivo.'),
  body('cantidad').optional({ values: 'falsy' }).isInt({ min: 1, max: 50 }).withMessage('La cantidad debe estar entre 1 y 50.'),
]);

// ---------- Favoritos ----------
export const validarFavorito = validar([
  body('productoId').custom(esId).withMessage('productoId debe ser entero positivo.'),
]);

// ---------- Contacto ----------
export const validarContacto = validar([
  body('nombre').trim().escape().isLength({ min: 3, max: 80 }).withMessage('El nombre admite entre 3 y 80 caracteres.'),
  body('email').trim().normalizeEmail().isEmail().withMessage('El correo electrónico no es válido.'),
  body('telefono').optional({ values: 'falsy' }).trim()
    .matches(/^0\d{8,9}$/).withMessage('El teléfono debe tener el formato 0XXXXXXXXX.'),
  body('mensaje').trim().escape().isLength({ min: 10, max: 500 }).withMessage('El mensaje admite entre 10 y 500 caracteres.'),
  body('canalPreferido').optional({ values: 'falsy' }).isIn(CANALES)
    .withMessage(`canalPreferido debe ser: ${CANALES.join(', ')}.`),
]);

export const validarContactoQuery = validar([
  query('leido').optional().isIn(['true', 'false']).withMessage('leido debe ser true o false.'),
]);

// ---------- Proveedores ----------
const reglasProveedor = () => [
  body('nombre').trim().escape().isLength({ min: 3, max: 120 }).withMessage('El nombre admite entre 3 y 120 caracteres.'),
  body('ruc').trim().matches(/^\d{13}$/).withMessage('El RUC debe tener 13 dígitos.'),
  body('email').optional({ values: 'falsy' }).trim().normalizeEmail().isEmail().withMessage('El email del proveedor no es válido.'),
  body('telefono').optional({ values: 'falsy' }).trim()
    .matches(/^0\d{8,9}$/).withMessage('El teléfono debe tener el formato 0XXXXXXXXX.'),
  body('direccion').optional({ values: 'falsy' }).trim().escape().isLength({ max: 200 }).withMessage('La dirección admite 200 caracteres.'),
  body('contacto').optional({ values: 'falsy' }).trim().escape().isLength({ max: 80 }).withMessage('El contacto admite 80 caracteres.'),
];

export const validarProveedor = validar(reglasProveedor());

export const validarProveedorParcial = validar(
  reglasProveedor().map((regla) => regla.optional({ values: 'falsy' })),
);

// ---------- Compras ----------
const reglasCompra = () => [
  body('items').isArray({ min: 1, max: 100 }).withMessage('items debe ser un arreglo con al menos una variante.'),
  body('items.*.varianteId').custom(esId).withMessage('varianteId debe ser entero positivo.'),
  body('items.*.cantidad').isInt({ min: 1, max: 500 }).withMessage('La cantidad debe estar entre 1 y 500.'),
  body('items.*.costoUnitario').isFloat({ min: 0 }).withMessage('El costo unitario debe ser ≥ 0.'),
  body('numeroFacturaProveedor').optional({ values: 'falsy' }).trim()
    .isLength({ max: 40 }).withMessage('El número de factura admite 40 caracteres.'),
  body('notas').optional({ values: 'falsy' }).trim().escape().isLength({ max: 500 }).withMessage('Las notas admiten 500 caracteres.'),
];

export const validarCompra = validar([
  body('proveedorId').custom(esId).withMessage('proveedorId debe ser entero positivo.'),
  ...reglasCompra(),
]);

export const validarCompraUpdate = validar([
  body('proveedorId').optional({ values: 'falsy' }).custom(esId).withMessage('proveedorId debe ser entero positivo.'),
  ...reglasCompra(),
]);

export const validarEstadoCompra = validar([
  param('id').custom(esId).withMessage('El id debe ser un entero positivo.'),
  body('estado').isIn(['ordenada', 'recibida', 'cancelada'])
    .withMessage('estado debe ser ordenada, recibida o cancelada.'),
]);

export const validarComprasQuery = validar([
  query('estado').optional().isIn(ESTADOS_COMPRA).withMessage(`estado debe ser: ${ESTADOS_COMPRA.join(', ')}.`),
]);

export const validarInventarioQuery = validar([
  query('tipo').optional().isIn(['venta', 'compra', 'ajuste', 'devolucion']).withMessage('tipo inválido.'),
  query('varianteId').optional({ values: 'falsy' }).custom(esId).withMessage('varianteId debe ser entero positivo.'),
]);

// ---------- Admin: catálogo, parámetros y auditoría ----------
const reglasCategoria = () => [
  body('nombre').trim().escape().isLength({ min: 3, max: 60 }).withMessage('El nombre admite entre 3 y 60 caracteres.'),
  body('slug').optional({ values: 'falsy' }).custom(slugValido).withMessage('El slug admite solo letras, números y guiones.'),
  body('descripcion').optional({ values: 'falsy' }).trim().escape().isLength({ max: 200 }).withMessage('La descripción admite 200 caracteres.'),
  body('orden').optional({ values: 'falsy' }).isInt({ min: 1, max: 999 }).withMessage('orden debe ser entero 1-999.'),
  body('activa').optional().isBoolean().withMessage('activa debe ser booleano.'),
];

export const validarCategoriaAdmin = validar(reglasCategoria());
export const validarCategoriaParcial = validar(
  reglasCategoria().map((regla) => regla.optional({ values: 'falsy' })),
);

export const validarMaterialAdmin = validar([
  body('nombre').trim().escape().isLength({ min: 3, max: 60 }).withMessage('El nombre admite entre 3 y 60 caracteres.'),
  body('categoriaId').custom(esId).withMessage('categoriaId debe ser entero positivo.'),
]);

export const validarMaterialParcial = validar([
  body('nombre').optional({ values: 'falsy' }).trim().escape().isLength({ min: 3, max: 60 }).withMessage('El nombre admite entre 3 y 60 caracteres.'),
  body('categoriaId').optional({ values: 'falsy' }).custom(esId).withMessage('categoriaId debe ser entero positivo.'),
  body('activo').optional().isBoolean().withMessage('activo debe ser booleano.'),
]);

export const validarParametro = validar([
  body('valor').trim().notEmpty().isLength({ max: 120 }).withMessage('El valor admite hasta 120 caracteres.'),
  body('descripcion').optional({ values: 'falsy' }).trim().escape().isLength({ max: 200 }).withMessage('La descripción admite 200 caracteres.'),
]);

export const validarAuditoriaQuery = validar([
  query('tabla').optional({ values: 'falsy' }).trim().escape().isLength({ max: 40 }).withMessage('tabla admite 40 caracteres.'),
  query('accion').optional({ values: 'falsy' }).isIn(['INSERT', 'UPDATE', 'DELETE']).withMessage('accion debe ser INSERT, UPDATE o DELETE.'),
  query('usuarioId').optional({ values: 'falsy' }).custom(esId).withMessage('usuarioId debe ser entero positivo.'),
  query('page').optional({ values: 'falsy' }).isInt({ min: 1, max: 1000 }).withMessage('page debe ser entero ≥ 1.'),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 200 }).withMessage('limit debe ser entero 1-200.'),
]);
