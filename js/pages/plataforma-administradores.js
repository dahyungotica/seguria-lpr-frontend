// =====================================================================
// Admin de plataforma > Administradores de recinto
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

  let recintos = [];
  let administradores = [];
  let pagina = 1;

  async function cargarRecintos() {
    try {
      recintos = await api.get('/recintos');
      filtroRecinto.innerHTML =
        '<option value="">Todos</option>' +
        recintos.map((r) => `<option value="${r.id}">${escapar(r.nombre)}</option>`).join('');
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
          <td>${escapar(a.recinto_nombre || '—')}</td>
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

  function selectRecinto(valor) {
    // Al editar se muestran todos; al crear, solo los activos
    const opciones = [['', 'Selecciona un recinto…']].concat(
      recintos
        .filter((r) => r.activo || r.id === valor)
        .map((r) => [r.id, r.nombre + (r.activo ? '' : ' (inactivo)')])
    );
    return campoHtml({
      nombre: 'recinto_id', etiqueta: 'Recinto', valor, opciones, requerido: true, completo: true,
      atributos: 'data-tipo="numero"',
    });
  }

  function abrirFormulario(admin) {
    const edicion = Boolean(admin);
    if (!edicion && recintos.filter((r) => r.activo).length === 0) {
      toast('Primero crea un recinto activo.', 'error');
      return;
    }
    const modal = abrirModal({
      titulo: edicion ? 'Editar administrador' : 'Nuevo administrador de recinto',
      cuerpo: formularioUsuarioHtml(admin, { edicion, extras: selectRecinto(admin && admin.recinto_id) }),
      textoEnviar: edicion ? 'Guardar cambios' : 'Crear administrador',
      alEnviar: async (datos) => {
        if (edicion) {
          if (!datos.password) delete datos.password;
          await api.put('/usuarios/' + admin.id, datos);
        } else {
          await api.post('/usuarios', { ...datos, rol: 'admin_recinto' });
        }
        toast(edicion ? 'Administrador actualizado' : 'Administrador creado', 'exito');
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
      mensaje: activar ? `¿Activar la cuenta de ${nombre}?` : `¿Desactivar la cuenta de ${nombre}? No podrá iniciar sesión.`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar,
    });
    if (!ok) return;
    try {
      await api.patch(`/usuarios/${admin.id}/estado`, { activo: activar });
      toast(activar ? 'Cuenta activada' : 'Cuenta desactivada', 'exito');
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
    const id = Number(boton.dataset.editar || boton.dataset.estado);
    const admin = administradores.find((a) => a.id === id);
    if (boton.dataset.editar) abrirFormulario(admin);
    else if (boton.dataset.estado) cambiarEstado(admin);
  });

  cargarRecintos().then(cargar);
})();
