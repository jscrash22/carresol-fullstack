// authModel.js — modelo de autenticación (habla con la API, guarda sesión)
import { api, guardarSesion, borrarSesion, leerSesion } from './apiClient.js';

export async function iniciarSesion(email, password) {
  const data = await api.post('/auth/login', { email, password });
  guardarSesion(data.token, data.usuario);
  return data.usuario;
}

export async function registrar(nombre, email, password) {
  // El backend ignora cualquier "role" enviado: siempre crea usuarios normales
  const data = await api.post('/auth/register', { nombre, email, password });
  if (data.token) guardarSesion(data.token, data.usuario);
  return data.usuario;
}

export async function usuarioActual() {
  // Revalida el token contra /auth/me (401 → la sesión se limpia en apiClient)
  return api.get('/auth/me');
}

export function sesionGuardada() {
  return leerSesion();
}

export function cerrarSesionLocal() {
  borrarSesion();
}
