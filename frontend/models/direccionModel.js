// direccionModel.js — direcciones de envío del usuario autenticado (CRUD)
import { api } from './apiClient.js';

export function listar() {
  return api.get('/direcciones');
}

export function crear(datos) {
  return api.post('/direcciones', datos);
}

export function actualizar(id, datos) {
  return api.put(`/direcciones/${id}`, datos);
}

export function eliminar(id) {
  return api.delete(`/direcciones/${id}`);
}
