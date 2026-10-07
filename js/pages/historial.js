// =====================================================================
// Historial de accesos (compartido por los cuatro roles)
// La página indica su rol en <body data-rol="..." data-activo="...">:
//   - admin_plataforma: accesos de todos los recintos, con filtro por recinto (HU-23)
//   - admin_recinto:    todo su recinto
//   - guardia:          todo su recinto + atender alertas pendientes (autorizar o rechazar, HU-31)
//   - propietario:      solo los accesos de sus vehículos y visitas
// Requiere: autorizacion.js (estadoAlerta, abrirAutorizacion, abrirRechazo)
// =====================================================================
(function () {
  const rolPagina = document.body.dataset.rol;
  const titulo = rolPagina === 'admin_plataforma' ? 'Accesos de los recintos' : 'Historial de accesos';
  const usuario = iniciarPagina({ roles: [rolPagina], activo: document.body.dataset.activo || 'historial', titulo });
  if (!usuario) return;

  const esPropietario = usuario.rol === 'propietario';
  const esGuardia = usuario.rol === 'guardia';
  const esPlataforma = usuario.rol === 'admin_plataforma';
  const COLUMNAS = 7;
  const form = document.getElementById('form-filtros');
  const tbody = document.getElementById('tabla-accesos');
  const contPaginacion = document.getElementById('paginacion');
  let accesos = [];
  let pagina = 1;

  function ocultarFiltro(id) {
    const campo = document.getElementById(id);
    if (campo) campo.closest('.campo').classList.add('oculto');
  }

  async function cargarOpcionesFiltros() {
    // Cámaras: solo dentro de un recinto. Alertas: no aplican al propietario.
    if (esPropietario || esPlataforma) ocultarFiltro('filtro-camara');
    if (esPropietario) ocultarFiltro('filtro-alerta');
    if (!esPlataforma) ocultarFiltro('filtro-recinto');
    try {
      if (esPlataforma) {
        const recintos = await api.get('/recintos');
        document.getElementById('filtro-recinto').innerHTML =
          '<option value="">Todos</option>' + recintos.map((r) => `<option value="${r.id}">${escapar(r.nombre)}</option>`).join('');
      } else if (!esPropietario) {
        const camaras = await api.get('/camaras');
        document.getElementById('filtro-camara').innerHTML =
          '<option value="">Todas</option>' + camaras.map((c) => `<option value="${c.id}">${escapar(c.nombre)}</option>`).join('');
      }
    } catch (e) {
      // Los filtros quedan con su opción "Todos"
    }
  }

  function filtros() {
    const datos = Object.fromEntries(new FormData(form).entries());
    datos.patente = (datos.patente || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return datos;
  }

  async function cargar() {
    filaEstado(tbody, COLUMNAS, 'Cargando historial…');
    try {
      const respuesta = await api.get('/accesos' + queryString({ ...filtros(), pagina }));
      accesos = respuesta.datos;
      dibujar();
      renderPaginacion(contPaginacion, respuesta, (p) => {
        pagina = p;
        cargar();
      });
    } catch (error) {
      filaEstado(tbody, COLUMNAS, error.message);
      contPaginacion.innerHTML = '';
    }
  }

  function asociadoA(a) {
    if (a.propietario_nombre) {
      const quien = escapar(a.propietario_nombre) + (a.unidad ? `<span class="secundario">${escapar(a.unidad)}</span>` : '');
      return a.nombre_visitante ? `Visita: ${escapar(a.nombre_visitante)}<span class="secundario">de ${quien}</span>` : quien;
    }
    return '<span class="texto-suave">No registrado</span>';
  }

  function miniatura(a) {
    return a.imagen_url
      ? `<img class="miniatura" src="${escapar(a.imagen_url)}" alt="Captura de ${escapar(a.patente_detectada)}" loading="lazy" />`
      : '<span class="sin-captura">Sin imagen</span>';
  }

  // Resultado + gestión de la alerta (si la hay)
  function resultado(a) {
    const gestion = estadoAlerta(a);
    const clase = a.alerta_estado === 'pendiente' ? ' alerta-pendiente' : '';
    return badge(a.resultado) + (gestion ? `<span class="secundario${clase}">${escapar(gestion)}</span>` : '');
  }

  function dibujar() {
    if (accesos.length === 0) {
      filaEstado(tbody, COLUMNAS, 'No hay accesos para los filtros seleccionados.');
      return;
    }
    tbody.innerHTML = accesos
      .map(
        (a) => `
        <tr class="fila-clic" data-id="${a.id}" tabindex="0" aria-label="Ver detalle del acceso de ${escapar(a.patente_detectada)}">
          <td>${escapar(formatearFecha(a.fecha_hora))}</td>
          <td>${miniatura(a)}</td>
          <td>${patenteChip(a.patente_detectada)}</td>
          <td>${resultado(a)}</td>
          <td>${asociadoA(a)}</td>
          <td>${escapar(a.camara_nombre)}<span class="secundario">${esPlataforma ? escapar(a.recinto_nombre) : a.sentido === 'entrada' ? 'Entrada' : 'Salida'}</span></td>
          <td class="num">${a.confianza_ocr != null ? escapar(Number(a.confianza_ocr).toFixed(1)) + ' %' : '—'}</td>
        </tr>`
      )
      .join('');
  }

  function verDetalle(a) {
    const vehiculo = [a.vehiculo_marca, a.vehiculo_modelo, a.vehiculo_color].filter(Boolean).join(' ');
    const filas = [
      esPlataforma && ['Recinto', escapar(a.recinto_nombre)],
      ['Fecha y hora', escapar(formatearFecha(a.fecha_hora))],
      ['Patente', patenteChip(a.patente_detectada)],
      ['Resultado', badge(a.resultado)],
      ['Cámara', `${escapar(a.camara_nombre)} (${a.sentido})`],
      ['Confianza OCR', a.confianza_ocr != null ? escapar(Number(a.confianza_ocr).toFixed(1)) + ' %' : '—'],
      a.propietario_nombre && ['Propietario', escapar(a.propietario_nombre) + (a.unidad ? ' · ' + escapar(a.unidad) : '')],
      vehiculo && ['Vehículo', escapar(vehiculo)],
      a.nombre_visitante && ['Visitante', escapar(a.nombre_visitante)],
      a.alerta_id && ['Alerta', escapar(estadoAlerta(a)) + (a.alerta_atendida_at ? ` <span class="texto-suave">(${escapar(formatearFecha(a.alerta_atendida_at))})</span>` : '')],
    ].filter(Boolean);

    const captura = a.imagen_url
      ? `<div class="captura-detalle" id="captura" title="Clic para ampliar"><img src="${escapar(a.imagen_url)}" alt="Captura del vehículo ${escapar(a.patente_detectada)}" /></div>`
      : '<div class="captura-detalle"><div class="placeholder">Este acceso no tiene captura (o se eliminó al cumplir 60 días)</div></div>';

    const pendiente = esGuardia && a.alerta_estado === 'pendiente';
    const motivo = a.alerta_detalle || a.detalle_autorizacion;

    const modal = abrirModal({
      titulo: 'Detalle del acceso',
      ancho: true,
      cuerpo: `${captura}
        <dl class="detalle-lista">${filas.map(([t, v]) => `<dt>${t}</dt><dd>${v}</dd>`).join('')}</dl>
        ${motivo ? `<div class="alerta alerta-aviso" style="margin-top:1rem"><strong>Motivo indicado por el guardia:</strong><br>${escapar(motivo)}</div>` : ''}
        ${pendiente ? `<div class="acciones-alerta">
            <button type="button" class="btn btn-primario" id="btn-autorizar">Autorizar ingreso</button>
            <button type="button" class="btn btn-peligro" id="btn-rechazar">Rechazar ingreso</button></div>` : ''}`,
    });

    // Zoom: clic para ampliar, centrado en el punto donde se hizo clic
    const contenedor = modal.elemento.querySelector('#captura');
    if (contenedor) {
      contenedor.addEventListener('click', (e) => {
        const caja = contenedor.getBoundingClientRect();
        contenedor.querySelector('img').style.transformOrigin =
          `${((e.clientX - caja.left) / caja.width) * 100}% ${((e.clientY - caja.top) / caja.height) * 100}%`;
        contenedor.classList.toggle('ampliada');
      });
    }

    if (pendiente) {
      modal.elemento.querySelector('#btn-autorizar').addEventListener('click', () => {
        modal.cerrar();
        abrirAutorizacion(a, () => cargar());
      });
      modal.elemento.querySelector('#btn-rechazar').addEventListener('click', () => {
        modal.cerrar();
        abrirRechazo(a, () => cargar());
      });
    }
  }

  // ---------- Eventos ----------
  const filtrar = () => {
    pagina = 1;
    cargar();
  };
  form.addEventListener('change', (e) => {
    if (e.target.id !== 'filtro-patente') filtrar();
  });
  document.getElementById('filtro-patente').addEventListener('input', conRetraso(filtrar));
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('reset', () => setTimeout(filtrar, 0));

  function abrirDesde(e) {
    const fila = e.target.closest('tr[data-id]');
    if (fila) verDetalle(accesos.find((a) => a.id === Number(fila.dataset.id)));
  }
  tbody.addEventListener('click', abrirDesde);
  tbody.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirDesde(e);
    }
  });

  // Por defecto: últimos 7 días
  document.getElementById('filtro-desde').value = fechaHoyISO(-6);
  document.getElementById('filtro-hasta').value = fechaHoyISO();
  form.querySelectorAll('input[type=date]').forEach((i) => (i.defaultValue = i.value));

  cargarOpcionesFiltros();
  cargar();
})();
