// logger.js — logger propio con niveles, timestamp y middleware de peticiones
const NIVELES = { debug: 10, info: 20, warn: 30, error: 40 };
const NIVEL_ACTIVO = NIVELES[process.env.LOG_LEVEL || 'info'] ?? NIVELES.info;

function marcaDeTiempo() {
  return new Date().toISOString();
}

function emitir(nivel, mensaje, extra) {
  if (NIVELES[nivel] < NIVEL_ACTIVO) return;
  const linea = `${marcaDeTiempo()} [${nivel.toUpperCase()}] ${mensaje}`;
  if (extra !== undefined) {
    if (nivel === 'error') console.error(linea, extra);
    else console.log(linea, extra);
  } else {
    if (nivel === 'error') console.error(linea);
    else console.log(linea);
  }
}

export const logger = {
  debug: (msg, extra) => emitir('debug', msg, extra),
  info: (msg, extra) => emitir('info', msg, extra),
  warn: (msg, extra) => emitir('warn', msg, extra),
  error: (msg, extra) => emitir('error', msg, extra),
};

// Middleware: registra método, URL, status y duración de cada petición
export function loggerMiddleware(req, res, next) {
  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    logger.info(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms.toFixed(1)} ms)`);
  });
  next();
}
