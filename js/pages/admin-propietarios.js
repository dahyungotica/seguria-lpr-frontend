// =====================================================================
// Admin de recinto > Personas y unidades
// Pestañas: Propietarios · Guardias · Administradores · Unidades
//
// Una persona tiene una sola cuenta y uno o varios roles por recinto: el mismo
// formulario sirve para propietarios, guardias y administradores, y permite
// asignar roles en todos los recintos que administra quien edita.
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['admin_recinto'], activo: 'propietarios', titulo: 'Personas y unidades' });
  if (!usuario) return;

  const TIPOS_UNIDAD = [['departamento', 'Departamento'], ['casa', 'Casa'], ['oficina', 'Oficina'], ['local', 'Local'], ['otro', 'Otro']];
  const NOMBRE_TIPO_UNIDAD = Object.fromEntries(TIPOS_UNIDAD);
  const COLUMNAS = 6;

  // Cada pestaña de personas filtra por un rol en este recinto
  const PESTANAS = {
    propietarios: {
      rol: 'propietario',
      titulo: 'Propietarios autorizados',
      descripcion: 'Residentes del recinto. Cada propietario gestiona sus vehículos y visitas desde su cuenta; si no puede hacerlo, usa "Vehículos y visitas" para gestionarlos por él.',
      busqueda: 'Nombre, RUT, unidad o patente',
    },
    guardias: {
      rol: 'guardia',
      titulo: 'Guardias',
      descripcion: 'Personal que monitorea los accesos y puede autorizar ingresos manualmente.',
      busqueda: 'Nombre, RUT o email',
    },
    administradores: {
      rol: 'admin_recinto',
      titulo: 'Administradores',
      descripcion: 'Personas que administran este recinto. Puedes sumar administradores a cualquiera de los recintos a tu cargo.',
      busqueda: 'Nombre, RUT o email',
    },
  };

  const tbodyUsuarios = document.getElementById('tabla-usuarios');
  const tbodyUnidades = document.getElementById('tabla-unidades');
  const contPaginacion = document.getElementById('paginacion');
  const filtroBusqueda = document.getElementById('filtro-busqueda');
  const filtroEstado = document.getElementById('filtro-estado');

  let pestanaActual = 'propietarios';
  let usuarios = [];
  let unidades = [];
  let opciones = null; // recintos que administra, roles y unidades (para el formulario)
  let pagina = 1;

  // ---------- Pestañas ----------
  function cambiarPestana(nombre) {
    pestanaActual = nombre;
    document.querySelectorAll('.pestana').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === nombre)));
    const esUnidades = nombre === 'unidades';
    document.getElementById('panel-usuarios').classList.toggle('oculto', esUnidades);
    document.getElementById('panel-unidades').classList.toggle('oculto', !esUnidades);
    history.replaceState(null, '', '#' + nombre);

    if (esUnidades) {
      cargarUnidades();
      return;
    }
    const config = PESTANAS[nombre];
    document.getElementById('titulo-usuarios').textContent = config.titulo;
    document.getElementById('descripcion-usuarios').textContent = config.descripcion;
    filtroBusqueda.placeholder = config.busqueda;
    filtroBusqueda.value = '';
    filtroEstado.value = '';
    pagina = 1;
    cargarUsuarios();
  }

  // ---------- Personas ----------
  async function cargarUsuarios() {
    const config = PESTANAS[pestanaActual];
    filaEstado(tbodyUsuarios, COLUMNAS, 'Cargando…');
    try {
      const respuesta = await api.get(
        '/usuarios' + queryString({ rol: config.rol, busqueda: filtroBusqueda.value.trim(), activo: filtroEstado.value, pagina })
      );
      usuarios = respuesta.datos;
      dibujarUsuarios();
      renderPaginacion(contPaginacion, respuesta, (p) => {
        pagina = p;
        cargarUsuarios();
      });
    } catch (error) {
      filaEstado(tbodyUsuarios, COLUMNAS, error.message);
    }
  }

  function vehiculosHtml(u) {
    if (!u.roles.includes('propietario')) return '<span class="texto-suave">—</span>';
    if (u.vehiculos.length === 0) return '<span class="texto-suave">Sin vehículos</span>';
    return u.vehiculos
      .map((v) => `<span title="${escapar([v.marca, v.modelo, v.color].filter(Boolean).join(' '))}${v.activo ? '' : ' (inactivo)'}">${patenteChip(v.patente, v.activo)}</span>`)
      .join('');
  }

  // Roles de la persona en ESTE recinto
  const rolesAqui = (u) => u.vinculos.filter((v) => v.recinto_id === usuario.recinto_id);

  function dibujarUsuarios() {
    if (usuarios.length === 0) {
      filaEstado(tbodyUsuarios, COLUMNAS, `No hay ${PESTANAS[pestanaActual].titulo.toLowerCase()} que coincidan con la búsqueda.`);
      return;
    }
    tbodyUsuarios.innerHTML = usuarios
      .map((u) => {
        const esYo = u.id === usuario.id;
        const otros = u.otros_recintos ? ` · también en ${u.otros_recintos} recinto${u.otros_recintos > 1 ? 's' : ''} más` : '';
        return `
        <tr class="${u.activo ? '' : 'inactivo'}">
          <td><span class="principal">${escapar(u.nombre + ' ' + u.apellido)}${esYo ? ' <span class="badge badge-info">Tú</span>' : ''}</span>
              <span class="secundario">${escapar(u.email + otros)}</span></td>
          <td>${escapar(formatearRut(u.rut))}</td>
          <td><div class="chips-roles">${chipsRoles(rolesAqui(u))}</div></td>
          <td>${vehiculosHtml(u)}</td>
          <td>${badgeActivo(u.activo)}</td>
          <td class="acciones">
            ${u.roles.includes('propietario') ? `<button type="button" class="btn-texto" data-gestionar="${u.id}">Vehículos y visitas</button>` : ''}
            <button type="button" class="btn-texto" data-editar="${u.id}">${esYo ? 'Mis roles' : 'Editar'}</button>
            ${esYo ? '' : `<button type="button" class="btn-texto${u.activo ? ' peligro' : ''}" data-estado="${u.id}">${u.activo ? 'Desactivar' : 'Activar'}</button>`}
          </td>
        </tr>`;
      })
      .join('');
  }

  async function obtenerOpciones() {
    if (!opciones) opciones = await api.get('/usuarios/opciones');
    return opciones;
  }

  async function abrirFormularioUsuario(u) {
    const edicion = Boolean(u);
    // La propia cuenta (datos y roles) se edita desde Mi perfil
    if (edicion && u.id === usuario.id) {
      window.location.href = CONFIG.RAIZ + 'pages/perfil.html#roles';
      return;
    }
    let datosOpciones;
    try {
      datosOpciones = await obtenerOpciones();
    } catch (error) {
      toast(error.message, 'error');
      return;
    }
    const nombre = edicion ? u.nombre + ' ' + u.apellido : '';
    const seccion = seccionRolesHtml(datosOpciones, {
      vinculos: edicion ? u.vinculos : [],
      preseleccion: edicion ? null : { recinto_id: usuario.recinto_id, rol: PESTANAS[pestanaActual].rol },
    });

    const modal = abrirModal({
      titulo: edicion ? 'Editar a ' + nombre : 'Nueva persona',
      ancho: true,
      cuerpo:
        formularioUsuarioHtml(u, { edicion }) +
        `<div class="form-grid">${seccion}</div>` +
        (edicion && u.otros_recintos
          ? '<p class="texto-suave">Solo ves y cambias sus roles en los recintos que administras; los demás no se modifican.</p>'
          : ''),
      textoEnviar: edicion ? 'Guardar cambios' : 'Crear persona',
      alEnviar: async (datos, form) => {
        datos.roles = leerRoles(form);
        if (!edicion && datos.roles.length === 0) throw new Error('Marca al menos un rol en algún recinto.');
        if (edicion) {
          if (!datos.password) delete datos.password;
          if (datos.roles.length === 0) {
            const ok = await confirmar({
              titulo: 'Quitar todos los roles',
              mensaje: `${nombre} dejará de tener acceso a tus recintos. ¿Continuar?`,
              textoConfirmar: 'Quitar roles',
              peligro: true,
            });
            if (!ok) throw new Error('No se guardaron los cambios.');
          }
          const resultado = await api.put('/usuarios/' + u.id, datos);
          toast(resultado.quitado ? `${nombre} ya no tiene roles en tus recintos` : 'Cambios guardados', 'exito');
        } else {
          const creado = await api.post('/usuarios', datos);
          // Si la persona ya tenía cuenta, solo se le agregaron los roles (no se crea otra cuenta)
          toast(
            creado.vinculado
              ? `${creado.nombre} ${creado.apellido} ya tenía cuenta: se le agregaron los roles`
              : `${creado.nombre} ${creado.apellido} quedó registrado`,
            'exito'
          );
        }
        opciones = null; // los contadores de las unidades cambiaron
        unidades = [];
        cargarUsuarios();
      },
    });
    activarGeneradorPassword(modal);
    activarSeccionRoles(modal);
  }

  async function cambiarEstadoUsuario(u) {
    const activar = !u.activo;
    const nombre = u.nombre + ' ' + u.apellido;
    const roles = rolesAqui(u).map(textoRol).join(', ');
    const consecuencia = u.roles.includes('propietario') ? ' Sus vehículos dejarán de estar autorizados.' : '';
    const ok = await confirmar({
      titulo: activar ? 'Activar en este recinto' : 'Desactivar en este recinto',
      mensaje: activar
        ? `¿Activar a ${nombre} en este recinto (${roles})?`
        : `¿Desactivar a ${nombre} en este recinto (${roles})? No podrá entrar con esos perfiles.${consecuencia} Sus otros recintos no cambian.`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar,
    });
    if (!ok) return;
    try {
      await api.patch(`/usuarios/${u.id}/estado`, { activo: activar });
      toast(activar ? 'Persona activada' : 'Persona desactivada', 'exito');
      cargarUsuarios();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  // ---------- Vehículos y visitas de un propietario (gestionados por el admin) ----------
  // Pensado para propietarios que no pueden usar la plataforma por sí mismos.
  function abrirGestionPropietario(p) {
    const nombre = p.nombre + ' ' + p.apellido;
    const modal = abrirModal({
      titulo: 'Vehículos y visitas de ' + nombre,
      ancho: true,
      cuerpo: `
        <p class="texto-suave" style="margin-top:0">${escapar(p.unidad || 'Sin unidad')}${p.telefono ? ' · ' + escapar(p.telefono) : ''}
          · Los cambios que hagas aquí quedan a nombre de ${escapar(nombre)}.</p>
        ${p.activo ? '' : '<div class="alerta alerta-aviso">Este propietario está desactivado: sus vehículos no están autorizados y no se le pueden programar visitas.</div>'}
        <div class="seccion-cabecera">
          <h2>Vehículos</h2>
          <button type="button" class="btn btn-primario btn-sm" data-nuevo="vehiculo">+ Agregar vehículo</button>
        </div>
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead><tr><th>Patente</th><th>Vehículo</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody data-lista="vehiculos"></tbody>
          </table>
        </div>
        <div class="seccion-cabecera" style="margin-top:1.5rem">
          <h2>Visitas próximas y en curso</h2>
          <button type="button" class="btn btn-primario btn-sm" data-nuevo="visita" ${p.activo ? '' : 'disabled'}>+ Programar visita</button>
        </div>
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead><tr><th>Visitante</th><th>Patente</th><th>Horario</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
            <tbody data-lista="visitas"></tbody>
          </table>
        </div>`,
      // Al cerrar, se actualiza la tabla (las patentes del propietario pueden haber cambiado)
      alCerrar: cargarUsuarios,
    });

    const tbodyVehiculos = modal.elemento.querySelector('[data-lista="vehiculos"]');
    const tbodyVisitas = modal.elemento.querySelector('[data-lista="visitas"]');
    let vehiculos = [];
    let visitas = [];

    async function cargarVehiculos() {
      filaEstado(tbodyVehiculos, 4, 'Cargando…');
      try {
        vehiculos = await api.get('/vehiculos?propietario_id=' + p.id);
        tbodyVehiculos.innerHTML = vehiculos.length
          ? vehiculos
              .map(
                (v) => `
              <tr class="${v.activo ? '' : 'inactivo'}">
                <td>${patenteChip(v.patente, v.activo)}</td>
                <td>${escapar([v.marca, v.modelo].filter(Boolean).join(' ') || '—')}
                    <span class="secundario">${escapar(NOMBRE_TIPO_VEHICULO[v.tipo] || v.tipo)}${v.color ? ' · ' + escapar(v.color) : ''}</span></td>
                <td>${v.activo ? '<span class="badge badge-exito">Autorizado</span>' : '<span class="badge">Desactivado</span>'}</td>
                <td class="acciones">
                  <button type="button" class="btn-texto" data-vehiculo="editar" data-id="${v.id}">Editar</button>
                  <button type="button" class="btn-texto" data-vehiculo="estado" data-id="${v.id}">${v.activo ? 'Desactivar' : 'Activar'}</button>
                  <button type="button" class="btn-texto peligro" data-vehiculo="eliminar" data-id="${v.id}">Eliminar</button>
                </td>
              </tr>`
              )
              .join('')
          : '';
        if (!vehiculos.length) filaEstado(tbodyVehiculos, 4, 'Este propietario aún no tiene vehículos.');
      } catch (error) {
        filaEstado(tbodyVehiculos, 4, error.message);
      }
    }

    async function cargarVisitas() {
      filaEstado(tbodyVisitas, 5, 'Cargando…');
      try {
        visitas = (await api.get(`/visitas?vigencia=proximas&limite=50&propietario_id=${p.id}`)).datos;
        if (!visitas.length) {
          filaEstado(tbodyVisitas, 5, 'No tiene visitas programadas.');
          return;
        }
        tbodyVisitas.innerHTML = visitas
          .map(
            (v) => `
            <tr>
              <td><span class="principal">${escapar(v.nombre_visitante)}</span>
                  <span class="secundario">${escapar(v.motivo || '')}</span></td>
              <td>${v.patente ? patenteChip(v.patente) : '<span class="texto-suave">A pie</span>'}</td>
              <td>${horarioVisita(v)}</td>
              <td>${badgeVisita(v.estado_actual)}</td>
              <td class="acciones">
                <button type="button" class="btn-texto" data-visita="editar" data-id="${v.id}">Editar</button>
                <button type="button" class="btn-texto peligro" data-visita="cancelar" data-id="${v.id}">Cancelar</button>
              </td>
            </tr>`
          )
          .join('');
      } catch (error) {
        filaEstado(tbodyVisitas, 5, error.message);
      }
    }

    modal.elemento.addEventListener('click', (e) => {
      const boton = e.target.closest('button');
      if (!boton) return;
      const id = Number(boton.dataset.id);
      if (boton.dataset.nuevo === 'vehiculo') {
        abrirFormularioVehiculo({ propietarioId: p.id, aviso: `El vehículo quedará registrado a nombre de ${nombre}.`, alGuardar: cargarVehiculos });
      } else if (boton.dataset.nuevo === 'visita') {
        abrirFormularioVisita({ propietarioId: p.id, alGuardar: cargarVisitas });
      } else if (boton.dataset.vehiculo) {
        const v = vehiculos.find((x) => x.id === id);
        if (boton.dataset.vehiculo === 'editar') abrirFormularioVehiculo({ vehiculo: v, alGuardar: cargarVehiculos });
        else if (boton.dataset.vehiculo === 'estado') cambiarEstadoVehiculo(v, cargarVehiculos);
        else if (boton.dataset.vehiculo === 'eliminar') eliminarVehiculo(v, cargarVehiculos);
      } else if (boton.dataset.visita) {
        const v = visitas.find((x) => x.id === id);
        if (boton.dataset.visita === 'editar') abrirFormularioVisita({ visita: v, alGuardar: cargarVisitas });
        else if (boton.dataset.visita === 'cancelar') cancelarVisita(v, cargarVisitas);
      }
    });

    cargarVehiculos();
    cargarVisitas();
  }

  // ---------- Unidades ----------
  async function cargarUnidades() {
    filaEstado(tbodyUnidades, 5, 'Cargando unidades…');
    try {
      unidades = await api.get('/unidades');
      dibujarUnidades();
    } catch (error) {
      filaEstado(tbodyUnidades, 5, error.message);
    }
  }

  function dibujarUnidades() {
    if (unidades.length === 0) {
      filaEstado(tbodyUnidades, 5, 'Aún no hay unidades. Crea la primera para poder registrar propietarios.');
      return;
    }
    tbodyUnidades.innerHTML = unidades
      .map(
        (x) => `
        <tr class="${x.activo ? '' : 'inactivo'}">
          <td class="principal">${escapar(x.identificador)}</td>
          <td>${escapar(NOMBRE_TIPO_UNIDAD[x.tipo] || x.tipo)}</td>
          <td class="num">${x.total_propietarios}</td>
          <td>${badgeActivo(x.activo)}</td>
          <td class="acciones">
            <button type="button" class="btn-texto" data-editar-unidad="${x.id}">Editar</button>
            <button type="button" class="btn-texto peligro" data-eliminar-unidad="${x.id}">Eliminar</button>
          </td>
        </tr>`
      )
      .join('');
  }

  function abrirFormularioUnidad(x) {
    const edicion = Boolean(x);
    abrirModal({
      titulo: edicion ? 'Editar unidad' : 'Nueva unidad',
      cuerpo: `<div class="form-grid">
        ${campoHtml({ nombre: 'identificador', etiqueta: 'Identificador', valor: x && x.identificador, requerido: true, atributos: 'maxlength="50" placeholder="Ej: Depto 304, Casa 12"' })}
        ${campoHtml({ nombre: 'tipo', etiqueta: 'Tipo', valor: (x && x.tipo) || 'departamento', opciones: TIPOS_UNIDAD, requerido: true })}
        ${edicion ? campoHtml({ nombre: 'activo', etiqueta: 'Estado', valor: String(x.activo), opciones: [['true', 'Activa'], ['false', 'Inactiva']], completo: true, ayuda: 'Una unidad inactiva no se puede asignar a nuevos propietarios.' }) : ''}
      </div>`,
      textoEnviar: edicion ? 'Guardar cambios' : 'Crear unidad',
      alEnviar: async (datos) => {
        if (edicion) {
          datos.activo = datos.activo === 'true';
          await api.put('/unidades/' + x.id, datos);
        } else {
          await api.post('/unidades', datos);
        }
        toast(edicion ? 'Unidad actualizada' : 'Unidad creada', 'exito');
        cargarUnidades();
      },
    });
  }

  async function eliminarUnidad(x) {
    const ok = await confirmar({
      titulo: 'Eliminar unidad',
      mensaje: `¿Eliminar la unidad "${x.identificador}"? Esta acción no se puede deshacer.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.delete('/unidades/' + x.id);
      toast('Unidad eliminada', 'exito');
      cargarUnidades();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  // ---------- Eventos ----------
  document.querySelectorAll('.pestana').forEach((b) => b.addEventListener('click', () => cambiarPestana(b.dataset.tab)));
  document.getElementById('btn-nuevo-usuario').addEventListener('click', () => abrirFormularioUsuario());
  document.getElementById('btn-nueva-unidad').addEventListener('click', () => abrirFormularioUnidad());

  const filtrar = () => {
    pagina = 1;
    cargarUsuarios();
  };
  filtroBusqueda.addEventListener('input', conRetraso(filtrar));
  filtroEstado.addEventListener('change', filtrar);

  tbodyUsuarios.addEventListener('click', (e) => {
    const boton = e.target.closest('button');
    if (!boton) return;
    const u = usuarios.find((x) => x.id === Number(boton.dataset.editar || boton.dataset.estado || boton.dataset.gestionar));
    if (boton.dataset.editar) abrirFormularioUsuario(u);
    else if (boton.dataset.estado) cambiarEstadoUsuario(u);
    else if (boton.dataset.gestionar) abrirGestionPropietario(u);
  });

  tbodyUnidades.addEventListener('click', (e) => {
    const boton = e.target.closest('button');
    if (!boton) return;
    const x = unidades.find((y) => y.id === Number(boton.dataset.editarUnidad || boton.dataset.eliminarUnidad));
    if (boton.dataset.editarUnidad) abrirFormularioUnidad(x);
    else if (boton.dataset.eliminarUnidad) eliminarUnidad(x);
  });

  // Pestaña inicial según el #hash (ej. propietarios.html#guardias)
  const inicial = location.hash.slice(1);
  cambiarPestana(['propietarios', 'guardias', 'administradores', 'unidades'].includes(inicial) ? inicial : 'propietarios');
})();
