// =====================================================================
// Sesión del usuario: login, elección de recinto, logout, datos guardados
// y protección de páginas.
// Requiere: config.js y api.js
//
// Un propietario o guardia puede pertenecer a varios recintos (HU-19 / HU-20):
// en ese caso inicia sesión, elige el recinto y la sesión queda asociada a él.
// =====================================================================

const CLAVE_TOKEN = 'seguria_token';
const CLAVE_USUARIO = 'seguria_usuario';
const CLAVE_RECINTOS = 'seguria_recintos';

// Página de inicio de cada rol (relativa a la raíz del sitio)
const PAGINA_POR_ROL = {
  admin_plataforma: 'pages/plataforma/recintos.html',
  admin_recinto: 'pages/admin/panel.html',
  propietario: 'pages/propietario/vehiculos.html',
  guardia: 'pages/guardia/monitor.html',
};

// Nombre legible de cada rol (para mostrar en pantalla)
const NOMBRE_ROL = {
  admin_plataforma: 'Administrador de plataforma',
  admin_recinto: 'Administrador de recinto',
  propietario: 'Propietario',
  guardia: 'Guardia',
};

// ---------- Datos de sesión en localStorage ----------

function obtenerToken() {
  return localStorage.getItem(CLAVE_TOKEN);
}

function leerJson(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave));
  } catch (e) {
    return null;
  }
}

function obtenerUsuario() {
  return leerJson(CLAVE_USUARIO);
}

// Recintos a los que el usuario tiene acceso (para elegir o cambiar de recinto)
function obtenerRecintos() {
  return leerJson(CLAVE_RECINTOS) || [];
}

function guardarSesion(token, usuario, recintos) {
  localStorage.setItem(CLAVE_TOKEN, token);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
  localStorage.setItem(CLAVE_RECINTOS, JSON.stringify(recintos || []));
}

function borrarSesion() {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
  localStorage.removeItem(CLAVE_RECINTOS);
}

// Contenido del JWT (solo lectura local; el backend siempre valida la firma)
function payloadToken() {
  const token = obtenerToken();
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) {
    return null;
  }
}

// ¿Hay un token vigente (no expirado)?
function tokenVigente() {
  const payload = payloadToken();
  const usuario = obtenerUsuario();
  return Boolean(payload && usuario && PAGINA_POR_ROL[usuario.rol] && typeof payload.exp === 'number' && payload.exp * 1000 > Date.now());
}

// ¿La sesión todavía necesita que el usuario elija un recinto?
function faltaElegirRecinto() {
  const usuario = obtenerUsuario();
  const payload = payloadToken();
  return Boolean(tokenVigente() && usuario.rol !== 'admin_plataforma' && !payload.recinto_id);
}

// Sesión lista para usar las páginas internas
function haySesionValida() {
  return tokenVigente() && !faltaElegirRecinto();
}

// ---------- Navegación ----------

function irA(rutaDesdeRaiz) {
  window.location.replace(CONFIG.RAIZ + rutaDesdeRaiz);
}

function irAPaginaDeRol(rol) {
  irA(PAGINA_POR_ROL[rol] || 'index.html');
}

// ---------- Acciones ----------

// Inicia sesión contra el backend. Devuelve la respuesta completa
// (si requiere_seleccion es true, falta elegir el recinto).
async function login(email, password) {
  const datos = await api.post('/auth/login', { email, password }, { sinRedireccion: true });
  guardarSesion(datos.token, datos.usuario, datos.recintos);
  return datos;
}

// Elige (o cambia) el recinto de trabajo: el backend entrega un token nuevo para ese recinto
async function seleccionarRecinto(recintoId) {
  const datos = await api.post('/auth/recinto', { recinto_id: recintoId }, { sinRedireccion: true });
  guardarSesion(datos.token, datos.usuario, datos.recintos);
  return datos.usuario;
}

function cerrarSesion() {
  borrarSesion();
  if (window.socketSeguria) window.socketSeguria.disconnect();
  irA('index.html');
}

// Protege una página interna. Llamar al cargar cada página.
// - Sin sesión: vuelve al login.
// - Sesión sin recinto elegido: vuelve al login para elegirlo.
// - Rol no permitido: redirige a la página de su propio rol.
// Devuelve el usuario si tiene acceso; si no, null.
function requireRole(rolesPermitidos) {
  if (!tokenVigente()) {
    borrarSesion();
    irA('index.html');
    return null;
  }
  if (faltaElegirRecinto()) {
    irA('index.html');
    return null;
  }

  const usuario = obtenerUsuario();
  if (!rolesPermitidos.includes(usuario.rol)) {
    irAPaginaDeRol(usuario.rol);
    return null;
  }

  return usuario;
}
