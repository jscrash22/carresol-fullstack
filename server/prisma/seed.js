// seed.js — datos iniciales de Carresol (modelo ER real, PostgreSQL)
// Idempotente: todo con upsert por clave natural; se puede correr varias veces.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// ---------- Utilidades deterministas ----------
// Slug a partir del nombre (sin acentos, minúsculas, guiones)
function slug(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Fragmento corto y en mayúsculas para SKU: "Reloj Carresol Imperial" → "REL-IMP"
function fragmento(nombre) {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-');
  const partes = limpio.split('-').filter(Boolean);
  // se descarta la palabra "CARRESOL" para SKUs más compactos
  const utiles = partes.filter((p) => p !== 'CARRESOL');
  return (utiles.length ? utiles : partes).map((p) => p.slice(0, 3)).join('-');
}

// Stock determinista entre 5 y 30
const stockPara = (id, idx) => 5 + ((id * 7 + idx * 3) % 26);

// ---------- Configuración del catálogo ----------
const CATEGORIAS = [
  { slug: 'relojes', nombre: 'Relojes', orden: 1, descripcion: 'Relojes de pulsera con acabados de lujo.' },
  { slug: 'anillos', nombre: 'Anillos', orden: 2, descripcion: 'Anillos en oro, plata y acero.' },
  { slug: 'collares', nombre: 'Collares', orden: 3, descripcion: 'Collares y cadenas con dijes.' },
  { slug: 'pulseras', nombre: 'Pulseras', orden: 4, descripcion: 'Pulseras de eslabones, perlas y trenzas.' },
  { slug: 'aretes', nombre: 'Aretes', orden: 5, descripcion: 'Aretes argolla, gota y perla.' },
];

// Materiales (UK nombre GLOBAL según el ER: cada material pertenece a UNA categoría,
// la que mejor lo representa. Los productos pueden combinar materiales de distintas
// categorías — el ER no lo restringe y producto_materiales.categoria_id guarda la
// categoría del producto). Ver docs/DECISIONES.md.
const MATERIALES = [
  { nombre: 'Acero inoxidable', categoria: 'relojes' },
  { nombre: 'Oro 18k', categoria: 'anillos' },
  { nombre: 'Perlas', categoria: 'collares' },
  { nombre: 'Plata 925', categoria: 'pulseras' },
  { nombre: 'Oro blanco', categoria: 'aretes' },
];

const PREFIJO_SKU = { relojes: 'REL', anillos: 'ANI', collares: 'COL', pulseras: 'PUL', aretes: 'ARE' };
const ABREV_MATERIAL = {
  'Oro 18k': 'ORO', 'Oro blanco': 'ORB', 'Plata 925': 'PLA',
  'Acero inoxidable': 'ACI', Perlas: 'PER',
};
const NOMBRES_MATERIAL = MATERIALES.map((m) => m.nombre);
const idDeMaterial = (i) => NOMBRES_MATERIAL[i % NOMBRES_MATERIAL.length];

// Medidas coherentes con la categoría (tipo_medida del ER)
function medidasDe(categoria) {
  switch (categoria) {
    case 'anillos': return [{ tipo: 'talla', medida: '7' }, { tipo: 'talla', medida: '8' }];
    case 'collares': return [{ tipo: 'largo', medida: '45cm' }, { tipo: 'largo', medida: '50cm' }];
    case 'pulseras': return [{ tipo: 'largo', medida: '17cm' }, { tipo: 'largo', medida: '19cm' }];
    default: return [{ tipo: 'unica', medida: 'Única' }]; // relojes y aretes
  }
}

// ---------- Bloques de siembra ----------
async function sembrarRoles() {
  await prisma.rol.upsert({
    where: { nombre: 'admin' },
    update: { descripcion: 'Administrador: gestión completa del sistema.' },
    create: { nombre: 'admin', descripcion: 'Administrador: gestión completa del sistema.' },
  });
  await prisma.rol.upsert({
    where: { nombre: 'user' },
    update: { descripcion: 'Cliente: compra y consulta sus pedidos.' },
    create: { nombre: 'user', descripcion: 'Cliente: compra y consulta sus pedidos.' },
  });
  const admin = await prisma.rol.findUniqueOrThrow({ where: { nombre: 'admin' } });
  const user = await prisma.rol.findUniqueOrThrow({ where: { nombre: 'user' } });
  return { admin, user };
}

async function sembrarUsuario({ nombre, email, password, rolId, telefono, cedula }) {
  if (!email || !password) throw new Error('Faltan credenciales de seed (revisa server/.env)');
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));
  return prisma.usuario.upsert({
    where: { email },
    update: { nombre, rolId, passwordHash, telefono, cedula }, // actualiza hash si cambia la contraseña
    create: { nombre, email, rolId, passwordHash, telefono, cedula },
  });
}

async function sembrarCatalogo() {
  // 1) Categorías
  const idCategoria = new Map();
  for (const c of CATEGORIAS) {
    const cat = await prisma.categoria.upsert({
      where: { slug: c.slug },
      update: { nombre: c.nombre, orden: c.orden, descripcion: c.descripcion, activa: true },
      create: c,
    });
    idCategoria.set(c.slug, cat.id);
  }

  // 2) Materiales (uno por categoría representativa; UK nombre global)
  const idMaterial = new Map(); // nombre → id
  for (const m of MATERIALES) {
    const mat = await prisma.material.upsert({
      where: { nombre: m.nombre },
      update: { categoriaId: idCategoria.get(m.categoria), activo: true },
      create: { nombre: m.nombre, categoriaId: idCategoria.get(m.categoria) },
    });
    idMaterial.set(m.nombre, mat.id);
  }

  // 3) Productos del Reto 1 (fuente: prisma/productos.json)
  const productosJson = JSON.parse(readFileSync(join(aqui, 'productos.json'), 'utf8'));
  let variantesCreadas = 0;
  for (const p of productosJson) {
    const producto = await prisma.producto.upsert({
      where: { slug: slug(p.nombre) },
      update: {
        nombre: p.nombre,
        categoriaId: idCategoria.get(p.categoria),
        descripcion: p.descripcion ?? null,
        precioBase: p.precio,
        activo: true,
        destacado: p.id % 5 === 1, // destacados deterministas (1 de cada 5)
      },
      create: {
        nombre: p.nombre,
        slug: slug(p.nombre),
        categoriaId: idCategoria.get(p.categoria),
        descripcion: p.descripcion ?? null,
        precioBase: p.precio,
        destacado: p.id % 5 === 1,
      },
    });

    // 4) Materiales del producto (2 por producto, deterministas, de distintas categorías)
    const elegidos = [idDeMaterial(p.id), idDeMaterial(p.id + 2)];
    for (const nombreMat of elegidos) {
      const materialId = idMaterial.get(nombreMat);
      await prisma.productoMaterial.upsert({
        where: { productoId_materialId: { productoId: producto.id, materialId } },
        update: { categoriaId: idCategoria.get(p.categoria), activo: true },
        create: { productoId: producto.id, materialId, categoriaId: idCategoria.get(p.categoria) },
      });
    }

    // 5) Variantes (≥1 por producto; SKU único, stock 5–30, medidas coherentes)
    const medidas = medidasDe(p.categoria);
    for (let i = 0; i < medidas.length; i++) {
      const nombreMat = elegidos[i % elegidos.length];
      const materialId = idMaterial.get(nombreMat);
      const frag = fragmento(p.nombre); // p. ej. "REL-IMP"
      const prefijo = frag.startsWith(PREFIJO_SKU[p.categoria]) ? '' : `${PREFIJO_SKU[p.categoria]}-`;
      const sufijoMedida = medidas[i].tipo === 'unica'
        ? ''
        : `-${medidas[i].medida.replace(/[^A-Za-z0-9]/g, '')}`;
      const sku = `${prefijo}${frag}-${ABREV_MATERIAL[nombreMat]}${sufijoMedida}`.toUpperCase();
      await prisma.variante.upsert({
        where: { sku },
        update: {
          productoId: producto.id, materialId,
          tipoMedida: medidas[i].tipo, medida: medidas[i].medida,
          precio: p.precio + i * 10, // rango de precios dentro del producto
          stock: stockPara(p.id, i), stockMinimo: 3,
          pesoGramos: 10 + ((p.id * 3 + i) % 40),
          activo: true,
        },
        create: {
          productoId: producto.id, materialId, sku,
          tipoMedida: medidas[i].tipo, medida: medidas[i].medida,
          precio: p.precio + i * 10,
          stock: stockPara(p.id, i), stockMinimo: 3,
          pesoGramos: 10 + ((p.id * 3 + i) % 40),
        },
      });
      variantesCreadas++;
    }

    // 6) Imagen principal (rutas existentes de assets/img/...)
    const principal = await prisma.productoImagen.findFirst({
      where: { productoId: producto.id, esPrincipal: true },
    });
    if (!principal) {
      await prisma.productoImagen.create({
        data: {
          productoId: producto.id,
          materialId: idMaterial.get(elegidos[0]),
          url: p.imagen ?? 'assets/img/fondo/hero.jpg',
          altText: p.alt ?? p.nombre,
          orden: 0,
          esPrincipal: true,
        },
      });
    }
  }
  return { productos: productosJson.length, variantes: variantesCreadas };
}

async function sembrarPuntoEmision() {
  return prisma.puntoEmision.upsert({
    where: { establecimiento_punto: { establecimiento: '001', punto: '001' } },
    update: { activo: true },
    create: { establecimiento: '001', punto: '001', ultimoSecuencial: 0, activo: true },
  });
}

async function sembrarDireccionCliente(usuarioId) {
  const existente = await prisma.direccion.findFirst({ where: { usuarioId, alias: 'Casa' } });
  if (existente) return existente;
  return prisma.direccion.create({
    data: {
      usuarioId,
      alias: 'Casa',
      destinatario: 'Cliente Prueba',
      telefono: '0991234567',
      provincia: 'Pichincha',
      ciudad: 'Quito',
      callePrincipal: 'Av. Amazonas',
      calleSecundaria: 'N39-135',
      numeracion: 'N39-135 y Av. Amazonas',
      referencia: 'Edificio Carresol, piso 3',
      codigoPostal: '170135',
      esPredeterminada: true,
      activa: true,
    },
  });
}

async function sembrarParametros() {
  const parametros = [
    { clave: 'iva_porcentaje', valor: '15', descripcion: 'IVA aplicado a pedidos y compras (%).' },
    { clave: 'moneda', valor: 'USD', descripcion: 'Moneda base del sistema.' },
    { clave: 'costo_envio_default', valor: '10', descripcion: 'Costo de envío estándar (USD).' },
    { clave: 'pasarela', valor: 'simulada', descripcion: 'Pasarela de pagos (sin procesador real).' },
    { clave: 'establecimiento_default', valor: '001', descripcion: 'Establecimiento de facturación por defecto.' },
    { clave: 'punto_emision_default', valor: '001', descripcion: 'Punto de emisión de facturación por defecto.' },
  ];
  for (const p of parametros) {
    await prisma.parametroSistema.upsert({
      where: { clave: p.clave },
      update: { valor: p.valor, descripcion: p.descripcion },
      create: p,
    });
  }
  return parametros.length;
}

// ---------- Ejecución ----------
// El seed NUNCA usa contraseñas por defecto: si faltan o son cortas, aborta
// antes de escribir nada. Los nombres de las variables son seguros de imprimir;
// sus VALUES jamás aparecen en consola, logs ni reportes.
function validarSecretosSeed() {
  const requeridas = ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD', 'SEED_USER_EMAIL', 'SEED_USER_PASSWORD'];
  const faltan = requeridas.filter((clave) => !process.env[clave] || !String(process.env[clave]).trim());
  if (faltan.length) {
    throw new Error(`Faltan variables de seed en server/.env: ${faltan.join(', ')}. El seed no tiene contraseñas por defecto.`);
  }
  const cortas = ['SEED_ADMIN_PASSWORD', 'SEED_USER_PASSWORD']
    .filter((clave) => String(process.env[clave]).length < 10);
  if (cortas.length) {
    throw new Error(`Las contraseñas de seed deben tener al menos 10 caracteres: ${cortas.join(', ')}.`);
  }
}

async function main() {
  validarSecretosSeed();
  const roles = await sembrarRoles();
  console.log(`✓ Roles sembrados (admin id ${roles.admin.id}, user id ${roles.user.id})`);

  const admin = await sembrarUsuario({
    nombre: process.env.SEED_ADMIN_NOMBRE || 'Admin Carresol',
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
    rolId: roles.admin.id,
    telefono: '0999999999',
    cedula: '1701345678',
  });
  console.log(`✓ Usuario admin: ${admin.email} (id ${admin.id})`);

  const cliente = await sembrarUsuario({
    nombre: process.env.SEED_USER_NOMBRE || 'Cliente Prueba',
    email: process.env.SEED_USER_EMAIL,
    password: process.env.SEED_USER_PASSWORD,
    rolId: roles.user.id,
    telefono: '0991234567',
    cedula: '1701345678',
  });
  console.log(`✓ Usuario de prueba: ${cliente.email} (id ${cliente.id})`);

  const catalogo = await sembrarCatalogo();
  console.log(`✓ Catálogo: ${catalogo.productos} productos y ${catalogo.variantes} variantes`);

  await sembrarPuntoEmision();
  console.log('✓ Punto de emisión 001-001 listo');

  const direccion = await sembrarDireccionCliente(cliente.id);
  console.log(`✓ Dirección de ejemplo del cliente (id ${direccion.id})`);

  const nParametros = await sembrarParametros();
  console.log(`✓ Parámetros del sistema: ${nParametros}`);

  const [nProductos, nVariantes, nUsuarios, nCategorias, nMateriales] = await prisma.$transaction([
    prisma.producto.count(),
    prisma.variante.count(),
    prisma.usuario.count(),
    prisma.categoria.count(),
    prisma.material.count(),
  ]);
  console.log(`Resumen → productos: ${nProductos}, variantes: ${nVariantes}, usuarios: ${nUsuarios}, categorías: ${nCategorias}, materiales: ${nMateriales}`);
}

main()
  .catch((e) => {
    console.error('Error en el seed:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
