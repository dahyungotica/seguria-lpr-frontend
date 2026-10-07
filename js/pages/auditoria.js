// =====================================================================
// Auditoría (HU-5): bitácora de quién hizo qué y cuándo. Solo lectura.
//  - admin_recinto:    su recinto. Pestaña "Cambios de propietarios" (HU-26) y "Bitácora completa".
//  - admin_plataforma: todos los recintos, o solo las acciones de plataforma (HU-23).
// La página indica el rol en <body data-rol="...">.
// =====================================================================
(function () {
  const rolPagina = document.body.dataset.rol;
  const usuario = iniciarPagina({ roles: [rolPagina], activo: 'auditoria', titulo: 'Auditoría' });
  if (!usuario) return;

  const esPlataforma = usuario.rol === 'admin_plataforma';
  const COLUMNAS = 6;
  const form = document.getElementById('form-filtros');
  const tbody = document.getElementById('tabla-auditoria');
  const contPaginacion = document.getElementById('paginacion');
  let registros = [];
  let pagina = 1;
  let soloPropietarios = !esPlataforma; // HU-26: el admin de recinto parte viendo los cambios de los propietarios

  const ROLES_AUTOR = {
    admin_plataforma: 'Administrador de plataforma', admin_recinto: 'Administrador de recinto',
    propietario: 'Propietario', guardia: 'Guardia', dispositivo: 'Equipo (Raspberry Pi)', sistema: 'Sistema',
  };
  const ACCIONES = {
    crear: 'Creó', editar: 'Editó', eliminar: 'Eliminó', activar: 'Activó', desactivar: 'Desactivó',
    vincular: 'Vinculó', autorizar: 'Autorizó', rechazar: 'Rechazó', cancelar: 'Canceló',
    regenerar_clave: 'Regeneró la API key', consultar: 'Consultó',
  };
  const ENTIDADES = {
    vehiculos: 'Vehículo', visitas: 'Visita', usuarios: 'Usuario', unidades: 'Unidad', camaras: 'Cámara',
    dispositivos: 'Equipo', accesos: 'Acceso', alertas: 'Alerta', recintos: 'Recinto', capturas: 'Captura',
  };

  // ---------- Filtros ----------
  function llenarSelect(id, opciones, textoTodos) {
    document.getElementById(id).innerHTML =
      `<option value="">${textoTodos}</option>` + Object.entries(opciones).map(([v, t]) => `<option value="${v}">${escapar(t)}</option>`).join('');
  }

  async function prepararFiltros() {
    llenarSelect('filtro-autor', ROLES_AUTOR, 'Todos');
    llenarSelect('filtro-entidad', ENTIDADES, 'Todas');
    llenarSelect('filtro-accion', ACCIONES, 'Todas');
    const campoRecinto = document.getElementById('filtro-recinto').closest('.campo');
    if (!esPlataforma) {
      campoRecinto.classList.add('oculto');
      return;
    }
    try {
      const recintos = await api.get('/recintos');
      document.getElementById('filtro-recinto').innerHTML =
        '<option value="">Todos</option><option value="plataforma">Solo acciones de plataforma</option>' +
        recintos.map((r) => `<option value="${r.id}">${escapar(r.nombre)}</option>`).join('');
    } catch (e) {
      // Queda solo "Todos"
    }
  }

  function filtros() {
    const datos = Object.fromEntries(new FormData(form).entries());
    if (soloPropietarios) datos.actor_rol = 'propietario';
    return datos;
  }

  // ---------- Listado ----------
  async function cargar() {
    filaEstado(tbody, COLUMNAS, 'Cargando auditoría…');
    try {
      const respuesta = await api.get('/auditoria' + queryString({ ...filtros(), pagina }));
      registros = respuesta.datos;
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

  function dibujar() {
    if (registros.length === 0) {
      filaEstado(tbody, COLUMNAS, soloPropietarios ? 'Los propietarios aún no han hecho cambios.' : 'No hay registros para los filtros seleccionados.');
      return;
    }
    tbody.innerHTML = registros
      .map(
        (a) => `
        <tr class="fila-clic" data-id="${a.id}" tabindex="0" aria-label="Ver detalle del registro">
          <td class="sin-salto">${escapar(formatearFecha(a.fecha))}</td>
          <td><span class="principal">${escapar(a.actor_nombre || '—')}</span>
              <span class="secundario">${escapar(ROLES_AUTOR[a.actor_rol] || a.actor_rol)}</span></td>
          <td>${escapar(ACCIONES[a.accion] || a.accion)}</td>
          <td>${escapar(ENTIDADES[a.entidad] || a.entidad)}${a.entidad_id ? ` <span class="texto-suave">#${a.entidad_id}</span>` : ''}</td>
          <td>${escapar(a.detalle || '')}</td>
          <td>${escapar(a.recinto_nombre || (esPlataforma ? 'Plataforma' : ''))}</td>
        </tr>`
      )
      .join('');
  }

  // Valor legible para la tabla de cambios
  function valor(v) {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    if (typeof v === 'object') return JSON.stringify(v);
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return formatearFecha(v);
    return String(v);
  }

  function verDetalle(a) {
    const antes = a.datos_anteriores || {};
    const despues = a.datos_nuevos || {};
    const campos = Object.keys({ ...antes, ...despues });
    const tabla = campos.length
      ? `<div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
          <tbody>${campos
            .map((c) => {
              const cambio = a.datos_anteriores && a.datos_nuevos && JSON.stringify(antes[c]) !== JSON.stringify(despues[c]);
              return `<tr${cambio ? ' class="fila-cambio"' : ''}><td>${escapar(c)}</td><td>${escapar(valor(antes[c]))}</td><td>${escapar(valor(despues[c]))}</td></tr>`;
            })
            .join('')}</tbody></table></div>`
      : '<p class="texto-suave">Este registro no guarda datos adicionales.</p>';

    abrirModal({
      titulo: 'Registro de auditoría',
      ancho: true,
      cuerpo: `<dl class="detalle-lista" style="margin-bottom:1rem">
          <dt>Fecha</dt><dd>${escapar(formatearFecha(a.fecha))}</dd>
          <dt>Autor</dt><dd>${escapar(a.actor_nombre || '—')} · ${escapar(ROLES_AUTOR[a.actor_rol] || a.actor_rol)}</dd>
          <dt>Acción</dt><dd>${escapar(ACCIONES[a.accion] || a.accion)} ${escapar((ENTIDADES[a.entidad] || a.entidad).toLowerCase())}</dd>
          ${a.recinto_nombre ? `<dt>Recinto</dt><dd>${escapar(a.recinto_nombre)}</dd>` : ''}
          ${a.detalle ? `<dt>Detalle</dt><dd>${escapar(a.detalle)}</dd>` : ''}
          ${a.ip ? `<dt>IP</dt><dd>${escapar(a.ip)}</dd>` : ''}
        </dl>${tabla}
        <p class="texto-suave" style="font-size:.82rem;margin-bottom:0">Los registros de auditoría no se pueden editar ni eliminar.</p>`,
    });
  }

  // ---------- Eventos ----------
  const filtrar = () => {
    pagina = 1;
    cargar();
  };
  form.addEventListener('change', (e) => {
    if (e.target.id !== 'filtro-busqueda') filtrar();
  });
  document.getElementById('filtro-busqueda').addEventListener('input', conRetraso(filtrar));
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('reset', () => setTimeout(filtrar, 0));

  // Pestañas (solo admin de recinto)
  const pestanas = document.querySelectorAll('.pestana');
  if (esPlataforma) document.querySelector('.pestanas').classList.add('oculto');
  pestanas.forEach((b) =>
    b.addEventListener('click', () => {
      pestanas.forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      soloPropietarios = b.dataset.vista === 'propietarios';
      document.getElementById('filtro-autor').closest('.campo').classList.toggle('oculto', soloPropietarios);
      filtrar();
    })
  );
  if (soloPropietarios) document.getElementById('filtro-autor').closest('.campo').classList.add('oculto');

  tbody.addEventListener('click', (e) => {
    const fila = e.target.closest('tr[data-id]');
    if (fila) verDetalle(registros.find((a) => a.id === Number(fila.dataset.id)));
  });
  tbody.addEventListener('keydown', (e) => {
    const fila = e.target.closest('tr[data-id]');
    if (fila && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      verDetalle(registros.find((a) => a.id === Number(fila.dataset.id)));
    }
  });

  prepararFiltros();
  cargar();
})();
