// =====================================================================
// Cliente Socket.io (tiempo real).
// La librería se carga desde CDN en la página, antes de este archivo:
//   <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
// Requiere: config.js y auth.js
// =====================================================================

// Conecta al servidor con el token del usuario. Devuelve el socket (o null).
// Uso: const socket = conectarSocket(); socket.on('acceso:nuevo', (datos) => { ... });
function conectarSocket() {
  if (typeof io === 'undefined') {
    console.warn('Socket.io no está cargado en esta página.');
    return null;
  }

  const token = obtenerToken();
  if (!token) return null;

  // Reutiliza la conexión si ya existe
  if (window.socketSeguria) return window.socketSeguria;

  const socket = io(CONFIG.SOCKET_URL, {
    auth: { token: token },
    reconnection: true, // reconexión automática
    reconnectionDelay: 1000, // primer reintento al segundo
    reconnectionDelayMax: 10000, // máximo 10 s entre reintentos
  });

  socket.on('connect', () => actualizarEstadoConexion(true));
  socket.on('disconnect', () => actualizarEstadoConexion(false));

  socket.on('connect_error', (err) => {
    actualizarEstadoConexion(false);
    // Token rechazado por el servidor: la sesión ya no es válida
    if (err.message === 'Token inválido') {
      cerrarSesion();
    }
  });

  window.socketSeguria = socket;
  return socket;
}

// Actualiza el indicador "En línea / Sin conexión" del header (si existe)
function actualizarEstadoConexion(conectado) {
  const indicador = document.getElementById('estado-conexion');
  if (!indicador) return;

  indicador.classList.remove('oculto');
  indicador.classList.toggle('conectado', conectado);
  indicador.classList.toggle('desconectado', !conectado);
  indicador.querySelector('.estado-conexion-texto').textContent = conectado
    ? 'En línea'
    : 'Sin conexión';
}
