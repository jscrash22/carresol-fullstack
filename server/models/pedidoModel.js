// pedidoModel.js — pedidos transaccionales sobre el modelo ER real
//
// Reglas de diseño seguro (A04 Insecure Design — se mantienen del modelo anterior):
// • El servidor NUNCA confía en precios ni totales del cliente: se leen de la BD.
// • El stock se descuenta de forma condicional y atómica dentro de $transaction.
// • Todo el pedido se crea en UNA transacción: pedido + items con snapshots +
//   historial de estados + pago simulado + envío + factura numerada + vaciado del
//   carrito del servidor + movimientos de inventario.
import { prisma } from './db.js';
import { Prisma } from '@prisma/client';
import { ApiError, CODIGOS } from '../utils/respuestas.js';
import { TX_LARGA } from '../utils/transaccion.js';
import crypto from 'node:crypto';

const transaccionLarga = (fn) => prisma.$transaction(fn, TX_LARGA);

const INCLUIR_PEDIDO = {
  items: true,
  pagos: true,
  envio: true,
  factura: true,
  historial: { include: { usuario: { select: { id: true, nombre: true, email: true } } } },
  usuario: { select: { id: true, nombre: true, email: true } },
};

async function parametro(tx, clave) {
  const p = await tx.parametroSistema.findUnique({ where: { clave } });
  return p?.valor ?? null;
}

// ---------- Mapeo a JSON (BigInt → Number, Decimal → Number) ----------
function itemLimpio(i) {
  return {
    id: Number(i.id),
    sku: i.sku,
    nombreProducto: i.nombreProducto,
    material: i.material,
    medida: i.medida,
    cantidad: i.cantidad,
    precioUnitario: Number(i.precioUnitario),
    subtotal: Number(i.subtotal),
  };
}

function envioLimpio(e) {
  if (!e) return null;
  return {
    transportista: e.transportista,
    numeroGuia: e.numeroGuia,
    estado: e.estado,
    costo: Number(e.costo),
    fechaDespacho: e.fechaDespacho,
    fechaEstimada: e.fechaEstimada,
    fechaEntrega: e.fechaEntrega,
    direccion: e.direccionSnapshot,
  };
}

function facturaLimpia(f) {
  if (!f) return null;
  return {
    numero: f.numero,
    secuencial: Number(f.secuencial),
    establecimiento: f.establecimiento,
    puntoEmision: f.puntoEmision,
    tipo: f.tipo,
    tipoIdentificacion: f.tipoIdentificacion,
    identificacion: f.identificacion,
    razonSocial: f.razonSocial,
    subtotal: Number(f.subtotal),
    ivaPorcentaje: Number(f.ivaPorcentaje),
    ivaValor: Number(f.ivaValor),
    total: Number(f.total),
    estado: f.estado,
    claveAcceso: f.claveAcceso,
    fechaEmision: f.fechaEmision,
  };
}

function pagoLimpio(p) {
  if (!p) return null;
  return {
    metodo: p.metodo,
    pasarela: p.pasarela,
    referenciaExterna: p.referenciaExterna,
    monto: Number(p.monto),
    estado: p.estado,
    fechaPago: p.fechaPago,
  };
}

export function pedidoLimpio(p) {
  return {
    id: Number(p.id),
    numeroPedido: Number(p.numeroPedido),
    estado: p.estado,
    subtotal: Number(p.subtotal),
    costoEnvio: Number(p.costoEnvio),
    ivaPorcentaje: Number(p.ivaPorcentaje),
    ivaValor: Number(p.ivaValor),
    total: Number(p.total),
    moneda: p.moneda,
    notas: p.notas,
    createdAt: p.createdAt,
    usuario: p.usuario ? { id: Number(p.usuario.id), nombre: p.usuario.nombre, email: p.usuario.email } : undefined,
    items: (p.items ?? []).map(itemLimpio),
    pago: pagoLimpio((p.pagos ?? [])[0] ?? null),
    envio: envioLimpio(p.envio),
    factura: facturaLimpia(p.factura),
    historial: (p.historial ?? []).map((h) => ({
      estadoAnterior: h.estadoAnterior,
      estadoNuevo: h.estadoNuevo,
      comentario: h.comentario,
      usuario: h.usuario ? { id: Number(h.usuario.id), nombre: h.usuario.nombre } : null,
      createdAt: h.createdAt,
    })),
  };
}

// ---------- Clave de acceso de factura (SIMULADA, 49 caracteres) ----------
// NO es un algoritmo real del SRI: se documenta como simulación para el Reto.
function claveAccesoSimulada({ fecha, tipoComprobante, identificacion, ambiente, establecimiento, punto, secuencial }) {
  const ddmmaaaa = `${String(fecha.getUTCDate()).padStart(2, '0')}${String(fecha.getUTCMonth() + 1).padStart(2, '0')}${fecha.getUTCFullYear()}`;
  const ident = String(identificacion ?? '9999999999999').replace(/\D/g, '').padStart(13, '0').slice(0, 13);
  const aleatorio = () => String(crypto.randomInt(0, 1000000000)).padStart(9, '0').slice(0, 9);
  return [
    ddmmaaaa, // 8
    tipoComprobante.padStart(2, '0'), // 2
    ident, // 13
    String(ambiente), // 1
    String(establecimiento).padStart(3, '0'), // 3
    String(punto).padStart(3, '0'), // 3
    String(secuencial).padStart(9, '0'), // 9
    aleatorio(), // 9
    String(crypto.randomInt(0, 10)), // 1 (dígito verificador simulado)
  ].join(''); // total = 49 caracteres
}

// ---------- Creación del pedido (transacción completa) ----------
// Un solo mensaje, con TODAS las variantes sin stock, para que la UI pueda
// explicar el motivo y ajustar cantidades sin repetir intentos.
function errorStock(detalles) {
  const primero = detalles[0];
  const sufijo = detalles.length > 1 ? ` (y ${detalles.length - 1} variante(s) más)` : '';
  return new ApiError(CODIGOS.REGLA_NEGOCIO,
    `Stock insuficiente: solo hay ${primero.disponible} unidades de "${primero.nombreProducto}" (${primero.sku}). Elige una cantidad entre 1 y ${primero.disponible}${sufijo}.`,
    detalles);
}

export async function crearPedido(usuarioId, body) {
  const itemsBody = body.items ?? [];

  // 1) Normaliza los items: admite varianteId directo o productoId (compatibilidad
  //    con el contrato del Reto 2 original; se resuelve a la variante única).
  const resueltos = new Map(); // varianteId → cantidad
  for (const item of itemsBody) {
    let varianteId = item.varianteId ?? null;
    if (!varianteId && item.productoId) {
      const producto = await prisma.producto.findUnique({
        where: { id: BigInt(item.productoId) },
        include: { variantes: { where: { activo: true } } },
      });
      if (!producto || !producto.activo) {
        throw new ApiError(CODIGOS.NO_ENCONTRADO, `El producto con id ${item.productoId} no existe.`);
      }
      if (producto.variantes.length === 1) {
        varianteId = Number(producto.variantes[0].id);
      } else {
        throw new ApiError(CODIGOS.VALIDACION,
          `El producto "${producto.nombre}" tiene varias variantes: indica varianteId.`);
      }
    }
    if (!varianteId) {
      throw new ApiError(CODIGOS.VALIDACION, 'Cada item debe llevar varianteId o productoId.');
    }
    const clave = Number(varianteId);
    if (resueltos.has(clave)) {
      throw new ApiError(CODIGOS.VALIDACION, 'No repitas la misma variante en el pedido: ajusta la cantidad.');
    }
    resueltos.set(clave, item.cantidad);
  }

  const pedido = await transaccionLarga(async (tx) => {
    // 2) Usuario y dirección (verificación de propiedad → anti-IDOR)
    const usuario = await tx.usuario.findUnique({
      where: { id: usuarioId },
      include: { rol: true, direcciones: { where: { activa: true } } },
    });
    if (!usuario) throw new ApiError(CODIGOS.NO_AUTORIZADO, 'La sesión ya no es válida.');

    let direccion = null;
    let direccionSnapshot = null;
    const direccionId = body.direccionId ?? usuario.direcciones.find((d) => d.esPredeterminada)?.id;
    if (direccionId) {
      direccion = await tx.direccion.findUnique({ where: { id: BigInt(direccionId) } });
      if (!direccion || !direccion.activa) {
        throw new ApiError(CODIGOS.NO_ENCONTRADO, 'La dirección indicada no existe.');
      }
      if (Number(direccion.usuarioId) !== Number(usuarioId)) {
        // IDOR (OWASP A01): un usuario no puede enviar pedidos a direcciones ajenas
        throw new ApiError(CODIGOS.PROHIBIDO, 'No puedes usar una dirección que no pertenece a tu cuenta.');
      }
      direccionSnapshot = {
        alias: direccion.alias,
        destinatario: direccion.destinatario,
        telefono: direccion.telefono,
        provincia: direccion.provincia,
        ciudad: direccion.ciudad,
        callePrincipal: direccion.callePrincipal,
        calleSecundaria: direccion.calleSecundaria,
        numeracion: direccion.numeracion,
        referencia: direccion.referencia,
        codigoPostal: direccion.codigoPostal,
      };
    }

    // 3) Parámetros del sistema (IVA, moneda, envío, punto de emisión)
    const ivaPct = new Prisma.Decimal((await parametro(tx, 'iva_porcentaje')) ?? '15');
    const moneda = (await parametro(tx, 'moneda')) ?? 'USD';
    const costoEnvio = new Prisma.Decimal((await parametro(tx, 'costo_envio_default')) ?? '10');
    const establecimiento = (await parametro(tx, 'establecimiento_default')) ?? '001';
    const puntoEmision = (await parametro(tx, 'punto_emision_default')) ?? '001';

    // 4) Variantes VIGENTES desde la BD (precios nunca del cliente)
    const ids = [...resueltos.keys()].map((n) => BigInt(n));
    const variantes = await tx.variante.findMany({
      where: { id: { in: ids }, activo: true },
      include: { material: true, producto: true },
    });
    const porId = new Map(variantes.map((v) => [Number(v.id), v]));

    // 5) Validación de existencia y stock (se informa de TODAS las variantes)
    const faltantes = [];
    for (const [varianteId, cantidad] of resueltos) {
      const v = porId.get(varianteId);
      if (!v) {
        throw new ApiError(CODIGOS.NO_ENCONTRADO, `La variante con id ${varianteId} no existe o está inactiva.`);
      }
      if (v.stock < cantidad) {
        faltantes.push({
          campo: `items[${varianteId}].cantidad`,
          mensaje: `Solo hay ${v.stock} unidades disponibles de "${v.producto.nombre}" (${v.sku}).`,
          varianteId,
          sku: v.sku,
          nombreProducto: v.producto.nombre,
          solicitado: cantidad,
          disponible: v.stock,
        });
      }
    }
    if (faltantes.length) throw errorStock(faltantes);

    // 6) Totales calculados en el servidor (subtotal + envío + IVA)
    let subtotal = new Prisma.Decimal(0);
    const lineas = [...resueltos.entries()].map(([varianteId, cantidad]) => {
      const v = porId.get(varianteId);
      const subtotalLinea = new Prisma.Decimal(v.precio).mul(cantidad);
      subtotal = subtotal.add(subtotalLinea);
      return {
        v,
        cantidad,
        subtotal: subtotalLinea,
      };
    });
    const baseImponible = subtotal.add(costoEnvio);
    const ivaValor = baseImponible.mul(ivaPct).div(100);
    const total = baseImponible.add(ivaValor);

    // 7) Descuento de stock condicional y atómico (condición de carrera evitada)
    for (const linea of lineas) {
      const actualizados = await tx.variante.updateMany({
        where: { id: linea.v.id, stock: { gte: linea.cantidad }, activo: true },
        data: { stock: { decrement: linea.cantidad } },
      });
      if (actualizados.count !== 1) {
        // Otra transacción pudo tomar unidades entre la lectura y el update.
        const actual = await tx.variante.findUnique({
          where: { id: linea.v.id },
          include: { producto: true },
        });
        const disponible = Number(actual?.stock ?? 0);
        throw errorStock([{
          campo: `items[${linea.v.id}].cantidad`,
          mensaje: `Solo hay ${disponible} unidades disponibles de "${actual?.producto?.nombre ?? linea.v.producto.nombre}" (${linea.v.sku}).`,
          varianteId: Number(linea.v.id),
          sku: linea.v.sku,
          nombreProducto: actual?.producto?.nombre ?? linea.v.producto.nombre,
          solicitado: linea.cantidad,
          disponible,
        }]);
      }
    }

    // 8) Pago simulado (nunca se piden datos de tarjeta)
    const metodo = body.metodoPago ?? 'tarjeta';
    const pagoAprobado = metodo === 'tarjeta';
    const estadoInicial = pagoAprobado ? 'pagado' : 'pendiente';

    // 9) El pedido (numero_pedido sale de la secuencia numero_pedido_seq)
    const pedidoCreado = await tx.pedido.create({
      data: {
        usuarioId,
        direccionId: direccion ? direccion.id : null,
        estado: estadoInicial,
        subtotal,
        costoEnvio,
        ivaPorcentaje: ivaPct,
        ivaValor,
        total,
        moneda,
        notas: body.notas ?? null,
      },
    });

    // 10) Items con snapshots (congelan lo vendido aunque el catálogo cambie)
    await tx.pedidoItem.createMany({
      data: lineas.map(({ v, cantidad, subtotal: subtotalLinea }) => ({
        pedidoId: pedidoCreado.id,
        varianteId: v.id,
        sku: v.sku,
        nombreProducto: v.producto.nombre,
        material: v.material?.nombre ?? '',
        medida: v.medida,
        cantidad,
        precioUnitario: v.precio,
        subtotal: subtotalLinea,
      })),
    });

    // 11) Historial de estados (entrada inicial)
    await tx.pedidoHistorialEstado.create({
      data: {
        pedidoId: pedidoCreado.id,
        estadoAnterior: null,
        estadoNuevo: estadoInicial,
        usuarioId,
        comentario: pagoAprobado ? 'Pedido creado con pago aprobado (tarjeta simulada).' : 'Pedido creado; pago pendiente de confirmación.',
      },
    });

    // 12) Pago simulado con referencia única
    await tx.pago.create({
      data: {
        pedidoId: pedidoCreado.id,
        metodo,
        pasarela: 'simulada',
        referenciaExterna: `SIM-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`,
        monto: total,
        moneda,
        estado: pagoAprobado ? 'aprobado' : 'pendiente',
        fechaPago: pagoAprobado ? new Date() : null,
        respuestaPasarela: {
          simulacion: true,
          metodo,
          resultado: pagoAprobado ? 'aprobado' : 'pendiente',
          mensaje: pagoAprobado
            ? 'Pago aprobado por la pasarela simulada (sin datos reales de tarjeta).'
            : 'Esperando confirmación del comercio (transferencia/depósito/contra entrega).',
        },
      },
    });

    // 13) Envío con snapshot de la dirección (jsonb)
    await tx.envio.create({
      data: {
        pedidoId: pedidoCreado.id,
        direccionSnapshot,
        estado: 'pendiente',
        costo: costoEnvio,
      },
    });

    // 14) Factura: numeración desde puntos_emision con bloqueo en la MISMA transacción
    const filas = await tx.$queryRaw`
      UPDATE puntos_emision
      SET ultimo_secuencial = ultimo_secuencial + 1
      WHERE establecimiento = ${establecimiento} AND punto = ${puntoEmision}
      RETURNING ultimo_secuencial`;
    const secuencial = Number(filas[0]?.ultimo_secuencial);
    if (!Number.isInteger(secuencial)) {
      throw new ApiError(CODIGOS.INTERNO, 'No se pudo numerar la factura (punto de emisión no configurado).');
    }
    const numeroFactura = `${String(establecimiento).padStart(3, '0')}-${String(puntoEmision).padStart(3, '0')}-${String(secuencial).padStart(9, '0')}`;

    const fact = body.facturacion ?? {};
    const tipoIdentificacion = fact.tipoIdentificacion ?? 'consumidor_final';
    const identificacion = fact.identificacion ?? '9999999999999';
    await tx.factura.create({
      data: {
        pedidoId: pedidoCreado.id,
        establecimiento,
        puntoEmision,
        secuencial,
        numero: numeroFactura,
        tipo: 'factura',
        tipoIdentificacion,
        identificacion,
        razonSocial: fact.razonSocial ?? usuario.nombre,
        emailFacturacion: fact.email ?? usuario.email,
        telefono: fact.telefono ?? usuario.telefono ?? null,
        direccionFiscal: fact.direccionFiscal ?? null,
        subtotal,
        costoEnvio,
        ivaPorcentaje: ivaPct,
        ivaValor,
        total,
        claveAcceso: claveAccesoSimulada({
          fecha: new Date(),
          tipoComprobante: '01',
          identificacion,
          ambiente: 1,
          establecimiento,
          punto: puntoEmision,
          secuencial,
        }),
      },
    });

    // 15) Vaciar el carrito del servidor del usuario
    await tx.carritoItem.deleteMany({ where: { carrito: { usuarioId } } });

    // 16) Movimientos de inventario (trazabilidad de la venta)
    await tx.movimientoInventario.createMany({
      data: lineas.map(({ v, cantidad }) => ({
        varianteId: v.id,
        tipo: 'venta',
        cantidad: -cantidad,
        referenciaTipo: 'pedido',
        referenciaId: String(pedidoCreado.id),
        usuarioId,
      })),
    });

    return tx.pedido.findUnique({ where: { id: pedidoCreado.id }, include: INCLUIR_PEDIDO });
  });

  return pedidoLimpio(pedido);
}

// ---------- Consultas ----------
export async function misPedidos(usuarioId) {
  const pedidos = await prisma.pedido.findMany({
    where: { usuarioId },
    orderBy: { id: 'desc' },
    include: INCLUIR_PEDIDO,
  });
  return pedidos.map(pedidoLimpio);
}

export async function todosLosPedidos({ estado } = {}) {
  const pedidos = await prisma.pedido.findMany({
    where: estado ? { estado } : undefined,
    orderBy: { id: 'desc' },
    include: INCLUIR_PEDIDO,
  });
  return pedidos.map(pedidoLimpio);
}

export async function pedidoPorId(id, { usuarioId, esAdmin }) {
  const p = await prisma.pedido.findUnique({
    where: { id: BigInt(id) },
    include: INCLUIR_PEDIDO,
  });
  if (!p) return null;
  if (!esAdmin && Number(p.usuarioId) !== Number(usuarioId)) {
    // IDOR (OWASP A01): verificación de pertenencia del recurso
    throw new ApiError(CODIGOS.PROHIBIDO, 'Ese pedido no pertenece a tu cuenta.');
  }
  return pedidoLimpio(p);
}

// ---------- Cambios de estado ----------
const TRANSICIONES = {
  pendiente: ['pagado', 'cancelado'],
  pagado: ['preparando', 'cancelado'],
  preparando: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
};

export async function cambiarEstado(id, estadoNuevo, usuarioId, comentario) {
  return transaccionLarga(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: BigInt(id) },
      include: { items: true, pagos: true },
    });
    if (!pedido) return null;

    const permitidas = TRANSICIONES[pedido.estado] ?? [];
    if (!permitidas.includes(estadoNuevo)) {
      throw new ApiError(CODIGOS.REGLA_NEGOCIO,
        `Transición no permitida: de "${pedido.estado}" a "${estadoNuevo}".`);
    }

    await tx.pedido.update({ where: { id: pedido.id }, data: { estado: estadoNuevo } });
    await tx.pedidoHistorialEstado.create({
      data: {
        pedidoId: pedido.id,
        estadoAnterior: pedido.estado,
        estadoNuevo,
        usuarioId,
        comentario: comentario ?? null,
      },
    });

    // Al cancelar un pedido no enviado: repone stock + movimiento + estado del pago
    if (estadoNuevo === 'cancelado') {
      for (const item of pedido.items) {
        await tx.variante.update({
          where: { id: item.varianteId },
          data: { stock: { increment: item.cantidad } },
        });
        await tx.movimientoInventario.create({
          data: {
            varianteId: item.varianteId,
            tipo: 'devolucion',
            cantidad: item.cantidad,
            referenciaTipo: 'pedido',
            referenciaId: String(pedido.id),
            usuarioId,
          },
        });
      }
      const pago = pedido.pagos[0];
      if (pago) {
        await tx.pago.update({
          where: { id: pago.id },
          data: { estado: pago.estado === 'aprobado' ? 'reembolsado' : 'rechazado' },
        });
      }
    }

    return tx.pedido.findUnique({ where: { id: pedido.id }, include: INCLUIR_PEDIDO });
  }).then((p) => (p ? pedidoLimpio(p) : null));
}

// Confirmación de pago por un admin (transferencia/depósito/contra entrega)
export async function confirmarPago(id, adminId) {
  return transaccionLarga(async (tx) => {
    const pedido = await tx.pedido.findUnique({ where: { id: BigInt(id) }, include: { pagos: true } });
    if (!pedido) return null;
    const pago = pedido.pagos[0];
    if (!pago) throw new ApiError(CODIGOS.NO_ENCONTRADO, 'El pedido no tiene pago registrado.');
    if (pago.estado === 'aprobado') {
      throw new ApiError(CODIGOS.REGLA_NEGOCIO, 'El pago ya estaba aprobado.');
    }

    await tx.pago.update({
      where: { id: pago.id },
      data: { estado: 'aprobado', fechaPago: new Date() },
    });
    if (pedido.estado === 'pendiente') {
      await tx.pedido.update({ where: { id: pedido.id }, data: { estado: 'pagado' } });
      await tx.pedidoHistorialEstado.create({
        data: {
          pedidoId: pedido.id,
          estadoAnterior: 'pendiente',
          estadoNuevo: 'pagado',
          usuarioId: adminId,
          comentario: 'Pago confirmado por administración.',
        },
      });
    }
    return tx.pedido.findUnique({ where: { id: pedido.id }, include: INCLUIR_PEDIDO });
  }).then((p) => (p ? pedidoLimpio(p) : null));
}

// Registro del envío por un admin
export async function registrarEnvio(id, body, adminId) {
  return transaccionLarga(async (tx) => {
    const pedido = await tx.pedido.findUnique({ where: { id: BigInt(id) }, include: { envio: true } });
    if (!pedido) return null;
    if (!pedido.envio) throw new ApiError(CODIGOS.NO_ENCONTRADO, 'El pedido no tiene envío asociado.');

    await tx.envio.update({
      where: { id: pedido.envio.id },
      data: {
        transportista: body.transportista ?? pedido.envio.transportista,
        numeroGuia: body.numeroGuia ?? pedido.envio.numeroGuia,
        estado: body.estado ?? pedido.envio.estado,
        costo: body.costo !== undefined ? body.costo : pedido.envio.costo,
        fechaDespacho: body.estado === 'en_transito' ? new Date() : pedido.envio.fechaDespacho,
        fechaEstimada: body.fechaEstimada ?? pedido.envio.fechaEstimada,
        fechaEntrega: body.estado === 'entregado' ? new Date() : pedido.envio.fechaEntrega,
      },
    });

    // Sincroniza el estado del pedido con el envío
    if (body.estado === 'en_transito' && ['pagado', 'preparando'].includes(pedido.estado)) {
      await tx.pedido.update({ where: { id: pedido.id }, data: { estado: 'enviado' } });
      await tx.pedidoHistorialEstado.create({
        data: {
          pedidoId: pedido.id, estadoAnterior: pedido.estado, estadoNuevo: 'enviado',
          usuarioId: adminId, comentario: 'Pedido despachado.',
        },
      });
    }
    if (body.estado === 'entregado' && pedido.estado !== 'entregado') {
      await tx.pedido.update({ where: { id: pedido.id }, data: { estado: 'entregado' } });
      await tx.pedidoHistorialEstado.create({
        data: {
          pedidoId: pedido.id, estadoAnterior: pedido.estado, estadoNuevo: 'entregado',
          usuarioId: adminId, comentario: 'Entrega confirmada.',
        },
      });
    }
    return tx.pedido.findUnique({ where: { id: pedido.id }, include: INCLUIR_PEDIDO });
  }).then((p) => (p ? pedidoLimpio(p) : null));
}
