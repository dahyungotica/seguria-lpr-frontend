// =====================================================================
// Sesión del usuario: login, elección de perfil, logout, datos guardados
// y protección de páginas.
// Requiere: config.js y api.js
//
// Una persona tiene una sola cuenta aunque cumpla varios roles en uno o más
// recintos (ej. administradora de 3 recintos y guardia en 1). Cada recinto + rol
// es un "perfil": si tiene más de uno, al iniciar sesión elige con cuál trabajar
// y puede cambiarlo después sin volver a escribir su contraseña.
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

// Nombre corto de los roles dentro de un recinto (para botones y etiquetas)
const NOMBRE_ROL_CORTO = {
  admin_recinto: 'Administrador',
  guardia: 'Guardia',
  propietario: 'Propietario',
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

// Recintos a los que el usuario tiene acceso, con sus roles en cada uno:
// [{ recinto_id, nombre, comuna, roles: [{ rol, unidad }] }]
function obtenerRecintos() {
  return leerJson(CLAVE_RECINTOS) || [];
}

// Cantidad de perfiles (recinto + rol) disponibles
function totalPerfiles() {
  return obtenerRecintos().reduce((suma, r) => suma + (r.roles || []).length, 0);
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
  return Boolean(payload && usuario && typeof payload.exp === 'number' && payload.exp * 1000 > Date.now());
}

// ¿La sesión todavía necesita que el usuario elija con qué perfil trabajar?
function faltaElegirRecinto() {
  const usuario = obtenerUsuario();
  const payload = payloadToken();
  return Boolean(tokenVigente() && (!PAGINA_POR_ROL[usuario.rol] || (usuario.rol !== 'admin_plataforma' && !payload.recinto_id)));
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

// Elige (o cambia) el perfil de trabajo: el backend entrega un token nuevo para ese recinto y rol
async function seleccionarRecinto(recintoId, rol) {
  const datos = await api.post('/auth/recinto', { recinto_id: recintoId, rol }, { sinRedireccion: true });
  guardarSesion(datos.token, datos.usuario, datos.recintos);
  return datos.usuario;
}

// Vuelve a leer los perfiles disponibles (ej. después de que la persona se agregó un rol)
async function refrescarSesion() {
  const datos = await api.get('/auth/me');
  guardarSesion(obtenerToken(), { ...obtenerUsuario(), ...datos.usuario }, datos.recintos);
  return datos;
}

// Dibuja los recintos con un botón por cada rol (perfil). Se usa en el login, en "Cambiar perfil" y en Mi perfil.
//   actual: { recinto_id, rol } del perfil en uso (se marca y no se puede elegir)
//   alElegir(recintoId, rol): se llama al pulsar un perfil
function pintarPerfiles(contenedor, { actual = null, alElegir }) {
  contenedor.innerHTML = '';
  for (const r of obtenerRecintos()) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'perfil-recinto';
    tarjeta.setAttribute('role', 'listitem');

    const cabecera = document.createElement('div');
    cabecera.className = 'perfil-recinto-nombre';
    const nombre = document.createElement('strong');
    nombre.textContent = r.nombre;
    cabecera.appendChild(nombre);
    if (r.comuna) {
      const comuna = document.createElement('span');
      comuna.textContent = r.comuna;
      cabecera.appendChild(comuna);
    }

    const botones = document.createElement('div');
    botones.className = 'perfil-roles';
    for (const x of r.roles || []) {
      const esActual = Boolean(actual && actual.recinto_id === r.recinto_id && actual.rol === x.rol);
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'opcion-rol' + (esActual ? ' actual' : '');
      boton.dataset.recinto = r.recinto_id;
      boton.dataset.rol = x.rol;
      boton.textContent = (NOMBRE_ROL_CORTO[x.rol] || x.rol) + (x.unidad ? ' · ' + x.unidad : '');
      if (esActual) {
        boton.disabled = true;
        boton.setAttribute('aria-current', 'true');
        boton.title = 'Perfil actual';
      }
      botones.appendChild(boton);
    }

    tarjeta.append(cabecera, botones);
    contenedor.appendChild(tarjeta);
  }

  contenedor.onclick = (e) => {
    const boton = e.target.closest('.opcion-rol');
    if (boton && !boton.disabled) alElegir(Number(boton.dataset.recinto), boton.dataset.rol);
  };
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
