// =====================================================================
// Wrapper de fetch para hablar con el backend.
// - Agrega el token JWT en el header Authorization.
// - Si el backend responde 401, cierra la sesión y vuelve al login.
// - Lanza un Error con el mensaje del backend cuando la respuesta no es OK.
// Requiere: config.js y auth.js
// =====================================================================

async function peticion(metodo, ruta, body, opciones = {}) {
  const headers = { Accept: 'application/json' };
  const token = obtenerToken();

  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let respuesta;
  try {
    respuesta = await fetch(CONFIG.API_URL + ruta, {
      method: metodo,
      headers: headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.');
  }

  // Sesión expirada o inválida (el login maneja su propio 401)
  if (respuesta.status === 401 && !opciones.sinRedireccion) {
    cerrarSesion();
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
  }

  const datos = await respuesta.json().catch(() => null);

  // La sesión aún no tiene recinto elegido (usuarios con varios recintos): volver a elegir
  if (respuesta.status === 403 && datos && datos.codigo === 'SELECCIONAR_RECINTO' && !opciones.sinRedireccion) {
    irA('index.html');
    throw new Error(datos.error);
  }

  if (!respuesta.ok) {
    const error = new Error((datos && datos.error) || 'Error ' + respuesta.status);
    error.status = respuesta.status;
    error.datos = datos;
    throw error;
  }

  return datos;
}

const api = {
  get: (ruta, opciones) => peticion('GET', ruta, undefined, opciones),
  post: (ruta, body, opciones) => peticion('POST', ruta, body, opciones),
  put: (ruta, body, opciones) => peticion('PUT', ruta, body, opciones),
  patch: (ruta, body, opciones) => peticion('PATCH', ruta, body, opciones),
  delete: (ruta, opciones) => peticion('DELETE', ruta, undefined, opciones),
};
