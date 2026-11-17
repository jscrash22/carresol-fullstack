// transaccion.js — opciones compartidas para las transacciones interactivas largas.
//
// El default de Prisma es maxWait=2 s y timeout=5 s. Crear un pedido (o recibir
// una compra) escribe en 8 tablas; con el arranque en frío de Render o latencia
// hacia Supabase ese plazo puede quedarse corto y aparecer "Transaction already
// closed". Todas las transacciones largas usan estas opciones y los errores se
// mapean a 503 consistente en middleware/errorHandler.js.
export const TX_LARGA = Object.freeze({ maxWait: 10000, timeout: 20000 });
