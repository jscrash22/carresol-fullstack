// db.js — cliente Prisma único + auditoría automática ($extends)
//
// AUDITORÍA (decisión documentada en docs/DECISIONES.md):
// Se implementa con una extensión de cliente Prisma que registra INSERT/UPDATE/DELETE
// de los modelos de negocio clave (productos, variantes, pedidos, compras, proveedores,
// categorías y materiales) en la tabla `auditoria`, tomando el `usuario_id` de la sesión
// desde un AsyncLocalStorage que llena el middleware de autenticación (authRequired).
//
// • Se eligió extensión JS en lugar de triggers SQL porque los triggers no pueden
//   conocer el usuario de la sesión que ejecutó el cambio.
// • Los writes de auditoría usan el cliente base (fuera de cualquier $transaction):
//   si una transacción de negocio hace rollback, podría quedar una fila huérfana de
//   auditoría; es un trade-off aceptable y documentado para este proyecto.
// • Nunca se registran secretos: los campos sensibles (password_hash, token_hash)
//   se eliminan del JSON antes de guardarlo.
import { PrismaClient, Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { logger } from '../utils/logger.js';

// Contexto por petición: { usuarioId } lo establece middleware/auth.js
export const contextoAuditoria = new AsyncLocalStorage();

const prismaBase = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error'],
});

// ---------- Sanitización de datos para auditoría ----------
const CAMPOS_SENSIBLES = new Set(['passwordHash', 'tokenHash', 'password_hash', 'token_hash', 'password', 'passwordConfirm']);

function jsonSeguro(valor) {
  // BigInt/Decimal → Number (JSON.stringify falla con BigInt); Date → ISO
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'bigint') return Number(valor);
  if (valor instanceof Date) return valor.toISOString();
  if (Prisma.Decimal.isDecimal(valor)) return Number(valor);
  if (Array.isArray(valor)) return valor.map(jsonSeguro);
  if (typeof valor === 'object') {
    const salida = {};
    for (const [clave, v] of Object.entries(valor)) {
      if (CAMPOS_SENSIBLES.has(clave)) continue; // jamás persistir secretos
      salida[clave] = jsonSeguro(v);
    }
    return salida;
  }
  return valor;
}

async function registrar(tabla, accion, registroId, anterior, nuevo) {
  try {
    const contexto = contextoAuditoria.getStore();
    await prismaBase.auditoria.create({
      data: {
        tabla,
        registroId: String(registroId ?? ''),
        accion,
        datosAnteriores: anterior ? jsonSeguro(anterior) : undefined,
        datosNuevos: nuevo ? jsonSeguro(nuevo) : undefined,
        usuarioId: contexto?.usuarioId ?? null,
      },
    });
  } catch (e) {
    // La auditoría nunca rompe la operación de negocio; se registra el fallo
    logger.error(`No se pudo escribir auditoría (${tabla} ${accion}): ${e.message}`);
  }
}

// ---------- Extensión con hooks de auditoría ----------
const MODELOS_AUDITADOS = ['producto', 'variante', 'pedido', 'compra', 'proveedor', 'categoria', 'material'];

function hooksConAuditoria(modelo) {
  const nombreTabla = { producto: 'productos', variante: 'variantes', pedido: 'pedidos', compra: 'compras', proveedor: 'proveedores', categoria: 'categorias', material: 'materiales' }[modelo];

  return {
    async create({ args, query }) {
      const resultado = await query(args);
      await registrar(nombreTabla, 'INSERT', resultado?.id, null, args.data);
      return resultado;
    },
    async update({ args, query }) {
      let anterior = null;
      try { anterior = await prismaBase[modelo].findFirst({ where: args.where }); } catch { /* where no compatible con findFirst */ }
      const resultado = await query(args);
      await registrar(nombreTabla, 'UPDATE', resultado?.id ?? anterior?.id, anterior, resultado);
      return resultado;
    },
    async updateMany({ args, query }) {
      let anteriores = [];
      try { anteriores = await prismaBase[modelo].findMany({ where: args.where, take: 200 }); } catch { /* ignore */ }
      const resultado = await query(args);
      for (const a of anteriores) await registrar(nombreTabla, 'UPDATE', a.id, a, { actualizados: resultado.count });
      return resultado;
    },
    async delete({ args, query }) {
      let anterior = null;
      try { anterior = await prismaBase[modelo].findFirst({ where: args.where }); } catch { /* ignore */ }
      await query(args);
      await registrar(nombreTabla, 'DELETE', anterior?.id, anterior, null);
      return anterior;
    },
    async deleteMany({ args, query }) {
      let anteriores = [];
      try { anteriores = await prismaBase[modelo].findMany({ where: args.where, take: 200 }); } catch { /* ignore */ }
      const resultado = await query(args);
      for (const a of anteriores) await registrar(nombreTabla, 'DELETE', a.id, a, null);
      return resultado;
    },
  };
}

const queryExtension = {};
for (const modelo of MODELOS_AUDITADOS) {
  queryExtension[modelo] = hooksConAuditoria(modelo);
}

export const prisma = prismaBase.$extends({ query: queryExtension });
export const prismaSinAuditoria = prismaBase;
