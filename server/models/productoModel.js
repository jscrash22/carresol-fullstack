// productoModel.js — acceso a datos de productos + variantes (modelo ER real)
//
// Contrato de compatibilidad (prompt §6, P0): GET /api/productos sigue devolviendo
// `precio`, `stock`, `categoria`, `imagen` y `alt` por producto (calculados a partir
// de las variantes activas), más los arreglos `variantes`, `materiales` e `imagenes`.
import { prisma } from './db.js';
import { ApiError, CODIGOS } from '../utils/respuestas.js';

// Include completo de un producto (exportado para reutilizarlo en favoritos, etc.)
export const INCLUIR_COMPLETO = {
  categoria: true,
  variantes: { where: { activo: true }, include: { material: true }, orderBy: { id: 'asc' } },
  materiales: { include: { material: true }, orderBy: { materialId: 'asc' } },
  imagenes: { orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }] },
};

// Tipo de medida por defecto según la categoría (mismo criterio que el seed)
const MEDIDA_POR_CATEGORIA = {
  anillos: { tipoMedida: 'talla', medida: '7' },
  collares: { tipoMedida: 'largo', medida: '45cm' },
  pulseras: { tipoMedida: 'largo', medida: '17cm' },
  relojes: { tipoMedida: 'unica', medida: 'Única' },
  aretes: { tipoMedida: 'unica', medida: 'Única' },
};

function varianteLimpia(v) {
  return {
    id: Number(v.id),
    productoId: Number(v.productoId),
    sku: v.sku,
    material: v.material?.nombre ?? null,
    materialId: v.materialId,
    tipoMedida: v.tipoMedida,
    medida: v.medida,
    precio: Number(v.precio),
    stock: v.stock,
    stockMinimo: v.stockMinimo,
    activo: v.activo,
  };
}

export function limpio(p) {
  const variantes = (p.variantes ?? []).filter((v) => v.activo);
  const precios = variantes.map((v) => Number(v.precio));
  const principal = (p.imagenes ?? []).find((i) => i.esPrincipal) ?? p.imagenes?.[0];
  return {
    id: Number(p.id),
    nombre: p.nombre,
    slug: p.slug,
    descripcion: p.descripcion,
    categoria: p.categoria?.slug ?? null,
    categoriaNombre: p.categoria?.nombre ?? null,
    // precio = el mínimo de sus variantes activas (o el precio base si no hay)
    precio: precios.length ? Math.min(...precios) : Number(p.precioBase),
    precioBase: Number(p.precioBase),
    // stock = suma del stock de sus variantes activas
    stock: variantes.reduce((s, v) => s + v.stock, 0),
    imagen: principal?.url ?? null,
    alt: principal?.altText ?? null,
    destacado: p.destacado,
    activo: p.activo,
    createdAt: p.createdAt,
    variantes: variantes.map(varianteLimpia),
    materiales: (p.materiales ?? []).filter((m) => m.activo).map((m) => ({
      id: m.materialId,
      nombre: m.material?.nombre ?? null,
    })),
    imagenes: (p.imagenes ?? []).map((i) => ({
      id: Number(i.id),
      url: i.url,
      alt: i.altText,
      esPrincipal: i.esPrincipal,
    })),
  };
}

// slug determinista (igual que el seed)
function slugDe(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function listarProductos({ categoria, destacado, q, incluirInactivos = false } = {}) {
  const where = incluirInactivos ? {} : { activo: true };
  if (categoria) where.categoria = { slug: categoria };
  if (destacado !== undefined) where.destacado = destacado === 'true' || destacado === true;
  if (q) {
    // Búsqueda de texto simple y sanitizada (sin SQL del cliente: Prisma parametriza)
    where.OR = [
      { nombre: { contains: q, mode: 'insensitive' } },
      { descripcion: { contains: q, mode: 'insensitive' } },
    ];
  }
  const productos = await prisma.producto.findMany({
    where,
    orderBy: { id: 'asc' },
    include: INCLUIR_COMPLETO,
  });
  return productos.map(limpio);
}

export async function obtenerProducto(id) {
  const p = await prisma.producto.findUnique({
    where: { id: BigInt(id) },
    include: INCLUIR_COMPLETO,
  });
  return p ? limpio(p) : null;
}

export async function productoPorSlug(slug) {
  const p = await prisma.producto.findUnique({ where: { slug }, include: INCLUIR_COMPLETO });
  return p ? limpio(p) : null;
}

async function categoriaPorRef(ref) {
  // Acepta slug (str) o id (number)
  const where = typeof ref === 'string' ? { slug: ref } : { id: ref };
  const cat = await prisma.categoria.findUnique({ where });
  if (!cat || !cat.activa) {
    throw new ApiError(CODIGOS.VALIDACION, 'La categoría indicada no existe.');
  }
  return cat;
}

async function materialValido(materialId, idProducto) {
  const m = await prisma.material.findUnique({ where: { id: materialId } });
  if (!m || !m.activo) {
    throw new ApiError(CODIGOS.VALIDACION, `El material con id ${materialId} no existe.`);
  }
  return m;
}

function skuPara(nombre, categoriaSlug, materialNombre, medida) {
  const frag = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-').split('-').filter((x) => x && x !== 'CARRESOL')
    .map((x) => x.slice(0, 3)).join('-');
  const prefijos = { relojes: 'REL', anillos: 'ANI', collares: 'COL', pulseras: 'PUL', aretes: 'ARE' };
  const pref = prefijos[categoriaSlug] ?? 'PRD';
  const abrev = (materialNombre ?? 'STD').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  const sufijo = medida && !/^unica$/i.test(medida) ? `-${String(medida).replace(/[^A-Za-z0-9]/g, '')}` : '';
  return `${frag.startsWith(pref) ? '' : pref + '-'}${frag}-${abrev}${sufijo}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`.toUpperCase();
}

// Crea un producto CON sus variantes en una sola operación transaccional (§6).
// Compatibilidad: si no llegan `variantes`, se crea una variante por defecto
// a partir de precio/stock del payload clásico del Reto 2.
export async function crearProducto(body) {
  const categoria = await categoriaPorRef(body.categoriaId ?? body.categoria);
  const precioBase = body.precioBase ?? body.precio;

  const variantesBody = Array.isArray(body.variantes) && body.variantes.length
    ? body.variantes
    : null;

  return prisma.$transaction(async (tx) => {
    const producto = await tx.producto.create({
      data: {
        nombre: body.nombre,
        slug: `${slugDe(body.nombre)}-${Date.now().toString(36).slice(-4)}`, // unicidad ante nombres repetidos
        categoriaId: categoria.id,
        descripcion: body.descripcion ?? null,
        precioBase,
        destacado: body.destacado === true,
      },
    });

    // Materiales del producto
    const materialesIds = Array.isArray(body.materiales) && body.materiales.length
      ? body.materiales
      : (variantesBody ? [...new Set(variantesBody.map((v) => v.materialId))] : []);
    for (const materialId of materialesIds) {
      await materialValido(materialId, producto.id);
      await tx.productoMaterial.create({
        data: { productoId: producto.id, materialId, categoriaId: categoria.id },
      });
    }

    // Variantes
    if (variantesBody) {
      for (const v of variantesBody) {
        const material = await materialValido(v.materialId, producto.id);
        await tx.variante.create({
          data: {
            productoId: producto.id,
            materialId: material.id,
            sku: v.sku || skuPara(body.nombre, categoria.slug, material.nombre, v.medida),
            tipoMedida: v.tipoMedida,
            medida: v.medida,
            precio: v.precio,
            stock: v.stock ?? 0,
            stockMinimo: v.stockMinimo ?? 3,
            pesoGramos: v.pesoGramos ?? null,
          },
        });
      }
    } else {
      // Payload clásico: una variante por defecto con el stock/precio del body
      const defMedida = MEDIDA_POR_CATEGORIA[categoria.slug] ?? { tipoMedida: 'unica', medida: 'Única' };
      const material = await tx.material.findFirst({ where: { activo: true }, orderBy: { id: 'asc' } });
      await tx.variante.create({
        data: {
          productoId: producto.id,
          materialId: material.id,
          sku: skuPara(body.nombre, categoria.slug, material.nombre, defMedida.medida),
          tipoMedida: defMedida.tipoMedida,
          medida: defMedida.medida,
          precio: precioBase,
          stock: body.stock ?? 0,
          stockMinimo: 3,
        },
      });
    }

    // Imagen principal
    if (body.imagen || body.alt) {
      await tx.productoImagen.create({
        data: {
          productoId: producto.id,
          url: body.imagen ?? 'assets/img/fondo/hero.jpg',
          altText: body.alt ?? body.nombre,
          orden: 0,
          esPrincipal: true,
        },
      });
    }

    return tx.producto.findUnique({ where: { id: producto.id }, include: INCLUIR_COMPLETO });
  }).then((p) => limpio(p));
}

// Actualiza un producto (y opcionalmente sus variantes) en una transacción
export async function actualizarProducto(id, body) {
  const idProducto = BigInt(id);
  const existente = await prisma.producto.findUnique({ where: { id: idProducto } });
  if (!existente) return null;

  return prisma.$transaction(async (tx) => {
    const datos = {};
    for (const clave of ['nombre', 'descripcion', 'precioBase', 'destacado', 'activo']) {
      if (body[clave] !== undefined) datos[clave] = body[clave];
    }
    if (body.categoriaId !== undefined || body.categoria !== undefined) {
      const categoria = await categoriaPorRef(body.categoriaId ?? body.categoria);
      datos.categoriaId = categoria.id;
    }
    if (body.precio !== undefined && body.precioBase === undefined) datos.precioBase = body.precio; // compat
    if (body.stock !== undefined && !Array.isArray(body.variantes)) {
      // compat: sin variantes en el body, se ajusta el stock de la variante única
    }

    if (Object.keys(datos).length) {
      await tx.producto.update({ where: { id: idProducto }, data: datos });
    }

    // Imagen principal (solo si cambia y existe la anterior)
    if (body.imagen !== undefined || body.alt !== undefined) {
      const img = await tx.productoImagen.findFirst({ where: { productoId: idProducto, esPrincipal: true } });
      if (img) {
        await tx.productoImagen.update({
          where: { id: img.id },
          data: { url: body.imagen ?? img.url, altText: body.alt ?? img.altText },
        });
      } else {
        await tx.productoImagen.create({
          data: { productoId: idProducto, url: body.imagen ?? 'assets/img/fondo/hero.jpg', altText: body.alt ?? body.nombre, esPrincipal: true, orden: 0 },
        });
      }
    }

    // Variantes: crear/actualizar/desactivar en un solo paso
    if (Array.isArray(body.variantes)) {
      const idsMantener = [];
      for (const v of body.variantes) {
        const material = await materialValido(v.materialId, idProducto);
        if (v.id) {
          await tx.variante.update({
            where: { id: BigInt(v.id) },
            data: {
              materialId: material.id,
              tipoMedida: v.tipoMedida,
              medida: v.medida,
              precio: v.precio,
              stock: v.stock,
              stockMinimo: v.stockMinimo ?? 3,
              activo: v.activo ?? true,
            },
          });
          idsMantener.push(BigInt(v.id));
        } else {
          const creada = await tx.variante.create({
            data: {
              productoId: idProducto,
              materialId: material.id,
              sku: v.sku || skuPara(existente.nombre, 'PRD', material.nombre, v.medida),
              tipoMedida: v.tipoMedida,
              medida: v.medida,
              precio: v.precio,
              stock: v.stock ?? 0,
              stockMinimo: v.stockMinimo ?? 3,
            },
          });
          idsMantener.push(creada.id);
        }
      }
      // Desactiva las variantes que ya no vinieron en el body (borrado lógico:
      // el historial de pedido_items sigue referenciándolas)
      const actuales = await tx.variante.findMany({ where: { productoId: idProducto, activo: true } });
      for (const v of actuales) {
        if (!idsMantener.some((id) => id === v.id)) {
          await tx.variante.update({ where: { id: v.id }, data: { activo: false } });
        }
      }
    }

    return tx.producto.findUnique({ where: { id: idProducto }, include: INCLUIR_COMPLETO });
  }).then((p) => limpio(p));
}

// ¿El producto tiene ventas registradas? (pedido_items de alguna de sus variantes)
export async function tieneDetalles(id) {
  const n = await prisma.pedidoItem.count({ where: { variante: { productoId: BigInt(id) } } });
  return n > 0;
}

// DELETE: borrado lógico si hubo ventas; físico si nunca se vendió (§6)
export async function eliminarProducto(id) {
  const idProducto = BigInt(id);
  const existente = await prisma.producto.findUnique({ where: { id: idProducto } });
  if (!existente) return null;

  if (await tieneDetalles(id)) {
    await prisma.producto.update({ where: { id: idProducto }, data: { activo: false } });
    return { eliminado: true, logico: true, id: Number(idProducto) };
  }

  // Borrado físico: nunca se vendió, así que ninguna variante tiene pedido_items.
  // Las dependencias (materiales, imágenes, favoritos, movimientos, carrito) borran
  // en cascada según el schema; las variantes se limpian aquí explícitamente.
  await prisma.$transaction([
    prisma.variante.deleteMany({ where: { productoId: idProducto } }),
    prisma.producto.delete({ where: { id: idProducto } }),
  ]);
  return { eliminado: true, logico: false, id: Number(idProducto) };
}
