// verificar-enlaces.js — comprueba que las rutas citadas en la documentación existan.
// Los prompts archivados en docs/prompts/ son históricos y se excluyen (contienen
// deliberadamente referencias a nombres de archivos antiguos).
// Salida UTF-8: docs/evidencias/verificacion-enlaces.txt
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..', '..');
const evidencias = join(raiz, 'docs', 'evidencias');
mkdirSync(evidencias, { recursive: true });

const salida = [];
let revisadas = 0, rotas = 0;
function log(t = '') { console.log(t); salida.push(t); }

function archivosMarkdown(dir) {
  const lista = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'prompts'].includes(e.name)) continue;
    const r = join(dir, e.name);
    if (e.isDirectory()) lista.push(...archivosMarkdown(r));
    else if (e.name.endsWith('.md')) lista.push(r);
  }
  return lista;
}

function normalizar(ruta) {
  return ruta
    .replace(/^\[|\]$/g, '')
    .replace(/[),.;]+$/, '')
    .replace(/:\d+(?:[-,]\d+)*$/, '') // quita anotaciones tipo archivo.js:12-20
    .replace(/^`|`$/g, '')
    .split(/[?#]/)[0]
    .trim();
}

function esRutaCandidata(t) {
  if (!t || t.length < 4 || t.length > 160) return false;
  if (/^(https?:|mailto:|#)/i.test(t)) return false;
  if (/[<>|*=]/.test(t) || t.includes('\\') || t.includes('→')) return false;
  if (t.includes('node_modules') || t === 'server/.env' || t.endsWith('/.env')) return false;
  if (t === 'server/certs/') return false; // directorio opcional de certificados, ignorado por git
  if (t.includes('${') || t.includes('AAAA') || t.includes('...')) return false;
  if (/^\d/.test(t) && !t.includes('/')) return false;
  return /^(docs|frontend|server|\.github)\//.test(t)
    || ['README.md', 'render.yaml', 'docker-compose.yml', '.gitignore', 'Reto2_Carresol.zip'].includes(t);
}

function rutasDe(texto) {
  const encontradas = new Set();
  for (const m of texto.matchAll(/\]\(([^)]+)\)/g)) {
    const t = normalizar(m[1]);
    if (esRutaCandidata(t)) encontradas.add(t);
  }
  for (const m of texto.matchAll(/`([^`\n]+)`/g)) {
    // Un bloque `código` puede contener más de una ruta separada por espacios.
    for (const parte of m[1].split(/\s+/)) {
      const t = normalizar(parte);
      if (esRutaCandidata(t)) encontradas.add(t);
    }
  }
  return encontradas;
}

log(`=== VERIFICACIÓN DE RUTAS EN DOCUMENTACIÓN — ${new Date().toISOString()} ===`);
const docs = [join(raiz, 'README.md'), ...archivosMarkdown(join(raiz, 'docs'))];
for (const archivo of docs) {
  const rel = archivo.replace(raiz + '\\', '').replace(/\\/g, '/');
  const texto = readFileSync(archivo, 'utf8');
  for (const ruta of rutasDe(texto)) {
    revisadas += 1;
    const existe = existsSync(resolve(raiz, ruta));
    log(`${existe ? 'PASS ✓' : 'FAIL ✗'} ${rel} → ${ruta}`);
    if (!existe) rotas += 1;
  }
}
log('');
log(`RESUMEN: ${revisadas} rutas revisadas · ${rotas} rotas`);
writeFileSync(join(evidencias, 'verificacion-enlaces.txt'), salida.join('\n') + '\n', 'utf8');
console.log(`\nEvidencia: ${join(evidencias, 'verificacion-enlaces.txt')}`);
if (rotas) process.exitCode = 1;
