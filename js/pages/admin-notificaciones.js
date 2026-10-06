// =====================================================================
// Admin de recinto > Notificación de cambios
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['admin_recinto'], activo: 'notificaciones', titulo: 'Notificación de cambios' });
  if (!usuario) return;

  const lista = document.getElementById('lista-notificaciones');
  const contPaginacion = document.getElementById('paginacion');
  let notificaciones = [];
  let filtroLeida = '';
  let pagina = 1;

  // Ícono y estilo por tipo de notificación
  const TIPOS = {
    vehiculo_creado: ['auto', 'info'],
    vehiculo_editado: ['auto', 'info'],
    vehiculo_eliminado: ['auto', 'peligro'],
    visita_creada: ['visita', 'info'],
    acceso_no_autorizado: ['alerta', 'peligro'],
    dispositivo_desconectado: ['camara', 'peligro'],
  };
  const ICONOS_EXTRA = {
    alerta: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>',
  };
  const NOMBRES_CAMPO = { patente: 'Patente', marca: 'Marca', modelo: 'Modelo', color: 'Color', tipo: 'Tipo', activo: 'Activo', camara: 'Cámara' };

  function iconoNotificacion(tipo) {
    const [nombre, clase] = TIPOS[tipo] || ['campana', ''];
    const trazo = ICONOS_EXTRA[nombre] || ICONOS[nombre];
    return `<div class="notificacion-icono ${clase}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazo}</svg></div>`;
  }

  // Tabla con lo que cambió (antes -> después)
  function cambiosHtml(n) {
    const antes = n.datos_anteriores || {};
    const despues = n.datos_nuevos || {};
    const campos = Object.keys({ ...antes, ...despues });
    if (campos.length === 0) return '';

    const filas = campos
      .map((campo) => {
        const a = antes[campo];
        const d = despues[campo];
        const nombre = escapar(NOMBRES_CAMPO[campo] || campo);
        if (n.datos_anteriores && a !== d) {
          return `<tr><th>${nombre}</th><td class="antes">${escapar(a ?? '—')}</td><td class="despues">${escapar(d ?? '—')}</td></tr>`;
        }
        if (!n.datos_anteriores) return `<tr><th>${nombre}</th><td>${escapar(d)}</td></tr>`;
        return '';
      })
      .join('');
    return filas ? `<table class="cambios"><caption class="sr-only">Cambios</caption>${filas}</table>` : '';
  }

  function dibujar() {
    if (notificaciones.length === 0) {
      lista.innerHTML = `<li class="tabla-estado">${filtroLeida === 'false' ? 'No tienes notificaciones sin leer.' : 'Aún no hay notificaciones.'}</li>`;
      return;
    }
    lista.innerHTML = notificaciones
      .map(
        (n) => `
        <li class="notificacion${n.leida ? '' : ' no-leida'}">
          ${iconoNotificacion(n.tipo)}
          <div>
            <div class="notificacion-mensaje">${escapar(n.mensaje)}</div>
            <div class="notificacion-meta">
              <span title="${escapar(formatearFecha(n.created_at))}">${escapar(tiempoRelativo(n.created_at))}</span>
              ${n.origen_nombre ? ' · ' + escapar(n.origen_nombre) + (n.origen_unidad ? ' (' + escapar(n.origen_unidad) + ')' : '') : ''}
              ${n.leida ? '' : ' · <strong>Sin leer</strong>'}
            </div>
            ${cambiosHtml(n)}
          </div>
          <div class="notificacion-acciones">
            ${n.leida ? '' : `<button type="button" class="btn-texto" data-leer="${n.id}">Marcar como leída</button>`}
          </div>
        </li>`
      )
      .join('');
  }

  async function actualizarContadores() {
    try {
      const { total } = await api.get('/notificaciones/no-leidas');
      document.getElementById('contador-no-leidas').textContent = total;
      actualizarContadorNotificaciones(total);
    } catch (e) {
      // No crítico
    }
  }

  async function cargar() {
    lista.innerHTML = '<li class="tabla-estado">Cargando notificaciones…</li>';
    try {
      const respuesta = await api.get('/notificaciones' + queryString({ leida: filtroLeida, pagina }));
      notificaciones = respuesta.datos;
      dibujar();
      renderPaginacion(contPaginacion, respuesta, (p) => {
        pagina = p;
        cargar();
      });
      actualizarContadores();
    } catch (error) {
      lista.innerHTML = `<li class="tabla-estado">${escapar(error.message)}</li>`;
    }
  }

  async function marcarLeida(id) {
    try {
      await api.patch(`/notificaciones/${id}/leida`);
      const n = notificaciones.find((x) => x.id === id);
      if (n) n.leida = true;
      if (filtroLeida === 'false') notificaciones = notificaciones.filter((x) => x.id !== id);
      dibujar();
      actualizarContadores();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  // ---------- Eventos ----------
  document.querySelectorAll('.pestana').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.pestana').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      filtroLeida = b.dataset.filtro;
      pagina = 1;
      cargar();
    })
  );

  document.getElementById('btn-leer-todas').addEventListener('click', async () => {
    try {
      const { actualizadas } = await api.patch('/notificaciones/leer-todas');
      toast(actualizadas ? `${actualizadas} notificación(es) marcadas como leídas` : 'No había notificaciones sin leer', 'exito');
      cargar();
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  lista.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-leer]');
    if (boton) marcarLeida(Number(boton.dataset.leer));
  });

  // ---------- Tiempo real ----------
  const socket = conectarSocket();
  if (socket) {
    socket.on('notificacion:nueva', (n) => {
      toast(n.mensaje || 'Nueva notificación');
      if (pagina === 1) cargar();
      else actualizarContadores();
    });
  }

  cargar();
})();
