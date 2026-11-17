// productoModel.js — modelo del catálogo (habla con la API)
import { api } from './apiClient.js';

export async function obtenerProductos(categoria) {
  const query = categoria && categoria !== 'todos' ? `?categoria=${encodeURIComponent(categoria)}` : '';
  return api.get(`/productos${query}`);
}

export async function obtenerProducto(id) {
  return api.get(`/productos/${id}`);
}

// Categorías fijas del catálogo (coinciden con las permitidas en el backend)
export const CATEGORIAS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'relojes', etiqueta: 'Relojes' },
  { id: 'collares', etiqueta: 'Collares' },
  { id: 'pulseras', etiqueta: 'Pulseras' },
  { id: 'anillos', etiqueta: 'Anillos' },
  { id: 'aretes', etiqueta: 'Aretes' },
];

export function formatearPrecio(precio) {
  const n = Number(precio);
  if (!Number.isFinite(n) || n <= 0) return '$0.00';
  return '$' + n.toFixed(2);
}

// Rango de precios de un producto a partir de sus variantes ("$480 – $520").
// Si todas las variantes comparten precio (o no hay variantes) devuelve uno solo.
export function rangoPrecios(producto) {
  const precios = (producto?.variantes ?? []).map((v) => Number(v.precio)).filter(Number.isFinite);
  if (!precios.length) return formatearPrecio(producto?.precio);
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  return min === max ? formatearPrecio(min) : `${formatearPrecio(min)} – ${formatearPrecio(max)}`;
}
