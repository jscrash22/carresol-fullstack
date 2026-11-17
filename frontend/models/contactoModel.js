// contactoModel.js — formulario de contacto público (habla con la API)
import { api } from './apiClient.js';

// Si hay sesión, el backend asocia el mensaje a la cuenta desde el token.
export function enviar(datos) {
  return api.post('/contacto', datos);
}
