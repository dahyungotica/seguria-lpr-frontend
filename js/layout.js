// =====================================================================
// Layout de las páginas internas: genera el sidebar y el header según el rol.
// Requiere: config.js, auth.js (y api.js)
//
// Uso en cada página:
//   iniciarPagina({ roles: ['guardia'], activo: 'monitor', titulo: 'Monitor' });
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
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1"/>',
  sonido: '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  silencio: '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/>',
};

// "Mi perfil" aparece al final del menú de todos los roles
const ITEM_PERFIL = { id: 'perfil', texto: 'Mi perfil', icono: 'perfil', href: 'pages/perfil.html' };

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
    { id: 'propietarios', texto: 'Personas y unidades', icono: 'usuarios', href: 'pages/admin/propietarios.html' },
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
    { id: 'monitor', texto: 'Monitor', icono: 'monitor', href: 'pages/guardia/monitor.html' },
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
    .concat(ITEM_PERFIL)
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
    '<button class="btn btn-secundario btn-sonido oculto" id="btn-sonido" type="button"></button>' +
    '<button class="btn btn-secundario btn-cambiar-recinto oculto" id="btn-cambiar-recinto" type="button" title="Entrar con otro rol o recinto">' +
    icono('cambiar') + '<span>Cambiar perfil</span></button>' +
    '<a class="usuario-enlace" href="' + CONFIG.RAIZ + ITEM_PERFIL.href + '" title="Mi perfil">' +
    '<div class="usuario-info"><div class="usuario-nombre"></div><div class="usuario-rol"></div></div>' +
    '<div class="avatar" aria-hidden="true"></div></a>' +
    '<button class="btn btn-secundario btn-salir" id="btn-salir" type="button">Cerrar sesión</button>' +
    '</div>';

  // textContent evita inyectar HTML con datos del usuario
  header.querySelector('.header-titulo').textContent = titulo;
  header.querySelector('.usuario-nombre').textContent = usuario.nombre;
  // El rol va acompañado del recinto de la sesión (útil para quien tiene varios perfiles)
  header.querySelector('.usuario-rol').textContent =
    (NOMBRE_ROL[usuario.rol] || usuario.rol) + (usuario.recinto_nombre ? ' · ' + usuario.recinto_nombre : '');
  if (totalPerfiles() > 1) header.querySelector('#btn-cambiar-recinto').classList.remove('oculto');
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
  if (usuario.rol === 'guardia') iniciarSonido();
  if (usuario.rol === 'guardia' || usuario.rol === 'admin_recinto') iniciarAvisosTiempoReal(usuario, activo);

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

// ---------- Cambio de perfil: otro recinto u otro rol (HU-19 / HU-20) ----------

// Entra con el perfil elegido y va a su página de inicio
async function entrarConPerfil(recintoId, rol) {
  try {
    const usuario = await seleccionarRecinto(recintoId, rol);
    irAPaginaDeRol(usuario.rol);
  } catch (error) {
    toast(error.message, 'error');
  }
}

function abrirCambioRecinto() {
  const modal = abrirModal({
    titulo: 'Cambiar perfil',
    cuerpo: '<p class="texto-suave" style="margin-top:0">Elige el recinto y el rol con que quieres trabajar.</p><div class="lista-recintos" role="list"></div>',
  });
  const usuario = obtenerUsuario();
  pintarPerfiles(modal.elemento.querySelector('.lista-recintos'), {
    actual: { recinto_id: usuario.recinto_id, rol: usuario.rol },
    alElegir: entrarConPerfil,
  });
}

// ---------- Sonido de los avisos del guardia ----------
// Tonos generados con Web Audio (sin archivos de audio):
//  - "alerta": ingreso no autorizado o cámara sin señal (tres tonos)
//  - "aviso":  ingreso autorizado o visita (dos tonos suaves)
// Los navegadores solo dejan sonar una página después de que la persona interactúa con ella:
// el primer clic o tecla en la página activa el audio. El guardia puede silenciarlo con el botón del encabezado.
const CLAVE_SONIDO = 'seguria_sonido';
const TONOS = {
  alerta: { volumen: 0.3, notas: [[880, 0, 0.16], [660, 0.2, 0.16], [880, 0.4, 0.24]] },
  aviso: { volumen: 0.18, notas: [[660, 0, 0.12], [990, 0.15, 0.2]] },
};
let contextoAudio = null;
let avisoAudioBloqueado = false;

function sonidoActivado() {
  try {
    return localStorage.getItem(CLAVE_SONIDO) !== 'no';
  } catch (e) {
    return true;
  }
}

function obtenerAudio() {
  if (!contextoAudio) {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return null;
    contextoAudio = new Contexto();
  }
  return contextoAudio;
}

function desbloquearAudio() {
  const audio = obtenerAudio();
  if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
}

function reproducirSonido(tipo) {
  if (!sonidoActivado() || !TONOS[tipo]) return;
  const audio = obtenerAudio();
  if (!audio) return;
  if (audio.state !== 'running') {
    // Aún no hay interacción con la página: se avisa una vez cómo activarlo
    if (!avisoAudioBloqueado) {
      avisoAudioBloqueado = true;
      toast('Haz clic en cualquier parte de la página para activar el sonido de los avisos.');
    }
    return;
  }
  const { volumen, notas } = TONOS[tipo];
  const inicio = audio.currentTime;
  notas.forEach(([frecuencia, desde, duracion]) => {
    const oscilador = audio.createOscillator();
    const ganancia = audio.createGain();
    oscilador.type = 'sine';
    oscilador.frequency.value = frecuencia;
    ganancia.gain.setValueAtTime(0.0001, inicio + desde);
    ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + desde + 0.02);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + desde + duracion);
    oscilador.connect(ganancia).connect(audio.destination);
    oscilador.start(inicio + desde);
    oscilador.stop(inicio + desde + duracion + 0.02);
  });
}

// Botón del encabezado (solo guardia) para activar o silenciar el sonido
function pintarBotonSonido(boton) {
  const activo = sonidoActivado();
  boton.innerHTML = icono(activo ? 'sonido' : 'silencio');
  boton.setAttribute('aria-pressed', String(activo));
  boton.setAttribute('aria-label', activo ? 'Silenciar los avisos' : 'Activar el sonido de los avisos');
  boton.title = activo ? 'Sonido de avisos activado (clic para silenciar)' : 'Sonido de avisos silenciado (clic para activar)';
}

function iniciarSonido() {
  ['pointerdown', 'keydown'].forEach((evento) => document.addEventListener(evento, desbloquearAudio, { passive: true }));
  const boton = document.getElementById('btn-sonido');
  if (!boton) return;
  boton.classList.remove('oculto');
  pintarBotonSonido(boton);
  boton.addEventListener('click', () => {
    const activar = !sonidoActivado();
    try {
      localStorage.setItem(CLAVE_SONIDO, activar ? 'si' : 'no');
    } catch (e) {
      // Sin localStorage la preferencia dura solo mientras la página está abierta
    }
    pintarBotonSonido(boton);
    if (activar) {
      desbloquearAudio();
      setTimeout(() => reproducirSonido('aviso'), 50); // muestra cómo suena
    }
  });
}

// ---------- Avisos en pantalla en todas las secciones (guardia y admin de recinto) ----------
// - Guardia: cada ingreso le llega en cualquier sección, con acceso directo al monitor
//   (no autorizado: queda hasta que se atiende; autorizado o visita: se va solo a los 45 s).
// - Guardia y admin: aviso cuando una Raspberry Pi pierde la señal y cuando la recupera.
// Las páginas que necesitan reaccionar al estado de los equipos escuchan el evento "seguria:dispositivo".

const PAGINA_MONITOR = 'pages/guardia/monitor.html';
let rolAvisos = null; // rol de la sesión: solo el guardia escucha los avisos
const CLAVE_AVISOS_CERRADOS = 'seguria_avisos_cerrados';

function avisosCerrados() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_AVISOS_CERRADOS)) || {};
  } catch (e) {
    return {};
  }
}

function recordarAvisoCerrado(clave, valor) {
  try {
    const cerrados = avisosCerrados();
    if (valor === undefined) delete cerrados[clave];
    else cerrados[clave] = valor;
    sessionStorage.setItem(CLAVE_AVISOS_CERRADOS, JSON.stringify(cerrados));
  } catch (e) {
    // Sin sessionStorage el aviso simplemente vuelve a aparecer al cambiar de página
  }
}

function existeAviso(clave) {
  return Array.from(document.querySelectorAll('.aviso')).some((el) => el.dataset.clave === clave);
}

function quitarAviso(clave) {
  document.querySelectorAll('.aviso').forEach((el) => {
    if (el.dataset.clave === clave) el.remove();
  });
}

// Aviso que queda en pantalla hasta que se cierra (o hasta "duracion" ms, si se indica).
// "valor" identifica la versión del aviso: si el usuario lo cerró, no se vuelve a mostrar
// en esta sesión mientras el valor sea el mismo.
function mostrarAviso({ clave, valor = '1', tipo = '', titulo, texto, accion, duracion }) {
  if (avisosCerrados()[clave] === valor) return;
  quitarAviso(clave);

  let contenedor = document.querySelector('.avisos');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.className = 'avisos';
    document.body.appendChild(contenedor);
  }

  const aviso = document.createElement('div');
  aviso.className = 'aviso' + (tipo ? ' ' + tipo : '');
  aviso.setAttribute('role', 'alert');
  aviso.dataset.clave = clave;
  aviso.innerHTML =
    '<div class="aviso-cuerpo"><strong class="aviso-titulo"></strong><span class="aviso-texto"></span></div>' +
    '<button type="button" class="aviso-cerrar" aria-label="Cerrar aviso">&times;</button>';
  // textContent evita inyectar HTML con datos del servidor
  aviso.querySelector('.aviso-titulo').textContent = titulo;
  aviso.querySelector('.aviso-texto').textContent = texto;
  if (accion) {
    const enlace = document.createElement('a');
    enlace.className = 'btn btn-sm ' + (accion.secundario ? 'btn-secundario' : 'btn-primario');
    enlace.href = accion.href;
    enlace.textContent = accion.texto;
    aviso.querySelector('.aviso-cuerpo').appendChild(enlace);
  }
  aviso.querySelector('.aviso-cerrar').addEventListener('click', () => {
    recordarAvisoCerrado(clave, valor);
    aviso.remove();
  });
  contenedor.prepend(aviso);
  if (duracion) setTimeout(() => aviso.remove(), duracion);
}

function cargarScript(src) {
  return new Promise((resolver, rechazar) => {
    const script = document.createElement('script');
    script.src = src;
    if (/^https?:/.test(src)) script.crossOrigin = 'anonymous';
    script.onload = resolver;
    script.onerror = rechazar;
    document.head.appendChild(script);
  });
}

// Algunas páginas no incluyen Socket.io: se carga aquí cuando hace falta
async function asegurarSocket() {
  if (typeof io === 'undefined') await cargarScript('https://cdn.socket.io/4.8.1/socket.io.min.js');
  if (typeof conectarSocket === 'undefined') await cargarScript(CONFIG.RAIZ + 'js/socket.js');
  return conectarSocket();
}

// Aviso de una cámara cuyo equipo no tiene señal
// La plataforma solo se comunica con la Raspberry Pi: si el equipo pierde la conexión, tampoco se sabe de su cámara.
//  - motivo "sin_conexion": el equipo no tiene conexión (equipo y cámara sin señal)
//  - motivo "sin_imagen":   el equipo está conectado, pero informa que no recibe imagen de la cámara
function motivoSinSenal(estadoEquipo, camaraSenal) {
  if (estadoEquipo === 'sin_conexion') return 'sin_conexion';
  if (estadoEquipo === 'activo' && camaraSenal === false) return 'sin_imagen';
  return null;
}

function avisoEquipoSinSenal(d, motivo) {
  mostrarAviso({
    clave: 'equipo-' + d.id,
    valor: motivo,
    tipo: 'peligro',
    titulo: motivo === 'sin_imagen' ? 'Cámara sin señal' : 'Equipo y cámara sin señal',
    texto: motivo === 'sin_imagen'
      ? `${d.camara_nombre}: el equipo ${d.nombre} está conectado, pero no recibe imagen de la cámara. No se detectarán patentes hasta que se recupere.`
      : `${d.camara_nombre}: el equipo ${d.nombre} perdió la conexión con la plataforma, por lo que tampoco hay señal de su cámara. Sus detecciones no llegarán hasta que se recupere.`,
  });
}

// Solo se avisa por los equipos que atienden una cámara (un equipo sin cámara no está en uso)
function alCambiarEstadoEquipo(d) {
  document.dispatchEvent(new CustomEvent('seguria:dispositivo', { detail: d }));
  if (!d.camara_id) return;
  const clave = 'equipo-' + d.id;
  const motivo = motivoSinSenal(d.estado, d.camara_senal);
  if (motivo) {
    recordarAvisoCerrado(clave); // pérdida de señal nueva: se vuelve a avisar aunque antes lo hubiera cerrado
    avisoEquipoSinSenal(d, motivo);
    if (rolAvisos === 'guardia') reproducirSonido('alerta');
  } else if (d.estado === 'activo') {
    const habiaAviso = existeAviso(clave);
    quitarAviso(clave);
    recordarAvisoCerrado(clave);
    if (habiaAviso) toast(`Señal recuperada: ${d.camara_nombre}`, 'exito');
  }
}

// Ingreso permitido (vehículo registrado o visita): aviso informativo que se va solo a los 45 s,
// igual que en el monitor. Se muestran como máximo los 3 más recientes.
const MAX_AVISOS_PERMITIDOS = 3;

function avisoIngresoPermitido(a) {
  const quien = a.nombre_visitante
    ? `Visita de ${a.nombre_visitante}`
    : a.propietario_nombre || 'Ingreso autorizado';
  mostrarAviso({
    clave: 'acceso-' + a.id,
    tipo: 'exito',
    titulo: `Patente ${a.patente_detectada} · ${a.resultado === 'visita' ? 'Visita' : 'Autorizado'}`,
    texto: `${quien}${a.unidad ? ' (' + a.unidad + ')' : ''} · ${a.camara_nombre || 'Cámara'} · ${formatearHora(a.fecha_hora)}`,
    accion: { texto: 'Ver en el monitor', href: CONFIG.RAIZ + PAGINA_MONITOR + '?acceso=' + a.id, secundario: true },
    duracion: 45 * 1000,
  });
  reproducirSonido('aviso');
  document.querySelectorAll('.aviso.exito').forEach((el, i) => {
    if (i >= MAX_AVISOS_PERMITIDOS) el.remove();
  });
}

function avisoIngresoNoAutorizado(a) {
  mostrarAviso({
    clave: 'acceso-' + a.id,
    tipo: 'peligro',
    titulo: `Patente ${a.patente_detectada} no autorizada`,
    texto: `${a.camara_nombre || 'Cámara'} · ${formatearHora(a.fecha_hora)} · Revisa la captura y autoriza o rechaza el ingreso.`,
    accion: { texto: 'Ir al monitor', href: CONFIG.RAIZ + PAGINA_MONITOR + '?acceso=' + a.id },
  });
  reproducirSonido('alerta');
}

async function iniciarAvisosTiempoReal(usuario, activo) {
  const esGuardia = usuario.rol === 'guardia';
  const enMonitor = esGuardia && activo === 'monitor';
  rolAvisos = usuario.rol;

  // Al entrar a cualquier sección: cámaras sin señal y, para el guardia fuera del monitor, alertas pendientes
  api.get('/camaras').then((camaras) => {
    camaras
      .filter((c) => c.asignada && motivoSinSenal(c.dispositivo_estado, c.camara_senal))
      .forEach((c) => avisoEquipoSinSenal(
        { id: c.dispositivo_id, nombre: c.dispositivo_nombre, camara_nombre: c.nombre },
        motivoSinSenal(c.dispositivo_estado, c.camara_senal)
      ));
  }).catch(() => {});

  if (esGuardia && !enMonitor) {
    api.get('/accesos?alerta=pendiente&limite=1').then(({ datos, total }) => {
      if (!total) return;
      mostrarAviso({
        clave: 'alertas-pendientes',
        valor: datos[0].id + '-' + total,
        tipo: 'peligro',
        titulo: total === 1 ? 'Hay 1 alerta pendiente' : `Hay ${total} alertas pendientes`,
        texto: 'Ingresos no autorizados que esperan tu decisión.',
        accion: { texto: 'Ir al monitor', href: CONFIG.RAIZ + PAGINA_MONITOR + '?acceso=' + datos[0].id },
      });
    }).catch(() => {});
  }

  let socket = null;
  try {
    socket = await asegurarSocket();
  } catch (e) {
    return; // sin tiempo real la página sigue funcionando
  }
  if (!socket) return;

  socket.on('dispositivo:estado', alCambiarEstadoEquipo);
  if (esGuardia && !enMonitor) {
    socket.on('acceso:nuevo', (a) => {
      if (a.resultado === 'denegado' && a.alerta_estado === 'pendiente') avisoIngresoNoAutorizado(a);
      else if (a.resultado === 'autorizado' || a.resultado === 'visita') avisoIngresoPermitido(a);
    });
    // Si otro guardia atendió la alerta, el aviso ya no corresponde
    socket.on('acceso:actualizado', (a) => {
      if (a.alerta_estado !== 'pendiente') quitarAviso('acceso-' + a.id);
    });
  }
}
