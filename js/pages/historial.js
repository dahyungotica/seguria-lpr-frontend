// =====================================================================
// Historial de accesos (compartido por admin de recinto, guardia y propietario)
// La página indica su rol en <body data-rol="...">:
//   - admin_recinto: todo el recinto
//   - guardia:       todo el recinto + autorizar manualmente accesos denegados
//   - propietario:   solo los accesos de sus vehículos y visitas (sin filtro de cámara)
// =====================================================================
(function () {
  const rolPagina = document.body.dataset.rol;
  const usuario = iniciarPagina({ roles: [rolPagina], activo: 'historial', titulo: 'Historial de accesos' });
  if (!usuario) return;

  const esPropietario = usuario.rol === 'propietario';
  const esGuardia = usuario.rol === 'guardia';
  const COLUMNAS = 7;
  const form = document.getElementById('form-filtros');
  const tbody = document.getElementById('tabla-accesos');
  const contPaginacion = document.getElementById('paginacion');
  let accesos = [];
  let pagina = 1;

  async function cargarCamaras() {
    if (esPropietario) {
      document.getElementById('filtro-camara').closest('.campo').classList.add('oculto');
      return;
    }
    try {
      const camaras = await api.get('/camaras');
      document.getElementById('filtro-camara').innerHTML =
        '<option value="">Todas</option>' + camaras.map((c) => `<option value="${c.id}">${escapar(c.nombre)}</option>`).join('');
    } catch (e) {
      // El filtro por cámara queda solo con "Todas"
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
    if (a.resultado === 'autorizado_manual') return `<span class="secundario">Autorizó: ${escapar(a.guardia_nombre || '—')}</span>`;
    return '<span class="texto-suave">No registrado</span>';
  }

  function miniatura(a) {
    return a.imagen_url
      ? `<img class="miniatura" src="${escapar(a.imagen_url)}" alt="Captura de ${escapar(a.patente_detectada)}" loading="lazy" />`
      : '<span class="sin-captura">Sin imagen</span>';
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
          <td>${badge(a.resultado)}</td>
          <td>${asociadoA(a)}</td>
          <td>${escapar(a.camara_nombre)}<span class="secundario">${a.sentido === 'entrada' ? 'Entrada' : 'Salida'}</span></td>
          <td class="num">${a.confianza_ocr != null ? escapar(Number(a.confianza_ocr).toFixed(1)) + ' %' : '—'}</td>
        </tr>`
      )
      .join('');
  }

  function verDetalle(a) {
    const vehiculo = [a.vehiculo_marca, a.vehiculo_modelo, a.vehiculo_color].filter(Boolean).join(' ');
    const filas = [
      ['Fecha y hora', escapar(formatearFecha(a.fecha_hora))],
      ['Patente', patenteChip(a.patente_detectada)],
      ['Resultado', badge(a.resultado)],
      ['Cámara', `${escapar(a.camara_nombre)} (${a.sentido})`],
      ['Confianza OCR', a.confianza_ocr != null ? escapar(Number(a.confianza_ocr).toFixed(1)) + ' %' : '—'],
      a.propietario_nombre && ['Propietario', escapar(a.propietario_nombre) + (a.unidad ? ' · ' + escapar(a.unidad) : '')],
      vehiculo && ['Vehículo', escapar(vehiculo)],
      a.nombre_visitante && ['Visitante', escapar(a.nombre_visitante)],
      a.guardia_nombre && ['Autorizado por', escapar(a.guardia_nombre)],
    ].filter(Boolean);

    const captura = a.imagen_url
      ? `<div class="captura-detalle" id="captura" title="Clic para ampliar"><img src="${escapar(a.imagen_url)}" alt="Captura del vehículo ${escapar(a.patente_detectada)}" /></div>`
      : '<div class="captura-detalle"><div class="placeholder">Este acceso no tiene captura</div></div>';

    const puedeAutorizar = esGuardia && a.resultado === 'denegado';

    const modal = abrirModal({
      titulo: 'Detalle del acceso',
      ancho: true,
      cuerpo: `${captura}
        <dl class="detalle-lista">${filas.map(([t, v]) => `<dt>${t}</dt><dd>${v}</dd>`).join('')}</dl>
        ${
          a.detalle_autorizacion
            ? `<div class="alerta alerta-aviso" style="margin-top:1rem"><strong>Motivo de la autorización manual:</strong><br>${escapar(a.detalle_autorizacion)}</div>`
            : ''
        }
        ${puedeAutorizar ? '<button type="button" class="btn btn-primario" id="btn-autorizar" style="margin-top:1rem">Autorizar ingreso</button>' : ''}`,
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

    if (puedeAutorizar) {
      modal.elemento.querySelector('#btn-autorizar').addEventListener('click', () => {
        modal.cerrar();
        abrirAutorizacion(a, () => cargar());
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

  cargarCamaras();
  cargar();
})();
