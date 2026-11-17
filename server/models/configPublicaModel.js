// configPublicaModel.js — subconjunto PÚBLICO y permitido de parametros_sistema.
//
// El frontend usa estos valores para el resumen del carrito/checkout con las
// constantes de frontend/config.js como fallback. El servidor SIGUE recalculando
// IVA y envío al crear el pedido: esto es solo información para la UI.
// Nunca se exponen otros parámetros (secuenciales, claves internas, etc.).
import { prisma } from './db.js';

const CLAVES = ['iva_porcentaje', 'moneda', 'costo_envio_default'];
const VALORES_POR_DEFECTO = { ivaPorcentaje: 15, moneda: 'USD', costoEnvioDefault: 10 };
const TTL_MS = 60 * 1000; // caché corta: cambios de admin visibles en ≤ 1 min

let cache = null;
let caducidad = 0;

function numeroO(valor, defecto) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : defecto;
}

export async function configuracionPublica() {
  if (cache && Date.now() < caducidad) return cache;

  const filas = await prisma.parametroSistema.findMany({
    where: { clave: { in: CLAVES } },
    select: { clave: true, valor: true },
  });
  const porClave = Object.fromEntries(filas.map((f) => [f.clave, f.valor]));

  cache = {
    ivaPorcentaje: numeroO(porClave.iva_porcentaje, VALORES_POR_DEFECTO.ivaPorcentaje),
    moneda: porClave.moneda || VALORES_POR_DEFECTO.moneda,
    costoEnvioDefault: numeroO(porClave.costo_envio_default, VALORES_POR_DEFECTO.costoEnvioDefault),
  };
  caducidad = Date.now() + TTL_MS;
  return cache;
}
