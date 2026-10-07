// =====================================================================
// Admin de plataforma > Administradores de recinto
// Cada fila es una persona; en el formulario se marcan todos los recintos a su cargo.
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['admin_plataforma'], activo: 'administradores', titulo: 'Administradores de recinto' });
  if (!usuario) return;

  const COLUMNAS = 6;
  const tbody = document.getElementById('tabla-admins');
  const contPaginacion = document.getElementById('paginacion');
  const filtroBusqueda = document.getElementById('filtro-busqueda');
  const filtroRecinto = document.getElementById('filtro-recinto');
  const filtroEstado = document.getElementById('filtro-estado');

  let opciones = { roles: ['admin_recinto'], recintos: [] };
  let administradores = [];
  let pagina = 1;

  async function cargarRecintos() {
    try {
      opciones = await api.get('/usuarios/opciones');
      filtroRecinto.innerHTML =
        '<option value="">Todos</option>' +
        opciones.recintos.map((r) => `<option value="${r.id}">${escapar(r.nombre)}</option>`).join('');
    } catch (error) {
      toast('No se pudieron cargar los recintos: ' + error.message, 'error');
    }
  }

  async function cargar() {
    filaEstado(tbody, COLUMNAS, 'Cargando administradores…');
    try {
      const respuesta = await api.get(
        '/usuarios' +
          queryString({
            rol: 'admin_recinto',
            busqueda: filtroBusqueda.value.trim(),
            recinto_id: filtroRecinto.value,
            activo: filtroEstado.value,
            pagina,
          })
      );
      administradores = respuesta.datos;
      dibujar();
      renderPaginacion(contPaginacion, respuesta, (p) => {
        pagina = p;
        cargar();
      });
    } catch (error) {
      filaEstado(tbody, COLUMNAS, error.message);
    }
  }

  // Recintos a cargo (los desactivados se ven en gris)
  function recintosHtml(a) {
    return `<div class="chips-roles">${a.vinculos
      .map((v) => `<span class="chip-rol chip-admin_recinto${v.activo ? '' : ' inactivo'}" title="${v.activo ? '' : 'Desactivado en este recinto'}">${escapar(v.recinto_nombre)}</span>`)
      .join('')}</div>`;
  }

  function dibujar() {
    if (administradores.length === 0) {
      filaEstado(tbody, COLUMNAS, 'No hay administradores que coincidan con la búsqueda.');
      return;
    }
    tbody.innerHTML = administradores
      .map(
        (a) => `
        <tr class="${a.activo ? '' : 'inactivo'}">
          <td><span class="principal">${escapar(a.nombre + ' ' + a.apellido)}</span>
              <span class="secundario">${escapar(a.email)}${a.telefono ? ' · ' + escapar(a.telefono) : ''}</span></td>
          <td>${escapar(formatearRut(a.rut))}</td>
          <td>${recintosHtml(a)}</td>
          <td title="${escapar(formatearFecha(a.ultimo_login))}">${escapar(tiempoRelativo(a.ultimo_login))}</td>
          <td>${badgeActivo(a.activo)}</td>
          <td class="acciones">
            <button type="button" class="btn-texto" data-editar="${a.id}">Editar</button>
            <button type="button" class="btn-texto${a.activo ? ' peligro' : ''}" data-estado="${a.id}">
              ${a.activo ? 'Desactivar' : 'Activar'}</button>
          </td>
        </tr>`
      )
      .join('');
  }

  function abrirFormulario(admin) {
    const edicion = Boolean(admin);
    if (!edicion && opciones.recintos.filter((r) => r.activo).length === 0) {
      toast('Primero crea un recinto activo.', 'error');
      return;
    }
    const modal = abrirModal({
      titulo: edicion ? 'Editar administrador' : 'Nuevo administrador de recinto',
      ancho: true,
      cuerpo:
        formularioUsuarioHtml(admin, { edicion }) +
        `<div class="form-grid">${seccionRolesHtml(opciones, { vinculos: edicion ? admin.vinculos : [] })}</div>`,
      textoEnviar: edicion ? 'Guardar cambios' : 'Crear administrador',
      alEnviar: async (datos, form) => {
        datos.roles = leerRoles(form);
        if (datos.roles.length === 0) {
          throw new Error(edicion
            ? 'Marca al menos un recinto. Si ya no administra ninguno, usa "Desactivar".'
            : 'Marca al menos un recinto a su cargo.');
        }
        if (edicion) {
          if (!datos.password) delete datos.password;
          await api.put('/usuarios/' + admin.id, datos);
          toast('Administrador actualizado', 'exito');
        } else {
          const creado = await api.post('/usuarios', datos);
          // Si la persona ya tenía cuenta (ej. es propietaria en un recinto), solo se le agrega el rol
          toast(
            creado.vinculado
              ? `${creado.nombre} ${creado.apellido} ya tenía cuenta: ahora también administra los recintos marcados`
              : 'Administrador creado',
            'exito'
          );
        }
        cargar();
      },
    });
    activarGeneradorPassword(modal);
  }

  async function cambiarEstado(admin) {
    const activar = !admin.activo;
    const nombre = admin.nombre + ' ' + admin.apellido;
    const ok = await confirmar({
      titulo: activar ? 'Activar administrador' : 'Desactivar administrador',
      mensaje: activar
        ? `¿Activar a ${nombre} como administrador de todos sus recintos?`
        : `¿Desactivar a ${nombre} como administrador de todos sus recintos? Si también es guardia o propietario, esos perfiles no cambian.`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar,
    });
    if (!ok) return;
    try {
      await api.patch(`/usuarios/${admin.id}/estado`, { activo: activar });
      toast(activar ? 'Administrador activado' : 'Administrador desactivado', 'exito');
      cargar();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  // ---------- Eventos ----------
  function filtrar() {
    pagina = 1;
    cargar();
  }

  document.getElementById('btn-nuevo').addEventListener('click', () => abrirFormulario());
  filtroBusqueda.addEventListener('input', conRetraso(filtrar));
  filtroRecinto.addEventListener('change', filtrar);
  filtroEstado.addEventListener('change', filtrar);

  tbody.addEventListener('click', (e) => {
    const boton = e.target.closest('button');
    if (!boton) return;
    const admin = administradores.find((a) => a.id === Number(boton.dataset.editar || boton.dataset.estado));
    if (boton.dataset.editar) abrirFormulario(admin);
    else if (boton.dataset.estado) cambiarEstado(admin);
  });

  cargarRecintos().then(cargar);
})();
