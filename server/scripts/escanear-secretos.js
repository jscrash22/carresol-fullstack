// escanear-secretos.js — busca valores reales de server/.env en archivos de texto.
// NUNCA imprime los valores: solo el archivo y el nombre de la variable.
// Uso:
//   node scripts/escanear-secretos.js                 -> archivos versionados (git ls-files)
//   node scripts/escanear-secretos.js <directorio>    -> árbol extraído del zip
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..', '..');
const objetivo = process.argv[2] ? resolve(process.argv[2]) : raiz;
const usarGit = !process.argv[2];

function valoresEnv() {
  const ruta = join(raiz, 'server', '.env');
  if (!existsSync(ruta)) return new Map();
  const mapa = new Map();
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    if (!linea || linea.trim().startsWith('#') || !linea.includes('=')) continue;
    const i = linea.indexOf('=');
    const clave = linea.slice(0, i).trim();
    const valor = linea.slice(i + 1).trim();
    // Solo secretos reales: correos/nombres del seed y NODE_ENV aparecen
    // legítimamente en la documentación y no son credenciales.
    const esSecreto = /(PASSWORD|SECRET|TOKEN|KEY|DATABASE_URL|DIRECT_URL|CONNECTION)/i.test(clave);
    if (esSecreto && valor.length >= 8) mapa.set(clave, valor);
  }
  return mapa;
}

function archivosDeGit() {
  const res = spawnSync('git', ['ls-files', '-z'], { cwd: raiz, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (res.status !== 0) throw new Error('git ls-files falló');
  return res.stdout.split('\0').filter(Boolean).map((r) => join(raiz, r));
}

function archivosDeArbol(dir) {
  const lista = [];
  function recorrer(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (['.git', 'node_modules'].includes(e.name)) continue;
      const r = join(d, e.name);
      if (e.isDirectory()) recorrer(r);
      else lista.push(r);
    }
  }
  recorrer(dir);
  return lista;
}

const esTexto = (nombre) => /\.(md|txt|js|mjs|json|html|css|yml|yaml|env|example|prisma|sql|sh)$/i.test(nombre)
  || nombre.endsWith('.env.example') || nombre === '.gitignore';

const secretos = valoresEnv();
const archivos = usarGit ? archivosDeGit() : archivosDeArbol(objetivo);
const hallazgos = [];
let revisados = 0;
for (const archivo of archivos) {
  if (!existsSync(archivo) || !esTexto(archivo)) continue;
  let texto;
  try { texto = readFileSync(archivo, 'utf8'); } catch { continue; }
  revisados += 1;
  for (const [clave, valor] of secretos) {
    if (texto.includes(valor)) hallazgos.push(`${archivo.replace(objetivo + '\\', '').replace(/\\/g, '/')} → ${clave}`);
  }
}

const titulo = usarGit ? 'ARCHIVOS VERSIONADOS' : `DIRECTORIO ${objetivo}`;
console.log(`=== ESCANEO DE SECRETOS — ${titulo} — ${new Date().toISOString()} ===`);
console.log(`Archivos de texto revisados: ${revisados} · Variables comprobadas: ${secretos.size}`);
if (hallazgos.length) {
  console.log(`HALLAZGOS (${hallazgos.length}):`);
  for (const h of hallazgos) console.log(`  FILTRACIÓN ${h}`);
} else {
  console.log('RESULTADO: 0 fugas (ningún valor real de server/.env aparece en el contenido).');
}
console.log('Los valores de las credenciales NO se han impreso.');

const evidencias = join(raiz, 'docs', 'evidencias');
mkdirSync(evidencias, { recursive: true });
const nombre = usarGit ? 'escaneo-secretos-repo.txt' : 'escaneo-secretos-zip.txt';
writeFileSync(join(evidencias, nombre),
  `Escaneo de secretos — ${new Date().toISOString()}\nObjetivo: ${usarGit ? 'git ls-files' : objetivo}\n`
  + `Variables comprobadas: ${secretos.size} (valores nunca impresos)\n`
  + `Archivos de texto revisados: ${revisados}\n`
  + `Hallazgos: ${hallazgos.length}\n`
  + hallazgos.map((h) => `  ${h}\n`).join(''), 'utf8');

if (hallazgos.length) process.exitCode = 1;
