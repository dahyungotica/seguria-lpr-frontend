// =====================================================================
// Admin de recinto > Panel: resumen del día, últimos 7 días,
// últimas detecciones (tiempo real) y estado de equipos
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['admin_recinto'], activo: 'panel', titulo: 'Panel' });
  if (!usuario) return;

  const tablaUltimos = document.getElementById('tabla-ultimos');
  let ultimos = [];

  // ---------- Indicadores de hoy ----------
  // El color acompaña a la etiqueta (nunca la reemplaza)
  const INDICADORES = [
    ['autorizado', 'Autorizados', 'var(--color-exito)'],
    ['visita', 'Visitas', 'var(--color-primario)'],
    ['autorizado_manual', 'Autorizados manualmente', 'var(--color-alerta)'],
    ['denegado', 'Denegados', 'var(--color-peligro)'],
  ];

  function dibujarIndicadores(hoy) {
    document.getElementById('indicadores-hoy').innerHTML =
      `<div class="indicador destacado">
         <div class="indicador-etiqueta">Accesos de hoy</div>
         <div class="indicador-valor">${formatearNumero(hoy.total)}</div>
         <div class="indicador-nota">Desde las 00:00</div>
       </div>` +
      INDICADORES.map(
        ([clave, etiqueta, color]) => `
        <div class="indicador">
          <div class="indicador-etiqueta"><span class="punto" style="background:${color}"></span>${etiqueta}</div>
          <div class="indicador-valor">${formatearNumero(hoy[clave])}</div>
        </div>`
      ).join('');
  }

  // ---------- Gráfico de columnas: una sola serie, sin leyenda ----------
  function dibujarGrafico(dias) {
    const maximo = Math.max(1, ...dias.map((d) => d.total));
    const indiceMax = dias.findIndex((d) => d.total === maximo);
    const nombreDia = (fecha) =>
      new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' });

    const columnas = dias
      .map((d, i) => {
        const alto = Math.round((d.total / maximo) * 100);
        // Etiqueta directa solo en el máximo y en hoy (no en cada columna)
        const mostrarValor = (i === indiceMax && d.total > 0) || i === dias.length - 1;
        const texto = `${nombreDia(d.fecha)}: ${formatearNumero(d.total)} acceso${d.total === 1 ? '' : 's'}`;
        return `
          <div class="grafico-columna">
            <span class="grafico-tooltip">${escapar(texto)}</span>
            ${mostrarValor ? `<span class="valor">${formatearNumero(d.total)}</span>` : ''}
            <div class="barra" style="height:${alto}%"></div>
          </div>`;
      })
      .join('');

    const etiquetas = dias
      .map((d, i) => `<span>${i === dias.length - 1 ? 'Hoy' : escapar(nombreDia(d.fecha))}</span>`)
      .join('');

    // Tabla equivalente para lectores de pantalla
    const tablaAccesible = `<table class="sr-only"><caption>Accesos por día</caption>
      <tr><th>Día</th><th>Accesos</th></tr>
      ${dias.map((d) => `<tr><td>${escapar(d.fecha)}</td><td>${d.total}</td></tr>`).join('')}</table>`;

    document.getElementById('grafico-dias').innerHTML =
      `<div class="grafico-columnas" aria-hidden="true">${columnas}</div>
       <div class="grafico-etiquetas" aria-hidden="true">${etiquetas}</div>${tablaAccesible}`;
  }

  function dibujarResumen(resumen) {
    const filas = [
      ['Propietarios activos', resumen.propietarios, 'propietarios.html'],
      ['Vehículos autorizados', resumen.vehiculos, 'propietarios.html'],
      ['Visitas vigentes ahora', resumen.visitas_vigentes, null],
      ['Guardias activos', resumen.guardias, 'propietarios.html#guardias'],
      ['Alertas sin atender', resumen.alertas_pendientes, 'historial.html'],
    ];
    document.getElementById('resumen-recinto').innerHTML = filas
      .map(
        ([texto, valor, enlace]) =>
          `<li><span>${enlace ? `<a href="${enlace}">${texto}</a>` : texto}</span><strong>${formatearNumero(valor)}</strong></li>`
      )
      .join('');
  }

  // ---------- Últimas detecciones ----------
  function asociadoA(a) {
    if (a.propietario_nombre) {
      return escapar(a.propietario_nombre) + (a.unidad ? `<span class="secundario">${escapar(a.unidad)}</span>` : '');
    }
    if (a.nombre_visitante) return 'Visita: ' + escapar(a.nombre_visitante);
    return '<span class="texto-suave">No registrado</span>';
  }

  function dibujarUltimos() {
    if (ultimos.length === 0) {
      filaEstado(tablaUltimos, 4, 'Aún no hay detecciones.');
      return;
    }
    tablaUltimos.innerHTML = ultimos
      .map(
        (a) => `
        <tr>
          <td class="sin-salto" title="${escapar(formatearFecha(a.fecha_hora))}">${escapar(
            new Date(a.fecha_hora).toLocaleTimeString('es-CL', { timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit' })
          )}<span class="secundario">${escapar(tiempoRelativo(a.fecha_hora))}</span></td>
          <td>${patenteChip(a.patente_detectada)}</td>
          <td>${badge(a.resultado)}</td>
          <td>${asociadoA(a)}</td>
        </tr>`
      )
      .join('');
  }

  // ---------- Equipos ----------
  function dibujarEquipos(camaras, dispositivos) {
    const items = [
      ...dispositivos.map(
        (d) => `<li><span><span class="principal">${escapar(d.nombre)}</span>
          <span class="secundario">Raspberry Pi · ${
            d.ultimo_heartbeat ? 'última señal ' + escapar(tiempoRelativo(d.ultimo_heartbeat)) : 'sin señal registrada'
          }</span></span>${badge(d.estado)}</li>`
      ),
      ...camaras.map(
        (c) => `<li><span><span class="principal">${escapar(c.nombre)}</span>
          <span class="secundario">Cámara de ${escapar(c.sentido)}${c.ubicacion ? ' · ' + escapar(c.ubicacion) : ''}</span></span>${badge(c.estado)}</li>`
      ),
    ];
    document.getElementById('estado-equipos').innerHTML =
      items.join('') || '<li class="texto-suave">No hay cámaras ni equipos registrados.</li>';
  }

  // ---------- Carga ----------
  async function cargar() {
    filaEstado(tablaUltimos, 4, 'Cargando…');
    try {
      const [recinto, estadisticas, accesos, camaras, dispositivos] = await Promise.all([
        api.get('/recintos/' + usuario.recinto_id),
        api.get('/accesos/estadisticas'),
        api.get('/accesos?limite=8'),
        api.get('/camaras'),
        api.get('/dispositivos'),
      ]);
      document.getElementById('recinto-nombre').textContent =
        recinto.nombre + (recinto.comuna ? ' · ' + recinto.comuna : '');
      dibujarIndicadores(estadisticas.hoy);
      dibujarGrafico(estadisticas.ultimos_dias);
      dibujarResumen(estadisticas.resumen);
      ultimos = accesos.datos;
      dibujarUltimos();
      dibujarEquipos(camaras, dispositivos);
    } catch (error) {
      filaEstado(tablaUltimos, 4, error.message);
      toast('No se pudo cargar el panel: ' + error.message, 'error');
    }
  }

  // ---------- Tiempo real ----------
  const socket = conectarSocket();
  if (socket) {
    // Nueva detección: se agrega arriba y se recalculan los indicadores
    socket.on('acceso:nuevo', (acceso) => {
      ultimos = [acceso, ...ultimos].slice(0, 8);
      dibujarUltimos();
      api.get('/accesos/estadisticas').then((e) => {
        dibujarIndicadores(e.hoy);
        dibujarGrafico(e.ultimos_dias);
      }).catch(() => {});
    });
    // Un guardia autorizó manualmente un acceso
    socket.on('acceso:actualizado', (acceso) => {
      ultimos = ultimos.map((a) => (a.id === acceso.id ? acceso : a));
      dibujarUltimos();
      api.get('/accesos/estadisticas').then((e) => dibujarIndicadores(e.hoy)).catch(() => {});
    });
    socket.on('notificacion:nueva', (n) => {
      toast(n.mensaje || 'Nueva notificación');
      cargarContadorNotificaciones();
    });
  }

  cargar();
})();
