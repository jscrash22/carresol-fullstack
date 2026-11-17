// configModel.js — configuración pública (IVA / envío) con fallback local.
// La UI usa estos valores solo para estimados; el servidor SIEMPRE recalcula el
// pedido con los parámetros de la BD. Si la API no responde, se mantienen las
// constantes de config.js (comportamiento anterior, sin romper la demo).
import { api } from './apiClient.js';
import { IVA, ENVIO_ESTIMADO } from '../config.js';

let actual = { iva: IVA, envio: ENVIO_ESTIMADO, moneda: 'USD' };

export async function cargarConfiguracionPublica() {
  try {
    const datos = await api.get('/config-publica');
    const iva = Number(datos?.ivaPorcentaje);
    const envio = Number(datos?.costoEnvioDefault);
    actual = {
      iva: Number.isFinite(iva) ? iva / 100 : IVA,
      envio: Number.isFinite(envio) ? envio : ENVIO_ESTIMADO,
      moneda: datos?.moneda || 'USD',
    };
  } catch {
    // Sin conexión: se conservan los valores por defecto.
  }
  return configActual();
}

export function configActual() {
  return { ...actual };
}
