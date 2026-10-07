// =====================================================================
// Layout de las páginas internas: genera el sidebar y el header según el rol.
// Requiere: config.js, auth.js (y api.js)
//
// Uso en cada página:
//   iniciarPagina({ roles: ['guardia'], activo: 'monitor', titulo: 'Monitor en vivo' });
// =====================================================================

// Íconos SVG simples (trazos de 24x24)
const ICONOS = {
  edificio: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M8 7h4M8 11h4M8 15h4M3 21h18"/>',
  usuarios: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  panel: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  camara: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  historial: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  campana: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
  auto: '<path d="M5 17h14M5 17a2 2 0 1 1-4 0v-5l2-5h18l2 5v5a2 2 0 1 1-4 0M5 17h-.01M19 17h.01M3 12h18"/>',
  visita: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="12" cy="10" r="3"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  auditoria: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>',
  cambiar: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
};

// Opciones del menú lateral por rol (href relativo a la raíz del sitio)
const MENUS = {
  admin_plataforma: [
    { id: 'recintos', texto: 'Recintos', icono: 'edificio', href: 'pages/plataforma/recintos.html' },
    { id: 'administradores', texto: 'Administradores', icono: 'usuarios', href: 'pages/plataforma/administradores.html' },
    { id: 'accesos', texto: 'Accesos de recintos', icono: 'historial', href: 'pages/plataforma/accesos.html' },
    { id: 'auditoria', texto: 'Auditoría', icono: 'auditoria', href: 'pages/plataforma/auditoria.html' },
  ],
  admin_recinto: [
    { id: 'panel', texto: 'Panel', icono: 'panel', href: 'pages/admin/panel.html' },
    { id: 'propietarios', texto: 'Propietarios autorizados', icono: 'usuarios', href: 'pages/admin/propietarios.html' },
    { id: 'camaras', texto: 'Cámaras y equipos', icono: 'camara', href: 'pages/admin/camaras.html' },
    { id: 'historial', texto: 'Historial de accesos', icono: 'historial', href: 'pages/admin/historial.html' },
    { id: 'notificaciones', texto: 'Notificación de cambios', icono: 'campana', href: 'pages/admin/notificaciones.html' },
    { id: 'auditoria', texto: 'Auditoría', icono: 'auditoria', href: 'pages/admin/auditoria.html' },
  ],
  propietario: [
    { id: 'vehiculos', texto: 'Mis vehículos', icono: 'auto', href: 'pages/propietario/vehiculos.html' },
    { id: 'visitas', texto: 'Mis visitas', icono: 'visita', href: 'pages/propietario/visitas.html' },
    { id: 'historial', texto: 'Historial de accesos', icono: 'historial', href: 'pages/propietario/historial.html' },
  ],
  guardia: [
    { id: 'monitor', texto: 'Monitor en vivo', icono: 'monitor', href: 'pages/guardia/monitor.html' },
    { id: 'historial', texto: 'Historial de accesos', icono: 'historial', href: 'pages/guardia/historial.html' },
    { id: 'propietarios', texto: 'Propietarios', icono: 'usuarios', href: 'pages/guardia/propietarios.html' },
  ],
};

function icono(nombre) {
  return (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONOS[nombre] + '</svg>'
  );
}

// Iniciales para el avatar (ej. "Gonzalo Guardia" -> "GG")
function iniciales(nombre) {
  return (nombre || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function crearSidebar(usuario, activo) {
  const enlaces = (MENUS[usuario.rol] || [])
    .map(
      (item) =>
        '<a href="' + CONFIG.RAIZ + item.href + '"' +
        (item.id === activo ? ' class="activo" aria-current="page"' : '') + '>' +
        icono(item.icono) + '<span>' + item.texto + '</span></a>'
    )
    .join('');

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.innerHTML =
    '<a class="sidebar-marca" href="' + CONFIG.RAIZ + PAGINA_POR_ROL[usuario.rol] + '">' +
    '<img src="' + CONFIG.RAIZ + 'assets/logo.svg" alt="" /><strong>SegurIA<span>-LPR</span></strong></a>' +
    '<nav class="sidebar-nav" aria-label="Menú principal">' + enlaces + '</nav>' +
    '<div class="sidebar-pie">SegurIA-LPR · Control de acceso vehicular</div>';
  return sidebar;
}

function crearHeader(usuario, titulo) {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML =
    '<button class="btn-menu" id="btn-menu" type="button" aria-label="Abrir menú" aria-controls="sidebar" aria-expanded="false">' +
    icono('menu') + '</button>' +
    '<h1 class="header-titulo"></h1>' +
    '<span class="estado-conexion oculto" id="estado-conexion" role="status"><span class="estado-conexion-texto"></span></span>' +
    '<div class="header-usuario">' +
    '<button class="btn btn-secundario btn-cambiar-recinto oculto" id="btn-cambiar-recinto" type="button" title="Cambiar de recinto">' +
    icono('cambiar') + '<span>Cambiar recinto</span></button>' +
    '<div class="usuario-info"><div class="usuario-nombre"></div><div class="usuario-rol"></div></div>' +
    '<div class="avatar" aria-hidden="true"></div>' +
    '<button class="btn btn-secundario btn-salir" id="btn-salir" type="button">Cerrar sesión</button>' +
    '</div>';

  // textContent evita inyectar HTML con datos del usuario
  header.querySelector('.header-titulo').textContent = titulo;
  header.querySelector('.usuario-nombre').textContent = usuario.nombre;
  // El rol va acompañado del recinto de la sesión (útil para quien trabaja en varios recintos)
  header.querySelector('.usuario-rol').textContent =
    (NOMBRE_ROL[usuario.rol] || usuario.rol) + (usuario.recinto_nombre ? ' · ' + usuario.recinto_nombre : '');
  if (obtenerRecintos().length > 1) header.querySelector('#btn-cambiar-recinto').classList.remove('oculto');
  header.querySelector('.avatar').textContent = iniciales(usuario.nombre);
  return header;
}

// Menú lateral desplegable en pantallas pequeñas
function activarMenuMovil() {
  const sidebar = document.getElementById('sidebar');
  const boton = document.getElementById('btn-menu');
  const fondo = document.createElement('div');
  fondo.className = 'sidebar-fondo';
  document.body.appendChild(fondo);

  function alternar(abrir) {
    sidebar.classList.toggle('abierto', abrir);
    fondo.classList.toggle('visible', abrir);
    boton.setAttribute('aria-expanded', String(abrir));
  }

  boton.addEventListener('click', () => alternar(!sidebar.classList.contains('abierto')));
  fondo.addEventListener('click', () => alternar(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') alternar(false);
  });
}

// Punto de entrada de cada página interna.
// La página debe tener: <body class="app"> y <div class="app-main"><main class="contenido">...</main></div>
function iniciarPagina({ roles, activo, titulo }) {
  const usuario = requireRole(roles);
  if (!usuario) return null; // se está redirigiendo

  document.title = titulo + ' · SegurIA-LPR';

  const main = document.querySelector('.app-main');
  document.body.insertBefore(crearSidebar(usuario, activo), main);
  main.insertBefore(crearHeader(usuario, titulo), main.firstChild);

  document.getElementById('btn-salir').addEventListener('click', cerrarSesion);
  document.getElementById('btn-cambiar-recinto').addEventListener('click', abrirCambioRecinto);
  activarMenuMovil();

  if (usuario.rol === 'admin_recinto') cargarContadorNotificaciones();

  document.body.classList.add('listo');
  return usuario;
}

// ---------- Contador de notificaciones no leídas (admin de recinto) ----------

function actualizarContadorNotificaciones(total) {
  const enlace = document.querySelector('.sidebar-nav a[href$="notificaciones.html"]');
  if (!enlace) return;
  let contador = enlace.querySelector('.contador-menu');
  if (!total) {
    if (contador) contador.remove();
    return;
  }
  if (!contador) {
    contador = document.createElement('span');
    contador.className = 'contador-menu';
    enlace.appendChild(contador);
  }
  contador.textContent = total > 99 ? '99+' : String(total);
  contador.setAttribute('aria-label', total + ' sin leer');
}

async function cargarContadorNotificaciones() {
  try {
    const { total } = await api.get('/notificaciones/no-leidas');
    actualizarContadorNotificaciones(total);
  } catch (e) {
    // No es crítico: si falla, simplemente no se muestra el contador
  }
}

// ---------- Cambio de recinto (usuarios con más de un recinto, HU-19 / HU-20) ----------
function abrirCambioRecinto() {
  const actual = obtenerUsuario().recinto_id;
  const opciones = obtenerRecintos()
    .map(
      (r) => `<button type="button" class="opcion-recinto${r.recinto_id === actual ? ' actual' : ''}" data-id="${r.recinto_id}"
                ${r.recinto_id === actual ? 'aria-current="true"' : ''}>
                <strong>${escapar(r.nombre)}</strong>
                <span>${escapar([r.comuna, r.unidad && 'Unidad ' + r.unidad, r.recinto_id === actual && 'Recinto actual'].filter(Boolean).join(' · '))}</span>
              </button>`
    )
    .join('');
  const modal = abrirModal({ titulo: 'Cambiar de recinto', cuerpo: `<div class="lista-recintos">${opciones}</div>` });
  modal.elemento.querySelector('.lista-recintos').addEventListener('click', async (e) => {
    const boton = e.target.closest('.opcion-recinto');
    if (!boton || Number(boton.dataset.id) === actual) return;
    try {
      const usuario = await seleccionarRecinto(Number(boton.dataset.id));
      irAPaginaDeRol(usuario.rol);
    } catch (error) {
      toast(error.message, 'error');
    }
  });
}
