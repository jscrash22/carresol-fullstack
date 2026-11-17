// serve-frontend.js — sirve el frontend estático en el origen configurado para CORS
// Uso: npm run frontend  (por defecto http://localhost:5500)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const PUERTO = Number(process.env.FRONTEND_PORT || 5500);
const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..', '..', 'frontend');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const servidor = http.createServer(async (req, res) => {
  try {
    let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (ruta === '/') ruta = '/index.html';
    const archivo = normalize(join(raiz, ruta));
    if (!archivo.startsWith(raiz)) {
      res.writeHead(403).end('Prohibido');
      return;
    }
    const contenido = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': MIME[extname(archivo).toLowerCase()] || 'application/octet-stream' });
    res.end(contenido);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
  }
});

servidor.listen(PUERTO, () =>
  console.log(`Frontend de Carresol en http://localhost:${PUERTO} (carpeta ${raiz})`));
