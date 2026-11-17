// stockModel.js — regla única de visualización de stock (§4.2).
// "Quedan N" cuando N ≤ stock_minimo (o ≤ 5 si no se informa); "Agotado" en 0.
// El stock se descuenta al CREAR el pedido (reserva) aunque el pago simulado
// siga `pendiente`, y se repone al CANCELAR el pedido si aún no fue enviado.
export function etiquetaStock(stock, minimo = 5) {
  const unidades = Number(stock ?? 0);
  const umbral = Number(minimo) > 0 ? Number(minimo) : 5;
  if (unidades <= 0) return { texto: 'Agotado', clase: 'agotado', agotado: true, unidades: 0 };
  if (unidades <= umbral) return { texto: `Quedan ${unidades}`, clase: 'stock-bajo', agotado: false, unidades };
  return { texto: `Stock: ${unidades}`, clase: '', agotado: false, unidades };
}
