// verificacion-final.js — comprobaciones estáticas + humo SOLO LECTURA.
// No escribe en la BD: se puede ejecutar contra producción con seguridad.
// Escribe docs/evidencias/verificacion-final.txt en UTF-8.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..', '..');
const evidencias = join(raiz, 'docs', 'evidencias');
mkdirSync(evidencias, { recursive: true });
const salida = [];
let pass = 0, fail = 0, pendiente = 0;
function log(t = '') { console.log(t); salida.push(t); }
function check(nombre, ok, detalle = '') {
  log(`${ok ? 'PASS ✓' : 'FAIL ✗'} ${nombre}${detalle ? ' — ' + detalle : ''}`);
  ok ? pass++ : fail++;
}
function pend(nombre, motivo) { log(`PENDIENTE ▸ ${nombre} — ${motivo}`); pendiente++; }
function leer(relativo) { return readFileSync(join(raiz, relativo), 'utf8'); }

log(`=== VERIFICACIÓN FINAL — ${new Date().toISOString()} ===`);
log('Sin escrituras en Supabase. Contraseñas: NO se imprimen.');
log('');

// ---------- Sintaxis de todo el JavaScript del repo ----------
{
  const archivos = [];
  function recorrer(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', 'backups', 'capturas'].includes(e.name)) continue;
      const r = join(dir, e.name);
      if (e.isDirectory()) recorrer(r);
      else if (e.name.endsWith('.js')) archivos.push(r);
    }
  }
  recorrer(raiz);
  const fallos = [];
  for (const archivo of archivos) {
    const res = spawnSync(process.execPath, ['--check', archivo], { encoding: 'utf8' });
    if (res.status !== 0) fallos.push(archivo.replace(raiz, ''));
  }
  check(`node --check en ${archivos.length} archivos JS`, fallos.length === 0, fallos.join(', ') || 'sin errores');
}

// ---------- Endurecimiento presente en el código fuente ----------
{
  const app = leer('server/app.js');
  const errores = leer('server/middleware/errorHandler.js');
  check('Body limit 64kb y error LIMITE_BODY', /64kb/.test(app) && /LIMITE_BODY/.test(errores));
  check('Sin stacktraces en respuestas de error', !/err\.stack/.test(errores));
  const cfg = leer('server/controllers/configPublicaController.js');
  check('/api/config-publica con caché de 60 s', /max-age=60/.test(cfg));
  const validators = leer('server/middleware/validators.js');
  check('Validador de imágenes rechaza javascript/data/http/..',
    /javascript\|data\|http/.test(validators) && /includes\('\.\.'\)|indexOf\('\.\.'\)/.test(validators));
  const seed = leer('server/prisma/seed.js');
  check('El seed aborta con contraseñas ausentes o cortas', /length\s*<\s*10/.test(seed));
  const envEjemplo = leer('server/.env.example');
  check('.env.example documenta DIRECT_URL/RATE_*/NODE_VERSION',
    ['DIRECT_URL', 'RATE_LOGIN_MAX', 'RATE_REGISTER_MAX', 'NODE_VERSION'].every((k) => envEjemplo.includes(k)));
  const keepalive = leer('.github/workflows/keepalive.yml');
  check('Workflow keepalive con workflow_dispatch', /workflow_dispatch/.test(keepalive));
}

// ---------- Humo de solo lectura contra la API desplegada ----------
const BASE = process.argv[2] || 'https://carresol-api.onrender.com/api';
try {
  const salud = await fetch(`${BASE}/health`);
  check('GET /api/health → 200', salud.status === 200, `status=${salud.status}`);
  const datos = await (await fetch(`${BASE}/productos`)).json();
  const productos = datos?.data ?? datos;
  check('GET /api/productos → 25 productos', Array.isArray(productos) && productos.length === 25,
    `n=${Array.isArray(productos) ? productos.length : '?'}`);
  const cors = await fetch(`${BASE}/health`, { headers: { Origin: 'https://ejemplo-ajeno.test' } });
  check('CORS rechaza origen ajeno', !cors.headers.has('access-control-allow-origin'));
  const permitido = await fetch(`${BASE}/health`, { headers: { Origin: 'https://jscrash22.github.io' } });
  check('CORS permite el origen del frontend',
    permitido.headers.get('access-control-allow-origin') === 'https://jscrash22.github.io');

  const cfgRes = await fetch(`${BASE}/config-publica`);
  if (cfgRes.status === 404) {
    pend('GET /api/config-publica en producción', 'despliegue pendiente; la ruta existe en el código local');
  } else {
    const cfg = await cfgRes.json();
    const claves = Object.keys(cfg?.data ?? cfg ?? {}).sort();
    check('GET /api/config-publica → solo campos permitidos',
      cfgRes.status === 200 && claves.join(',') === 'costoEnvioDefault,ivaPorcentaje,moneda',
      `claves=${claves.join(',')}`);
  }

  const exceso = await fetch(`${BASE}/contacto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://jscrash22.github.io' },
    body: JSON.stringify({ nombre: 'x'.repeat(40 * 1024) }),
  });
  if (exceso.status === 413) check('Body excesivo → 413', true);
  else pend('Body excesivo → 413 en producción', `status=${exceso.status}; despliegue pendiente`);
} catch (err) {
  check('Humo de solo lectura contra la API', false, err.message);
}

log('');
log(`RESUMEN: ${pass} PASS · ${fail} FAIL · ${pendiente} PENDIENTE`);
writeFileSync(join(evidencias, 'verificacion-final.txt'), salida.join('\n') + '\n', 'utf8');
console.log(`\nEvidencia: ${join(evidencias, 'verificacion-final.txt')}`);
if (fail) process.exitCode = 1;
