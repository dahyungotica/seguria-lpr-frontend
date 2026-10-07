// =====================================================================
// Propietario > Mis visitas: programar, editar y cancelar visitas
// Los formularios están en js/formularios-propietario.js
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
          <td>${horarioVisita(v)}</td>
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

  // ---------- Eventos ----------
  document.getElementById('btn-nueva').addEventListener('click', () => abrirFormularioVisita({ alGuardar: cargar }));

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
    if (boton.dataset.editar) abrirFormularioVisita({ visita: v, alGuardar: cargar });
    else if (boton.dataset.cancelar) cancelarVisita(v, cargar);
  });

  cargar();
})();
