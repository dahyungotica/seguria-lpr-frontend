// =====================================================================
// Sesión del usuario: login, logout, datos guardados y protección de páginas.
// Requiere: config.js y api.js
// =====================================================================

const CLAVE_TOKEN = 'seguria_token';
const CLAVE_USUARIO = 'seguria_usuario';

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

function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_USUARIO));
  } catch (e) {
    return null;
  }
}

function guardarSesion(token, usuario) {
  localStorage.setItem(CLAVE_TOKEN, token);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

function borrarSesion() {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
}

// Revisa si el token existe y no ha expirado (lee el campo "exp" del JWT).
// Es solo una verificación local; el backend siempre valida la firma.
function haySesionValida() {
  const token = obtenerToken();
  const usuario = obtenerUsuario();
  if (!token || !usuario || !PAGINA_POR_ROL[usuario.rol]) return false;

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
}

// ---------- Navegación ----------

function irA(rutaDesdeRaiz) {
  window.location.replace(CONFIG.RAIZ + rutaDesdeRaiz);
}

function irAPaginaDeRol(rol) {
  irA(PAGINA_POR_ROL[rol] || 'index.html');
}

// ---------- Acciones ----------

// Inicia sesión contra el backend y guarda token + usuario
async function login(email, password) {
  const datos = await api.post('/auth/login', { email, password }, { sinRedireccion: true });
  guardarSesion(datos.token, datos.usuario);
  return datos.usuario;
}

function cerrarSesion() {
  borrarSesion();
  if (window.socketSeguria) window.socketSeguria.disconnect();
  irA('index.html');
}

// Protege una página interna. Llamar al cargar cada página.
// - Sin sesión: vuelve al login.
// - Rol no permitido: redirige a la página de su propio rol.
// Devuelve el usuario si tiene acceso; si no, null.
function requireRole(rolesPermitidos) {
  if (!haySesionValida()) {
    borrarSesion();
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
