// =====================================================================
// Guardia > Propietarios (solo lectura)
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['guardia'], activo: 'propietarios', titulo: 'Propietarios' });
  if (!usuario) return;

  const COLUMNAS = 5;
  const tbody = document.getElementById('tabla-propietarios');
  const contPaginacion = document.getElementById('paginacion');
  const filtroBusqueda = document.getElementById('filtro-busqueda');
  let pagina = 1;

  function vehiculosHtml(vehiculos) {
    if (vehiculos.length === 0) return '<span class="texto-suave">Sin vehículos</span>';
    return vehiculos
      .map((v) => {
        const detalle = [v.marca, v.modelo, v.color].filter(Boolean).join(' ') + (v.activo ? '' : ' (inactivo, no autorizado)');
        return `<span title="${escapar(detalle)}">${patenteChip(v.patente, v.activo)}</span>`;
      })
      .join('');
  }

  async function cargar() {
    filaEstado(tbody, COLUMNAS, 'Cargando propietarios…');
    try {
      const respuesta = await api.get('/usuarios' + queryString({ rol: 'propietario', busqueda: filtroBusqueda.value.trim(), pagina }));
      if (respuesta.datos.length === 0) {
        filaEstado(tbody, COLUMNAS, filtroBusqueda.value ? 'No hay propietarios que coincidan con la búsqueda.' : 'Aún no hay propietarios registrados.');
      } else {
        tbody.innerHTML = respuesta.datos
          .map(
            (p) => `
            <tr class="${p.activo ? '' : 'inactivo'}">
              <td><span class="principal">${escapar(p.nombre + ' ' + p.apellido)}</span>
                  <span class="secundario">${escapar(formatearRut(p.rut))}</span></td>
              <td>${escapar(p.unidad || '—')}</td>
              <td>${p.telefono ? `<a href="tel:${escapar(p.telefono.replace(/\s/g, ''))}">${escapar(p.telefono)}</a>` : '—'}
                  <span class="secundario">${escapar(p.email)}</span></td>
              <td>${vehiculosHtml(p.vehiculos)}</td>
              <td>${badgeActivo(p.activo)}</td>
            </tr>`
          )
          .join('');
      }
      renderPaginacion(contPaginacion, respuesta, (p) => {
        pagina = p;
        cargar();
      });
    } catch (error) {
      filaEstado(tbody, COLUMNAS, error.message);
    }
  }

  filtroBusqueda.addEventListener(
    'input',
    conRetraso(() => {
      pagina = 1;
      cargar();
    })
  );

  cargar();
})();
