// =====================================================================
// Propietario > Mis visitas: programar, editar y cancelar visitas
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['propietario'], activo: 'visitas', titulo: 'Mis visitas' });
  if (!usuario) return;

  const COLUMNAS = 6;
  const tbody = document.getElementById('tabla-visitas');
  const contPaginacion = document.getElementById('paginacion');
  let vigencia = 'proximas';
  let visitas = [];
  let pagina = 1;

  // "06-10-2026 18:00 – 22:00" o, si cruza días, ambas fechas completas
  function horario(v) {
    const mismoDia = formatearFecha(v.fecha_inicio, { conHora: false }) === formatearFecha(v.fecha_fin, { conHora: false });
    return mismoDia
      ? `${formatearFecha(v.fecha_inicio, { conHora: false })}<span class="secundario">${formatearHora(v.fecha_inicio)} – ${formatearHora(v.fecha_fin)}</span>`
      : `${formatearFecha(v.fecha_inicio)}<span class="secundario">hasta ${formatearFecha(v.fecha_fin)}</span>`;
  }

  async function cargar() {
    filaEstado(tbody, COLUMNAS, 'Cargando visitas…');
    try {
      const respuesta = await api.get('/visitas' + queryString({ vigencia, pagina }));
      visitas = respuesta.datos;
      dibujar();
      renderPaginacion(contPaginacion, respuesta, (p) => {
        pagina = p;
        cargar();
      });
    } catch (error) {
      filaEstado(tbody, COLUMNAS, error.message);
    }
  }

  function dibujar() {
    if (visitas.length === 0) {
      filaEstado(tbody, COLUMNAS, vigencia === 'proximas' ? 'No tienes visitas programadas.' : 'No hay visitas anteriores.');
      return;
    }
    tbody.innerHTML = visitas
      .map((v) => {
        const editable = ['programada', 'activa'].includes(v.estado_actual);
        return `
        <tr>
          <td><span class="principal">${escapar(v.nombre_visitante)}</span>
              <span class="secundario">${v.rut_visitante ? escapar(formatearRut(v.rut_visitante)) : ''}</span></td>
          <td>${v.patente ? patenteChip(v.patente) : '<span class="texto-suave">A pie</span>'}</td>
          <td>${horario(v)}</td>
          <td>${escapar(v.motivo || '—')}</td>
          <td>${badgeVisita(v.estado_actual)}</td>
          <td class="acciones">${
            editable
              ? `<button type="button" class="btn-texto" data-editar="${v.id}">Editar</button>
                 <button type="button" class="btn-texto peligro" data-cancelar="${v.id}">Cancelar</button>`
              : ''
          }</td>
        </tr>`;
      })
      .join('');
  }

  function abrirFormulario(v) {
    const edicion = Boolean(v);
    // Por defecto: desde este minuto (para que pueda entrar de inmediato) por 4 horas
    const inicio = edicion ? new Date(v.fecha_inicio) : new Date(Math.floor(Date.now() / 60000) * 60000);
    const fin = edicion ? new Date(v.fecha_fin) : new Date(inicio.getTime() + 4 * 3600000);

    abrirModal({
      titulo: edicion ? 'Editar visita' : 'Programar visita',
      cuerpo: `<div class="form-grid">
        ${campoHtml({ nombre: 'nombre_visitante', etiqueta: 'Nombre del visitante', valor: v && v.nombre_visitante, requerido: true, completo: true, atributos: 'maxlength="120"' })}
        ${campoHtml({ nombre: 'rut_visitante', etiqueta: 'RUT del visitante', valor: v && v.rut_visitante ? formatearRut(v.rut_visitante) : '', atributos: 'maxlength="12" placeholder="12.345.678-9"' })}
        ${campoHtml({ nombre: 'patente', etiqueta: 'Patente del vehículo', valor: v && v.patente, ayuda: 'Déjala vacía si viene a pie.', atributos: 'maxlength="8" style="text-transform:uppercase" autocomplete="off"' })}
        ${campoHtml({ nombre: 'fecha_inicio', etiqueta: 'Desde', tipo: 'datetime-local', valor: fechaParaInput(inicio), requerido: true })}
        ${campoHtml({ nombre: 'fecha_fin', etiqueta: 'Hasta', tipo: 'datetime-local', valor: fechaParaInput(fin), requerido: true })}
        ${campoHtml({ nombre: 'motivo', etiqueta: 'Motivo', valor: v && v.motivo, completo: true, atributos: 'maxlength="200" placeholder="Ej: Visita familiar, técnico de internet"' })}
      </div>
      <div class="alerta alerta-info">La visita puede durar como máximo 30 días.</div>`,
      textoEnviar: edicion ? 'Guardar cambios' : 'Programar visita',
      alEnviar: async (datos) => {
        datos.fecha_inicio = fechaDesdeInput(datos.fecha_inicio);
        datos.fecha_fin = fechaDesdeInput(datos.fecha_fin);
        if (datos.patente) datos.patente = datos.patente.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (edicion) await api.put('/visitas/' + v.id, datos);
        else await api.post('/visitas', datos);
        toast(edicion ? 'Visita actualizada' : 'Visita programada', 'exito');
        cargar();
      },
    });
  }

  async function cancelar(v) {
    const ok = await confirmar({
      titulo: 'Cancelar visita',
      mensaje: `¿Cancelar la visita de ${v.nombre_visitante}?${v.patente ? ` La patente ${v.patente} dejará de estar autorizada.` : ''}`,
      textoConfirmar: 'Cancelar visita',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/visitas/${v.id}/cancelar`);
      toast('Visita cancelada', 'exito');
      cargar();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  // ---------- Eventos ----------
  document.getElementById('btn-nueva').addEventListener('click', () => abrirFormulario());

  document.querySelectorAll('.pestana').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.pestana').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      vigencia = b.dataset.vigencia;
      pagina = 1;
      cargar();
    })
  );

  tbody.addEventListener('click', (e) => {
    const boton = e.target.closest('button');
    if (!boton) return;
    const v = visitas.find((x) => x.id === Number(boton.dataset.editar || boton.dataset.cancelar));
    if (boton.dataset.editar) abrirFormulario(v);
    else if (boton.dataset.cancelar) cancelar(v);
  });

  cargar();
})();
