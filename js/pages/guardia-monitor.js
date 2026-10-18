// =====================================================================
// Guardia > Monitor
//  - Las detecciones llegan en tiempo real (Socket.io: "acceso:nuevo") y su captura se puede ampliar con zoom.
//  - Autorizado o visita: la captura se muestra 45 segundos y el monitor vuelve a quedar en espera.
//  - Denegado: genera una alerta y la captura queda en pantalla hasta que el guardia la autoriza
//    (detalle obligatorio) o la rechaza; después pasa a la siguiente alerta pendiente o queda en espera.
//  - Desde otra sección se llega con ?acceso=<id> para atender esa detección.
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['guardia'], activo: 'monitor', titulo: 'Monitor' });
  if (!usuario) return;

  const MAX_RECIENTES = 15;
  const ESPERA_MS = 45 * 1000; // tiempo en pantalla de un acceso permitido
  const imagen = document.getElementById('captura-imagen');
  const vacia = document.getElementById('captura-vacia');
  const contenedorCaptura = document.getElementById('captura');
  const zoom = document.getElementById('zoom');
  const filtroCamara = document.getElementById('filtro-camara');
  const listaDetecciones = document.getElementById('lista-detecciones');

  let recientes = [];
  let camaras = [];
  let seleccionado = null; // acceso que se muestra en grande (null = en espera)
  let temporizadorEspera = null;

  const esPendiente = (a) => a.alerta_estado === 'pendiente';

  // ---------- Zoom de la captura ----------
  function aplicarZoom() {
    imagen.style.transform = 'scale(' + zoom.value + ')';
    document.getElementById('zoom-valor').textContent = zoom.value + 'x';
  }
  zoom.addEventListener('input', aplicarZoom);
  contenedorCaptura.addEventListener('click', (e) => {
    if (!seleccionado) return;
    const caja = contenedorCaptura.getBoundingClientRect();
    imagen.style.transformOrigin =
      `${((e.clientX - caja.left) / caja.width) * 100}% ${((e.clientY - caja.top) / caja.height) * 100}%`;
    if (zoom.value === '1') {
      zoom.value = '2.5';
      aplicarZoom();
    }
  });

  function reiniciarZoom() {
    zoom.value = '1';
    imagen.style.transformOrigin = '';
    aplicarZoom();
  }

  // ---------- Cámaras (con su estado de señal) ----------
  function textoCamara(c) {
    return c.nombre + (estadoCamara(c) === 'sin_senal' ? ' (sin señal)' : '');
  }

  function dibujarCamaras() {
    const actual = filtroCamara.value;
    filtroCamara.innerHTML =
      '<option value="">Todas las cámaras</option>' +
      camaras.map((c) => `<option value="${c.id}">${escapar(textoCamara(c))}</option>`).join('');
    filtroCamara.value = actual;
  }

  // ---------- En espera: sin detección en curso ----------
  function enEspera() {
    clearTimeout(temporizadorEspera);
    seleccionado = null;
    const camara = camaras.find((c) => c.id === Number(filtroCamara.value));
    document.getElementById('captura-titulo').textContent = camara
      ? `${camara.nombre} · ${camara.sentido === 'entrada' ? 'Entrada' : 'Salida'}`
      : 'Captura de la cámara';
    imagen.classList.add('oculto');
    imagen.removeAttribute('src');
    reiniciarZoom();
    vacia.classList.remove('oculto');
    vacia.innerHTML = '<strong>Esperando detección…</strong><span>La próxima captura aparecerá aquí en tiempo real.</span>';
    document.getElementById('deteccion-actual').innerHTML =
      '<p class="texto-suave" style="margin:0">Sin detecciones en curso. Puedes revisar una de las detecciones recientes.</p>';
    dibujarRecientes();
  }

  // La siguiente alerta pendiente (la más reciente) o, si no hay, el monitor en espera
  function siguienteOEspera() {
    const pendiente = visibles().find(esPendiente);
    if (pendiente) mostrar(pendiente);
    else enEspera();
  }

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

  // "espera": milisegundos en pantalla de un acceso que no tiene alerta pendiente
  function mostrar(a, espera = ESPERA_MS) {
    const cambia = !seleccionado || seleccionado.id !== a.id;
    seleccionado = a;
    clearTimeout(temporizadorEspera);
    if (!esPendiente(a)) temporizadorEspera = setTimeout(enEspera, Math.max(espera, 0));

    document.getElementById('captura-titulo').textContent = `${a.camara_nombre} · ${a.sentido === 'entrada' ? 'Entrada' : 'Salida'}`;

    if (cambia) reiniciarZoom();
    if (a.imagen_url) {
      imagen.src = a.imagen_url;
      imagen.alt = 'Captura del vehículo ' + a.patente_detectada;
      imagen.classList.remove('oculto');
      vacia.classList.add('oculto');
    } else {
      imagen.classList.add('oculto');
      vacia.classList.remove('oculto');
      vacia.innerHTML = '<strong>Sin captura</strong><span>El equipo no envió imagen para esta detección.</span>';
    }

    // HU-31: un acceso denegado tiene una alerta; si está pendiente, el guardia decide
    const pendiente = esPendiente(a);
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
            ${esPendiente(a) ? '<span class="pendiente-marca" title="Alerta pendiente">Pendiente</span>' : ''}
            <span class="hora">${escapar(formatearHora(a.fecha_hora))}</span>
          </button>
        </li>`
      )
      .join('');
  }

  // Reemplaza un acceso modificado (ej. después de autorizarlo o rechazarlo, aquí o por otro guardia)
  function actualizar(acceso) {
    const anterior = recientes.find((a) => a.id === acceso.id);
    recientes = recientes.map((a) => (a.id === acceso.id ? acceso : a));
    if (!seleccionado || seleccionado.id !== acceso.id) return dibujarRecientes();
    // La alerta se atendió: ya no se muestra esa captura
    if (anterior && esPendiente(anterior) && !esPendiente(acceso)) siguienteOEspera();
    else mostrar(acceso);
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
  // Se abre la detección pedida (?acceso=id), si no la alerta pendiente más reciente,
  // si no el último acceso mientras no hayan pasado 45 segundos; en otro caso, en espera.
  async function seleccionInicial() {
    const parametros = new URLSearchParams(location.search);
    const pedido = Number(parametros.get('acceso'));
    if (pedido) {
      history.replaceState(null, '', location.pathname);
      let acceso = recientes.find((a) => a.id === pedido);
      if (!acceso) {
        try {
          acceso = await api.get('/accesos/' + pedido);
          recientes = [acceso, ...recientes].sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
        } catch (error) {
          toast('No se encontró la detección: ' + error.message, 'error');
        }
      }
      if (acceso) return mostrar(acceso);
    }
    const pendiente = recientes.find(esPendiente);
    if (pendiente) return mostrar(pendiente);
    const ultimo = recientes[0];
    const restante = ultimo ? ESPERA_MS - (Date.now() - new Date(ultimo.fecha_hora).getTime()) : 0;
    if (restante > 0) mostrar(ultimo, restante);
    else enEspera();
  }

  async function cargar() {
    try {
      const [listaCamaras, accesos] = await Promise.all([api.get('/camaras'), api.get(`/accesos?limite=${MAX_RECIENTES}`)]);
      camaras = listaCamaras;
      dibujarCamaras();
      recientes = accesos.datos;
      await seleccionInicial();
    } catch (error) {
      toast('No se pudo cargar el monitor: ' + error.message, 'error');
      enEspera();
    }
    cargarVisitas();
  }

  // ---------- Eventos ----------
  filtroCamara.addEventListener('change', () => {
    if (seleccionado && visibles().some((a) => a.id === seleccionado.id)) dibujarRecientes();
    else siguienteOEspera();
  });

  listaDetecciones.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-id]');
    if (boton) mostrar(recientes.find((a) => a.id === Number(boton.dataset.id)));
  });

  // Una Raspberry Pi se conectó o perdió la señal (el aviso en pantalla lo muestra layout.js)
  document.addEventListener('seguria:dispositivo', (e) => {
    const d = e.detail;
    camaras = camaras.map((c) => (c.dispositivo_id === d.id ? { ...c, dispositivo_estado: d.estado } : c));
    dibujarCamaras();
  });

  // ---------- Tiempo real ----------
  const socket = conectarSocket();
  if (socket) {
    socket.on('acceso:nuevo', (acceso) => {
      recientes = [acceso, ...recientes].slice(0, MAX_RECIENTES);
      const camara = Number(filtroCamara.value);
      // No se cambia la vista si el guardia está escribiendo una autorización,
      // ni se tapa una alerta pendiente con un acceso permitido (queda en la lista)
      const autorizando = Boolean(document.querySelector('.modal-fondo'));
      const tapaAlerta = seleccionado && esPendiente(seleccionado) && !esPendiente(acceso);
      if ((!camara || acceso.camara_id === camara) && !autorizando && !tapaAlerta) mostrar(acceso);
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
