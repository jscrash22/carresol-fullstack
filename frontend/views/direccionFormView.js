// direccionFormView.js — formulario de dirección reutilizable (checkout y mi cuenta)
// Reglas idénticas a las del backend: teléfono 0XXXXXXXXX, textos por longitud,
// campos opcionales explícitos. Accesible: label + aria-invalid + aria-describedby.
import { marcarCampo } from './loginView.js';

const CAMPOS = [
  { id: 'alias', etiqueta: 'Alias *', tipo: 'text', requerido: true,
    validar: (v) => v.trim().length >= 2 && v.trim().length <= 40,
    mensaje: 'El alias admite entre 2 y 40 caracteres.', placeholder: 'Ej: Casa, Oficina' },
  { id: 'destinatario', etiqueta: 'Destinatario *', tipo: 'text', requerido: true,
    validar: (v) => v.trim().length >= 3 && v.trim().length <= 80,
    mensaje: 'El destinatario admite entre 3 y 80 caracteres.' },
  { id: 'telefono', etiqueta: 'Teléfono *', tipo: 'tel', requerido: true,
    validar: (v) => /^0\d{8,9}$/.test(v.trim()),
    mensaje: 'El teléfono debe tener el formato 0XXXXXXXXX.', placeholder: '0991234567' },
  { id: 'provincia', etiqueta: 'Provincia *', tipo: 'text', requerido: true,
    validar: (v) => v.trim().length >= 3 && v.trim().length <= 40,
    mensaje: 'La provincia admite entre 3 y 40 caracteres.', placeholder: 'Ej: Pichincha' },
  { id: 'ciudad', etiqueta: 'Ciudad *', tipo: 'text', requerido: true,
    validar: (v) => v.trim().length >= 3 && v.trim().length <= 60,
    mensaje: 'La ciudad admite entre 3 y 60 caracteres.', placeholder: 'Ej: Quito' },
  { id: 'callePrincipal', etiqueta: 'Calle principal *', tipo: 'text', requerido: true,
    validar: (v) => v.trim().length >= 3 && v.trim().length <= 120,
    mensaje: 'La calle principal admite entre 3 y 120 caracteres.' },
  { id: 'numeracion', etiqueta: 'Numeración *', tipo: 'text', requerido: true,
    validar: (v) => v.trim().length >= 1 && v.trim().length <= 40,
    mensaje: 'La numeración admite hasta 40 caracteres.', placeholder: 'Ej: N12-34' },
  { id: 'calleSecundaria', etiqueta: 'Calle secundaria', tipo: 'text', requerido: false,
    validar: (v) => !v.trim() || v.trim().length <= 120,
    mensaje: 'La calle secundaria admite 120 caracteres.' },
  { id: 'referencia', etiqueta: 'Referencia', tipo: 'text', requerido: false,
    validar: (v) => !v.trim() || v.trim().length <= 200,
    mensaje: 'La referencia admite 200 caracteres.' },
  { id: 'codigoPostal', etiqueta: 'Código postal', tipo: 'text', requerido: false,
    validar: (v) => !v.trim() || v.trim().length <= 12,
    mensaje: 'El código postal admite 12 caracteres.' },
];

// Construye el formulario dentro de un contenedor. Devuelve:
// { contenedor, validar() → boolean, valores() → datos|null, setValores(d), reset() }
export function construirFormularioDireccion(prefijo) {
  const contenedor = document.createElement('div');
  contenedor.className = 'grid-direccion';
  const inputs = {};

  for (const campo of CAMPOS) {
    const envoltura = document.createElement('div');
    envoltura.className = 'campo';
    const label = document.createElement('label');
    label.htmlFor = `${prefijo}-${campo.id}`;
    label.textContent = campo.etiqueta;
    const input = document.createElement('input');
    input.type = campo.tipo;
    input.id = `${prefijo}-${campo.id}`;
    input.name = campo.id;
    if (campo.placeholder) input.placeholder = campo.placeholder;
    input.setAttribute('aria-describedby', `error-${prefijo}-${campo.id}`);
    if (campo.requerido) input.required = true;
    const span = document.createElement('span');
    span.id = `error-${prefijo}-${campo.id}`;
    span.className = 'error';
    span.setAttribute('role', 'alert');
    span.setAttribute('aria-live', 'polite');
    input.addEventListener('blur', () => marcarCampo(input, span, campo.validar(input.value), campo.mensaje));
    envoltura.append(label, input, span);
    contenedor.appendChild(envoltura);
    inputs[campo.id] = { input, span };
  }

  // ¿Dirección predeterminada?
  const envolturaCheck = document.createElement('div');
  envolturaCheck.className = 'campo campo-check';
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.id = `${prefijo}-esPredeterminada`;
  const lblCheck = document.createElement('label');
  lblCheck.htmlFor = check.id;
  lblCheck.textContent = 'Usar como dirección predeterminada';
  envolturaCheck.append(check, lblCheck);
  contenedor.appendChild(envolturaCheck);

  return {
    contenedor,
    validar() {
      let valido = true;
      for (const campo of CAMPOS) {
        const { input, span } = inputs[campo.id];
        const ok = campo.validar(input.value);
        marcarCampo(input, span, ok, campo.mensaje);
        valido = ok && valido;
      }
      return valido;
    },
    valores() {
      const datos = {};
      for (const campo of CAMPOS) {
        const valor = inputs[campo.id].input.value.trim();
        datos[campo.id] = valor || null;
      }
      datos.esPredeterminada = check.checked;
      return datos;
    },
    setValores(d = {}) {
      for (const campo of CAMPOS) {
        inputs[campo.id].input.value = d[campo.id] ?? '';
        inputs[campo.id].span.textContent = '';
        inputs[campo.id].input.removeAttribute('aria-invalid');
      }
      check.checked = Boolean(d.esPredeterminada);
    },
    reset() {
      this.setValores({});
    },
  };
}
