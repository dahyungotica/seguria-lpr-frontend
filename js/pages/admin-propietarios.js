// =====================================================================
// Admin de recinto > Propietarios autorizados
// Pestañas: Propietarios · Guardias · Unidades
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['admin_recinto'], activo: 'propietarios', titulo: 'Propietarios autorizados' });
  if (!usuario) return;

  const TIPOS_UNIDAD = [['departamento', 'Departamento'], ['casa', 'Casa'], ['oficina', 'Oficina'], ['local', 'Local'], ['otro', 'Otro']];
  const NOMBRE_TIPO_UNIDAD = Object.fromEntries(TIPOS_UNIDAD);

  // Configuración de cada pestaña de usuarios
  const PESTANAS = {
    propietarios: {
      rol: 'propietario',
      titulo: 'Propietarios autorizados',
      descripcion: 'Residentes del recinto. Cada propietario gestiona sus vehículos y visitas desde su cuenta; si no puede hacerlo, usa "Vehículos y visitas" para gestionarlos por él.',
      boton: '+ Nuevo propietario',
      busqueda: 'Nombre, RUT, unidad o patente',
      singular: 'propietario',
      columnas: ['Propietario', 'RUT', 'Unidad', 'Vehículos', 'Estado', ''],
    },
    guardias: {
      rol: 'guardia',
      titulo: 'Guardias',
      descripcion: 'Personal que monitorea los accesos y puede autorizar ingresos manualmente.',
      boton: '+ Nuevo guardia',
      busqueda: 'Nombre, RUT o email',
      singular: 'guardia',
      columnas: ['Guardia', 'RUT', 'Teléfono', 'Último acceso', 'Estado', ''],
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
    document.getElementById('btn-nuevo-usuario').textContent = config.boton;
    filtroBusqueda.placeholder = config.busqueda;
    filtroBusqueda.value = '';
    filtroEstado.value = '';
    document.getElementById('cabecera-usuarios').innerHTML =
      '<tr>' + config.columnas.map((c) => (c ? `<th>${c}</th>` : '<th><span class="sr-only">Acciones</span></th>')).join('') + '</tr>';
    pagina = 1;
    cargarUsuarios();
  }

  // ---------- Usuarios (propietarios / guardias) ----------
  async function cargarUsuarios() {
    const config = PESTANAS[pestanaActual];
    filaEstado(tbodyUsuarios, 6, 'Cargando…');
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
      filaEstado(tbodyUsuarios, 6, error.message);
    }
  }

  function vehiculosHtml(vehiculos) {
    if (vehiculos.length === 0) return '<span class="texto-suave">Sin vehículos</span>';
    return vehiculos
      .map((v) => `<span title="${escapar([v.marca, v.modelo, v.color].filter(Boolean).join(' '))}${v.activo ? '' : ' (inactivo)'}">${patenteChip(v.patente, v.activo)}</span>`)
      .join('');
  }

  function dibujarUsuarios() {
    if (usuarios.length === 0) {
      filaEstado(tbodyUsuarios, 6, `No hay ${pestanaActual} que coincidan con la búsqueda.`);
      return;
    }
    const esPropietario = pestanaActual === 'propietarios';
    tbodyUsuarios.innerHTML = usuarios
      .map(
        (u) => `
        <tr class="${u.activo ? '' : 'inactivo'}">
          <td><span class="principal">${escapar(u.nombre + ' ' + u.apellido)}</span>
              <span class="secundario">${escapar(u.email)}${u.total_recintos > 1 ? ` · también en otro${u.total_recintos > 2 ? 's' : ''} ${u.total_recintos - 1} recinto${u.total_recintos > 2 ? 's' : ''}` : ''}</span></td>
          <td>${escapar(formatearRut(u.rut))}</td>
          ${
            esPropietario
              ? `<td>${escapar(u.unidad || '—')}</td><td>${vehiculosHtml(u.vehiculos)}</td>`
              : `<td>${escapar(u.telefono || '—')}</td>
                 <td title="${escapar(formatearFecha(u.ultimo_login))}">${escapar(tiempoRelativo(u.ultimo_login))}</td>`
          }
          <td>${badgeActivo(u.activo)}</td>
          <td class="acciones">
            ${esPropietario ? `<button type="button" class="btn-texto" data-gestionar="${u.id}">Vehículos y visitas</button>` : ''}
            <button type="button" class="btn-texto" data-editar="${u.id}">Editar</button>
            <button type="button" class="btn-texto${u.activo ? ' peligro' : ''}" data-estado="${u.id}">${u.activo ? 'Desactivar' : 'Activar'}</button>
          </td>
        </tr>`
      )
      .join('');
  }

  async function obtenerUnidadesActivas() {
    if (unidades.length === 0) unidades = await api.get('/unidades');
    return unidades;
  }

  async function abrirFormularioUsuario(u) {
    const config = PESTANAS[pestanaActual];
    const edicion = Boolean(u);
    let extras = '';

    if (config.rol === 'propietario') {
      let lista;
      try {
        lista = await obtenerUnidadesActivas();
      } catch (error) {
        toast(error.message, 'error');
        return;
      }
      const disponibles = lista.filter((x) => x.activo || (u && x.id === u.unidad_id));
      if (disponibles.length === 0) {
        toast('Primero crea una unidad en la pestaña "Unidades".', 'error');
        return;
      }
      extras = campoHtml({
        nombre: 'unidad_id', etiqueta: 'Unidad', valor: u && u.unidad_id, requerido: true, completo: true,
        opciones: [['', 'Selecciona una unidad…'], ...disponibles.map((x) => [x.id, x.identificador])],
        atributos: 'data-tipo="numero"',
      });
    }

    const modal = abrirModal({
      titulo: edicion ? `Editar ${config.singular}` : `Nuevo ${config.singular}`,
      cuerpo:
        formularioUsuarioHtml(u, { edicion, extras }) +
        (config.rol === 'propietario' && !edicion
          ? '<div class="alerta alerta-info">El propietario podrá registrar sus vehículos y visitas con su cuenta. Si no puede, después de crearlo usa "Vehículos y visitas".</div>'
          : ''),
      textoEnviar: edicion ? 'Guardar cambios' : 'Crear ' + config.singular,
      alEnviar: async (datos) => {
        if (edicion) {
          if (!datos.password) delete datos.password;
          await api.put('/usuarios/' + u.id, datos);
        } else {
          const creado = await api.post('/usuarios', { ...datos, rol: config.rol });
          // HU-19 / HU-20: si la persona ya tenía cuenta en otro recinto, solo se vinculó
          if (creado.vinculado) {
            toast(`${creado.nombre} ${creado.apellido} ya tenía cuenta en otro recinto: quedó vinculado a este`, 'exito');
            unidades = [];
            cargarUsuarios();
            return;
          }
        }
        toast(edicion ? 'Cambios guardados' : `${config.singular[0].toUpperCase() + config.singular.slice(1)} creado`, 'exito');
        unidades = []; // los contadores de las unidades cambiaron
        cargarUsuarios();
      },
    });
    activarGeneradorPassword(modal);
  }

  async function cambiarEstadoUsuario(u) {
    const activar = !u.activo;
    const nombre = u.nombre + ' ' + u.apellido;
    const consecuencia =
      pestanaActual === 'propietarios'
        ? ' No podrá iniciar sesión y sus vehículos dejarán de estar autorizados.'
        : ' No podrá iniciar sesión.';
    const ok = await confirmar({
      titulo: activar ? 'Activar cuenta' : 'Desactivar cuenta',
      mensaje: activar ? `¿Activar la cuenta de ${nombre}?` : `¿Desactivar la cuenta de ${nombre}?${consecuencia}`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar,
    });
    if (!ok) return;
    try {
      await api.patch(`/usuarios/${u.id}/estado`, { activo: activar });
      toast(activar ? 'Cuenta activada' : 'Cuenta desactivada', 'exito');
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
  cambiarPestana(['propietarios', 'guardias', 'unidades'].includes(inicial) ? inicial : 'propietarios');
})();
