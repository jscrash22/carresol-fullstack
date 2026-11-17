// respaldo-json.js — vuelca TODAS las tablas de la BD configurada a archivos JSON.
//
// Uso (desde server/):
//   node scripts/respaldo-json.js
//
// Los archivos se guardan en server/backups/AAAA-MM-DD_HHmm/<tabla>.json.
// Ese directorio está excluido de git y del zip: los respaldos SON datos reales
// (incluyen hashes) y jamás deben versionarse ni compartirse.
//
// Seguridad: SOLO se imprimen nombres de tabla y números de filas. Nunca se
// imprime ningún valor de usuario, pedido, correo, hash ni cadena de conexión.
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma, PrismaClient } from '@prisma/client';

const aqui = dirname(fileURLToPath(import.meta.url));
const ahora = new Date();
const sello = [
  ahora.getFullYear(),
  String(ahora.getMonth() + 1).padStart(2, '0'),
  String(ahora.getDate()).padStart(2, '0'),
  '_',
  String(ahora.getHours()).padStart(2, '0'),
  String(ahora.getMinutes()).padStart(2, '0'),
].join('');
const destino = join(aqui, '..', 'backups', sello);

// BigInt/Decimal → Number, Date → ISO. No se imprimen valores: solo se serializan.
function serializable(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'bigint') return Number(valor);
  if (valor instanceof Date) return valor.toISOString();
  if (Prisma.Decimal.isDecimal(valor)) return Number(valor);
  if (Array.isArray(valor)) return valor.map(serializable);
  if (typeof valor === 'object') {
    const salida = {};
    for (const [clave, v] of Object.entries(valor)) salida[clave] = serializable(v);
    return salida;
  }
  return valor;
}

const prisma = new PrismaClient();
const modelos = Prisma.dmmf.datamodel.models; // 27 modelos del esquema actual

mkdirSync(destino, { recursive: true });
console.log(`Respaldando ${modelos.length} tablas en server/backups/${sello}/ (ruta local, fuera de git)`);

const conteos = {};
for (const modelo of modelos) {
  try {
    const filas = await prisma[modelo.name].findMany();
    writeFileSync(
      join(destino, `${modelo.dbName || modelo.name}.json`),
      JSON.stringify(serializable(filas), null, 2),
      'utf8',
    );
    conteos[modelo.dbName || modelo.name] = filas.length;
    console.log(`  OK ${modelo.dbName || modelo.name}: ${filas.length} fila(s)`);
  } catch (error) {
    // El mensaje de error de Prisma no contiene la cadena de conexión; aun así,
    // se muestra solo la primera línea y nunca los argumentos de la consulta.
    console.error(`  ERROR ${modelo.dbName || modelo.name}: ${String(error.message).split('\n')[0]}`);
    process.exitCode = 1;
  }
}

console.log('Respaldo terminado. No se imprimieron datos de las filas.');
console.log(`Tablas con filas: ${Object.values(conteos).filter((n) => n > 0).length}/${modelos.length}`);
await prisma.$disconnect();
