// server.js — arranque del backend (HTTP o HTTPS opcional según HTTPS=true en .env)
import 'dotenv/config';
import http from 'node:http';
import https from 'node:https';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import app from './app.js';
import { logger } from './utils/logger.js';
import { prisma } from './models/db.js';

const PUERTO = Number(process.env.PORT || 3000);
const aqui = dirname(fileURLToPath(import.meta.url));

// Los mensajes de Prisma pueden incluir host:puerto o la cadena de conexión.
// Nunca los dejamos salir a consola: solo texto sanitizado y sin valores.
function mensajeSeguro(error) {
  return String(error?.message || error)
    .replace(/postgresql:\/\/\S+/gi, '[CADENA_OCULTA]')
    .replace(/`[^`]+:\d{2,5}`/g, '[HOST_OCULTO]')
    .split('\n')[0]
    .slice(0, 300);
}

function arrancar() {
  if (String(process.env.HTTPS).toLowerCase() === 'true') {
    const clave = join(aqui, 'certs', 'key.pem');
    const cert = join(aqui, 'certs', 'cert.pem');
    if (!existsSync(clave) || !existsSync(cert)) {
      logger.error('HTTPS=true pero faltan server/certs/key.pem o cert.pem.');
      logger.error('Genera el certificado self-signed (ver README, sección HTTPS):');
      logger.error('  openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"');
      process.exit(1);
    }
    const servidor = https.createServer(
      { key: readFileSync(clave), cert: readFileSync(cert) },
      app,
    );
    servidor.listen(PUERTO, () =>
      logger.info(`Carresol API en https://localhost:${PUERTO} (HTTPS self-signed)`));
    return servidor;
  }
  const servidor = http.createServer(app);
  servidor.listen(PUERTO, () =>
    logger.info(`Carresol API en http://localhost:${PUERTO} (CORS: ${process.env.CORS_ORIGIN})`));
  return servidor;
}

async function main() {
  // Verificación real de conexión a la base de datos antes de abrir el puerto
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Conexión a la base de datos: OK');
  } catch (e) {
    logger.error('No se pudo conectar a la base de datos:', mensajeSeguro(e));
    logger.error('Revisa DATABASE_URL en server/.env (y que el motor esté levantado).');
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
  arrancar();
}

main();

// Errores fatales del proceso: registrar sin datos sensibles y salir con código 1
// para que Render reinicie la instancia limpiamente (en vez de dejarla "zombi").
function terminarPorErrorFatal(motivo, error) {
  logger.error(`${motivo}: ${mensajeSeguro(error)}`);
  void (async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  })();
}
process.on('unhandledRejection', (error) => terminarPorErrorFatal('Promesa rechazada no manejada', error));
process.on('uncaughtException', (error) => terminarPorErrorFatal('Excepción no capturada', error));

// Cierre limpio (SIGINT de consola y SIGTERM de Render)
async function cerrar(senal) {
  await prisma.$disconnect().catch(() => {});
  logger.info(`Servidor detenido (${senal}).`);
  process.exit(0);
}
process.on('SIGINT', () => cerrar('SIGINT'));
process.on('SIGTERM', () => cerrar('SIGTERM'));
