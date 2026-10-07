// =====================================================================
// Guardia > Monitor en vivo
//  - La captura de la cámara siempre está visible, con zoom.
//  - Las detecciones llegan en tiempo real (Socket.io: "acceso:nuevo").
//  - Un acceso denegado genera una alerta: el guardia la autoriza (detalle obligatorio) o la rechaza.
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['guardia'], activo: 'monitor', titulo: 'Monitor en vivo' });
  if (!usuario) return;

  const MAX_RECIENTES = 15;
  const imagen = document.getElementById('captura-imagen');
  const contenedorCaptura = document.getElementById('captura');
  const zoom = document.getElementById('zoom');
  const filtroCamara = document.getElementById('filtro-camara');
  const listaDetecciones = document.getElementById('lista-detecciones');

  let recientes = [];
  let seleccionado = null; // acceso que se muestra en grande

  // ---------- Zoom de la captura ----------
  function aplicarZoom() {
    imagen.style.transform = 'scale(' + zoom.value + ')';
    document.getElementById('zoom-valor').textContent = zoom.value + 'x';
  }
  zoom.addEventListener('input', aplicarZoom);
  contenedorCaptura.addEventListener('click', (e) => {
    const caja = contenedorCaptura.getBoundingClientRect();
    imagen.style.transformOrigin =
      `${((e.clientX - caja.left) / caja.width) * 100}% ${((e.clientY - caja.top) / caja.height) * 100}%`;
    if (zoom.value === '1') {
      zoom.value = '2.5';
      aplicarZoom();
    }
  });

  // ---------- Detección seleccionada ----------
  function asociadoA(a) {
    if (a.nombre_visitante) {
      return `Visita de <strong>${escapar(a.nombre_visitante)}</strong>${a.propietario_nombre ? ' · invitada por ' + escapar(a.propietario_nombre) : ''}${a.unidad ? ' (' + escapar(a.unidad) + ')' : ''}`;
    }
    if (a.propietario_nombre) {
      const vehiculo = [a.vehiculo_marca, a.vehiculo_modelo, a.vehiculo_color].filter(Boolean).join(' ');
      return `<strong>${escapar(a.propietario_nombre)}</strong>${a.unidad ? ' · ' + escapar(a.unidad) : ''}${vehiculo ? '<br><span class="texto-suave">' + escapar(vehiculo) + '</span>' : ''}`;
    }
    return '<span class="texto-suave">Patente no registrada en el recinto</span>';
  }

  function mostrar(a) {
    seleccionado = a;
    document.getElementById('captura-titulo').textContent = `${a.camara_nombre} · ${a.sentido === 'entrada' ? 'Entrada' : 'Salida'}`;

    if (a.imagen_url) {
      imagen.src = a.imagen_url;
      imagen.alt = 'Captura del vehículo ' + a.patente_detectada;
      imagen.classList.remove('oculto');
      document.getElementById('captura-vacia').classList.add('oculto');
    } else {
      imagen.classList.add('oculto');
      const vacia = document.getElementById('captura-vacia');
      vacia.classList.remove('oculto');
      vacia.innerHTML = '<strong>Sin captura</strong><span>El equipo no envió imagen para esta detección.</span>';
    }

    // HU-31: un acceso denegado tiene una alerta; si está pendiente, el guardia decide
    const pendiente = a.alerta_estado === 'pendiente';
    const motivo = a.alerta_detalle || a.detalle_autorizacion;
    document.getElementById('deteccion-actual').innerHTML = `
      <div class="deteccion-cabecera${pendiente ? ' alerta-denegado' : ''}">
        <span class="patente-grande">${escapar(a.patente_detectada)}</span>
        ${badge(a.resultado)}
        <span class="texto-suave">${escapar(formatearHora(a.fecha_hora))} · ${escapar(tiempoRelativo(a.fecha_hora))}</span>
      </div>
      <dl class="detalle-lista">
        <dt>Asociado a</dt><dd>${asociadoA(a)}</dd>
        <dt>Confianza OCR</dt><dd>${a.confianza_ocr != null ? escapar(Number(a.confianza_ocr).toFixed(1)) + ' %' : '—'}</dd>
        ${a.alerta_id ? `<dt>Alerta</dt><dd><strong>${escapar(estadoAlerta(a))}</strong></dd>` : ''}
        ${motivo ? `<dt>Motivo</dt><dd>${escapar(motivo)}</dd>` : ''}
      </dl>
      ${pendiente ? `<div class="acciones-alerta">
          <button type="button" class="btn btn-primario" id="btn-autorizar">Autorizar ingreso</button>
          <button type="button" class="btn btn-peligro" id="btn-rechazar">Rechazar ingreso</button>
        </div>` : ''}`;

    if (pendiente) {
      document.getElementById('btn-autorizar').addEventListener('click', () => abrirAutorizacion(a, actualizar));
      document.getElementById('btn-rechazar').addEventListener('click', () => abrirRechazo(a, actualizar));
    }
    dibujarRecientes();
  }

  // ---------- Lista de recientes ----------
  function visibles() {
    const camara = Number(filtroCamara.value);
    return camara ? recientes.filter((a) => a.camara_id === camara) : recientes;
  }

  function dibujarRecientes() {
    const lista = visibles();
    if (lista.length === 0) {
      listaDetecciones.innerHTML = '<li class="texto-suave">Sin detecciones recientes.</li>';
      return;
    }
    listaDetecciones.innerHTML = lista
      .map(
        (a) => `
        <li>
          <button type="button" class="deteccion-item${seleccionado && seleccionado.id === a.id ? ' seleccionado' : ''}" data-id="${a.id}">
            ${patenteChip(a.patente_detectada)}
            ${badge(a.resultado)}
            ${a.alerta_estado === 'pendiente' ? '<span class="pendiente-marca" title="Alerta pendiente">Pendiente</span>' : ''}
            <span class="hora">${escapar(formatearHora(a.fecha_hora))}</span>
          </button>
        </li>`
      )
      .join('');
  }

  // Reemplaza un acceso modificado (ej. después de autorizarlo)
  function actualizar(acceso) {
    recientes = recientes.map((a) => (a.id === acceso.id ? acceso : a));
    if (seleccionado && seleccionado.id === acceso.id) mostrar(acceso);
    else dibujarRecientes();
  }

  // ---------- Visitas de hoy ----------
  async function cargarVisitas() {
    const lista = document.getElementById('lista-visitas');
    try {
      const { datos } = await api.get('/visitas?vigencia=hoy&limite=50');
      lista.innerHTML = datos.length
        ? datos
            .map(
              (v) => `<li><span><span class="principal">${escapar(v.nombre_visitante)}</span>
                <span class="secundario">${escapar(v.unidad || '')} · ${escapar(formatearHora(v.fecha_inicio))}–${escapar(formatearHora(v.fecha_fin))}</span></span>
                ${v.patente ? patenteChip(v.patente) : '<span class="texto-suave">A pie</span>'}</li>`
            )
            .join('')
        : '<li class="texto-suave">No hay visitas programadas para hoy.</li>';
    } catch (error) {
      lista.innerHTML = `<li class="texto-suave">${escapar(error.message)}</li>`;
    }
  }

  // ---------- Carga inicial ----------
  async function cargar() {
    try {
      const [camaras, accesos] = await Promise.all([api.get('/camaras'), api.get(`/accesos?limite=${MAX_RECIENTES}`)]);
      filtroCamara.innerHTML =
        '<option value="">Todas las cámaras</option>' + camaras.map((c) => `<option value="${c.id}">${escapar(c.nombre)}</option>`).join('');
      recientes = accesos.datos;
      if (recientes.length > 0) mostrar(recientes[0]);
      else dibujarRecientes();
    } catch (error) {
      toast('No se pudo cargar el monitor: ' + error.message, 'error');
      dibujarRecientes();
    }
    cargarVisitas();
  }

  // ---------- Eventos ----------
  filtroCamara.addEventListener('change', () => {
    const lista = visibles();
    if (lista.length > 0 && (!seleccionado || !lista.includes(seleccionado))) mostrar(lista[0]);
    else dibujarRecientes();
  });

  listaDetecciones.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-id]');
    if (boton) mostrar(recientes.find((a) => a.id === Number(boton.dataset.id)));
  });

  // ---------- Tiempo real ----------
  const socket = conectarSocket();
  if (socket) {
    socket.on('acceso:nuevo', (acceso) => {
      recientes = [acceso, ...recientes].slice(0, MAX_RECIENTES);
      const camara = Number(filtroCamara.value);
      // No se cambia la vista si el guardia está escribiendo una autorización
      const autorizando = Boolean(document.querySelector('.modal-fondo'));
      if ((!camara || acceso.camara_id === camara) && !autorizando) mostrar(acceso);
      else dibujarRecientes();
      if (acceso.resultado === 'denegado') toast(`Patente ${acceso.patente_detectada} NO autorizada`, 'error');
    });
    socket.on('acceso:actualizado', actualizar);
    // Si cambian vehículos o visitas, se refresca la lista de visitas
    socket.on('vehiculo:cambio', cargarVisitas);
  }

  cargar();
  // Las visitas cambian de estado con la hora: se refrescan cada 5 minutos
  setInterval(cargarVisitas, 5 * 60 * 1000);
})();
