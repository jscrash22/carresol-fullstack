// almacenamiento.js — ÚNICO punto de acceso a localStorage/sessionStorage del frontend.
//
// Política (§4.1 del super prompt):
//   localStorage  → carrito y favoritos de INVITADO, dueño, versión y fecha,
//                    además de una copia PÚBLICA del catálogo (sin datos personales).
//   sessionStorage → token/usuario, estado de pantalla (filtros, pestaña, paso)
//                    y borradores/avisos de la sesión. NUNCA contraseñas ni tokens
//                    en localStorage.
//   URL (hash)    → vista actual.
//
// Todas las claves llevan el prefijo `carresol_`. Si el navegador bloquea el
// almacenamiento (modo privado, cuota llena), se usa un mapa en memoria para que
// la aplicación siga funcionando durante la sesión: nunca se lanza una excepción
// hacia la UI. JSON.parse se hace siempre con valor por defecto seguro.
const PREFIJO = 'carresol_';
const memoria = { local: new Map(), sesion: new Map() };

function almacen(tipo) {
  try {
    const objeto = tipo === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    if (!objeto) return null;
    const prueba = `${PREFIJO}__disponible`;
    objeto.setItem(prueba, '1');
    objeto.removeItem(prueba);
    return objeto;
  } catch {
    return null;
  }
}

const REAL = { local: almacen('local'), sesion: almacen('sesion') };

// Los valores se guardan SIEMPRE como JSON (incluso texto) para que leer sea
// inequívoco. Los datos legacy escritos como texto plano se aceptan al leer.
function leer(tipo, clave, defecto) {
  const completa = PREFIJO + clave;
  try {
    const bruto = REAL[tipo] ? REAL[tipo].getItem(completa) : memoria[tipo].get(completa);
    if (bruto === null || bruto === undefined) return defecto;
    try { return JSON.parse(bruto); } catch { return bruto; }
  } catch {
    return defecto;
  }
}

function escribir(tipo, clave, valor) {
  const completa = PREFIJO + clave;
  const bruto = JSON.stringify(valor);
  try {
    if (REAL[tipo]) REAL[tipo].setItem(completa, bruto);
    else memoria[tipo].set(completa, bruto);
  } catch {
    memoria[tipo].set(completa, bruto);
  }
}

function borrar(tipo, clave) {
  const completa = PREFIJO + clave;
  try {
    if (REAL[tipo]) REAL[tipo].removeItem(completa);
  } catch { /* nada */ }
  memoria[tipo].delete(completa);
}

function crearApi(tipo) {
  return {
    disponible: Boolean(REAL[tipo]),
    get: (clave, defecto = null) => leer(tipo, clave, defecto),
    json: (clave, defecto = null) => {
      const valor = leer(tipo, clave, defecto);
      return valor === undefined ? defecto : valor;
    },
    set: (clave, valor) => escribir(tipo, clave, valor),
    remove: (clave) => borrar(tipo, clave),
  };
}

export const local = crearApi('local');
export const sesion = crearApi('sesion');

// Claves canónicas (así no se repiten cadenas por el código).
export const CLAVES = Object.freeze({
  TOKEN: 'token',
  USUARIO: 'usuario',
  CARRITO: 'carrito',
  CARRITO_VERSION: 'carrito_v',
  CARRITO_DUENO: 'carrito_dueno',
  CARRITO_FECHA: 'carrito_fecha',
  FAVORITOS: 'favoritos',
  FAVORITOS_DUENO: 'favoritos_dueno',
  FILTRO_CATALOGO: 'filtro_catalogo',
  PAGINA_CATALOGO: 'pagina_catalogo',
  DESTINO_TRAS_LOGIN: 'destino_tras_login',
  PESTANA_ADMIN: 'pestana_admin',
  PASO_CHECKOUT: 'paso_checkout',
  BORRADOR_CHECKOUT: 'borrador_checkout',
  BORRADOR_CONTACTO: 'borrador_contacto',
  BORRADOR_LOGIN: 'borrador_login',
  AVISO_GLOBAL: 'aviso_global',
  CATALOGO_CACHE: 'catalogo_cache',
});

// Borradores = datos temporales de formularios. Nunca contraseñas.
export function limpiarBorradores() {
  [CLAVES.BORRADOR_CHECKOUT, CLAVES.BORRADOR_CONTACTO, CLAVES.BORRADOR_LOGIN,
    CLAVES.PASO_CHECKOUT].forEach((clave) => sesion.remove(clave));
}

// Utilidad para el evento `storage`: solo nos interesan las claves de esta app.
export function esClaveCarresol(clave) {
  return typeof clave === 'string' && clave.startsWith(PREFIJO);
}
