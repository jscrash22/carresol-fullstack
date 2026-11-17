// catalogoModel.js — categorías y materiales del catálogo (CRUD admin)
import { prisma } from './db.js';
import { ApiError, CODIGOS } from '../utils/respuestas.js';

export function categoriaLimpia(c) {
  return {
    id: c.id,
    nombre: c.nombre,
    slug: c.slug,
    descripcion: c.descripcion,
    orden: c.orden,
    activa: c.activa,
    totalProductos: c._count?.productos ?? 0,
  };
}

export function materialLimpio(m) {
  return {
    id: m.id,
    nombre: m.nombre,
    categoriaId: m.categoriaId,
    categoria: m.categoria?.slug ?? null,
    activo: m.activo,
  };
}

export async function listarCategorias(incluirInactivas = false) {
  const categorias = await prisma.categoria.findMany({
    where: incluirInactivas ? undefined : { activa: true },
    orderBy: { orden: 'asc' },
    include: { _count: { select: { productos: true } } },
  });
  return categorias.map(categoriaLimpia);
}

function slugDe(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function crearCategoria(body) {
  try {
    return categoriaLimpia(await prisma.categoria.create({
      data: {
        nombre: body.nombre,
        slug: body.slug ?? slugDe(body.nombre),
        descripcion: body.descripcion ?? null,
        orden: body.orden ?? 99,
      },
      include: { _count: { select: { productos: true } } },
    }));
  } catch (e) {
    if (e.code === 'P2002') {
      throw new ApiError(CODIGOS.CONFLICTO, 'Ya existe una categoría con ese nombre o slug.');
    }
    throw e;
  }
}

export async function actualizarCategoria(id, body) {
  const existente = await prisma.categoria.findUnique({ where: { id: Number(id) } });
  if (!existente) return null;
  try {
    const datos = {};
    for (const campo of ['nombre', 'slug', 'descripcion', 'orden', 'activa']) {
      if (body[campo] !== undefined) datos[campo] = body[campo];
    }
    return categoriaLimpia(await prisma.categoria.update({
      where: { id: existente.id },
      data: datos,
      include: { _count: { select: { productos: true } } },
    }));
  } catch (e) {
    if (e.code === 'P2002') {
      throw new ApiError(CODIGOS.CONFLICTO, 'Ya existe una categoría con ese nombre o slug.');
    }
    throw e;
  }
}

export async function listarMateriales(incluirInactivos = false) {
  const materiales = await prisma.material.findMany({
    where: incluirInactivos ? undefined : { activo: true },
    orderBy: { id: 'asc' },
    include: { categoria: true },
  });
  return materiales.map(materialLimpio);
}

export async function crearMaterial(body) {
  const categoria = await prisma.categoria.findUnique({ where: { id: Number(body.categoriaId) } });
  if (!categoria) throw new ApiError(CODIGOS.VALIDACION, 'La categoría indicada no existe.');
  try {
    return materialLimpio(await prisma.material.create({
      data: { nombre: body.nombre, categoriaId: categoria.id },
      include: { categoria: true },
    }));
  } catch (e) {
    if (e.code === 'P2002') {
      throw new ApiError(CODIGOS.CONFLICTO, 'Ya existe un material con ese nombre.');
    }
    throw e;
  }
}

export async function actualizarMaterial(id, body) {
  const existente = await prisma.material.findUnique({ where: { id: Number(id) } });
  if (!existente) return null;
  try {
    const datos = {};
    if (body.nombre !== undefined) datos.nombre = body.nombre;
    if (body.categoriaId !== undefined) datos.categoriaId = Number(body.categoriaId);
    if (body.activo !== undefined) datos.activo = body.activo;
    return materialLimpio(await prisma.material.update({
      where: { id: existente.id },
      data: datos,
      include: { categoria: true },
    }));
  } catch (e) {
    if (e.code === 'P2002') {
      throw new ApiError(CODIGOS.CONFLICTO, 'Ya existe un material con ese nombre.');
    }
    throw e;
  }
}
