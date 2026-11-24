// loginView.js — vista de login y registro (accesible, con aria-invalid y aria-describedby)
import { mensajeEn } from './uiComponents.js';

export function cambiarTab(vista, tab) {
  const esLogin = tab === 'login';
  const tabLogin = vista.querySelector('#tab-login');
  const tabRegistro = vista.querySelector('#tab-registro');
  tabLogin.classList.toggle('activo', esLogin);
  tabRegistro.classList.toggle('activo', !esLogin);
  tabLogin.setAttribute('aria-selected', String(esLogin));
  tabRegistro.setAttribute('aria-selected', String(!esLogin));
  vista.querySelector('#form-login').hidden = !esLogin;
  vista.querySelector('#form-registro').hidden = esLogin;
  mensajeEn(vista.querySelector('#login-aviso'), '');
  mensajeEn(vista.querySelector('#registro-error'), '');
  const exito = vista.querySelector('#registro-exito');
  if (exito) { exito.textContent = ''; exito.hidden = true; }
  (esLogin ? vista.querySelector('#login-email') : vista.querySelector('#reg-nombre')).focus();
}

// Reglas de contraseña fuerte (las mismas que exige el backend)
export const REGLAS_PASSWORD = [
  { test: (v) => v.length >= 8, texto: 'Al menos 8 caracteres' },
  { test: (v) => /[A-Z]/.test(v), texto: 'Una mayúscula' },
  { test: (v) => /[a-z]/.test(v), texto: 'Una minúscula' },
  { test: (v) => /\d/.test(v), texto: 'Un número' },
];

export function validarPassword(v) {
  return REGLAS_PASSWORD.every((r) => r.test(v));
}

export function validarEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v.trim());
}

// Marca (o desmarca) aria-invalid y muestra el texto del error asociado
export function marcarCampo(input, spanError, valido, mensaje) {
  if (valido) {
    input.removeAttribute('aria-invalid');
    spanError.textContent = '';
  } else {
    input.setAttribute('aria-invalid', 'true');
    spanError.textContent = mensaje;
  }
  return valido;
}

// Mapea los detalles de validación del backend (422) a los spans de error
export function mostrarErroresBackend(vista, detalleError) {
  mensajeEn(vista.querySelector('#login-aviso'), 'Revisa los campos marcados.', 'error');
  const campos = new Map();
  for (const d of detalleError?.detalles || []) {
    campos.set(d.campo, d.mensaje);
  }
  const mapa = {
    nombre: ['#reg-nombre', '#error-reg-nombre'],
    email: ['#login-email', '#error-login-email', '#reg-email', '#error-reg-email'],
    password: ['#login-password', '#error-login-password', '#reg-password', '#error-reg-password'],
    cedula: ['#reg-cedula', '#error-reg-cedula'],
    telefono: ['#reg-telefono', '#error-reg-telefono'],
  };
  for (const [campo, mensaje] of campos) {
    const selectores = mapa[campo] || [];
    for (let i = 0; i + 1 < selectores.length; i += 2) {
      const input = vista.querySelector(selectores[i]);
      const span = vista.querySelector(selectores[i + 1]);
      if (input && span && !input.hidden && input.offsetParent !== null) {
        marcarCampo(input, span, false, mensaje);
        break;
      }
    }
  }
}

// Errores de registro SIEMPRE dentro del formulario (409, 422 o red).
export function mostrarErrorRegistro(vista, err) {
  const bloque = vista.querySelector('#registro-error');
  if (err.status === 409 || err.codigo === 'CONFLICTO') {
    marcarCampo(vista.querySelector('#reg-email'), vista.querySelector('#error-reg-email'), false, err.message);
    mensajeEn(bloque, err.message, 'error');
    vista.querySelector('#reg-email').focus();
    return;
  }
  if (err.detalles?.length) {
    mostrarErroresBackend(vista, err);
    mensajeEn(bloque, 'Revisa los campos marcados en rojo.', 'error');
    return;
  }
  mensajeEn(bloque, err.message || 'No se pudo crear la cuenta. Intenta de nuevo.', 'error');
}

export function limpiarErrores(vista, prefijo) {
  vista.querySelectorAll(`[id^="error-${prefijo}"]`).forEach((el) => { el.textContent = ''; });
  vista.querySelectorAll('.campo input[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
}
