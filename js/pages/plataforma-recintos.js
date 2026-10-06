// =====================================================================
// Admin de plataforma > Recintos: listar, crear, editar y activar/desactivar
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['admin_plataforma'], activo: 'recintos', titulo: 'Recintos' });
  if (!usuario) return;

  const TIPOS = [['condominio', 'Condominio'], ['empresa', 'Empresa'], ['estacionamiento', 'Estacionamiento'], ['otro', 'Otro']];
  const NOMBRE_TIPO = Object.fromEntries(TIPOS);
  const COLUMNAS = 8;

  const tbody = document.getElementById('tabla-recintos');
  const filtroBusqueda = document.getElementById('filtro-busqueda');
  const filtroEstado = document.getElementById('filtro-estado');
  let recintos = [];

  async function cargar() {
    filaEstado(tbody, COLUMNAS, 'Cargando recintos…');
    try {
      recintos = await api.get('/recintos' + queryString({ busqueda: filtroBusqueda.value.trim(), activo: filtroEstado.value }));
      dibujar();
    } catch (error) {
      filaEstado(tbody, COLUMNAS, error.message);
    }
  }

  function dibujar() {
    if (recintos.length === 0) {
      filaEstado(tbody, COLUMNAS, 'No hay recintos que coincidan con la búsqueda.');
      return;
    }
    tbody.innerHTML = recintos
      .map(
        (r) => `
        <tr class="${r.activo ? '' : 'inactivo'}">
          <td><span class="principal">${escapar(r.nombre)}</span>
              <span class="secundario">${escapar(r.telefono || '')}</span></td>
          <td>${escapar(NOMBRE_TIPO[r.tipo] || r.tipo)}</td>
          <td>${escapar(r.direccion || '—')}
              <span class="secundario">${escapar([r.comuna, r.region].filter(Boolean).join(', '))}</span></td>
          <td class="num">${r.total_administradores}</td>
          <td class="num">${r.total_propietarios}</td>
          <td class="num">${r.total_camaras}</td>
          <td>${badgeActivo(r.activo)}</td>
          <td class="acciones">
            <button type="button" class="btn-texto" data-editar="${r.id}">Editar</button>
            <button type="button" class="btn-texto${r.activo ? ' peligro' : ''}" data-estado="${r.id}">
              ${r.activo ? 'Desactivar' : 'Activar'}</button>
          </td>
        </tr>`
      )
      .join('');
  }

  function formularioRecinto(r = {}) {
    const regiones = [['', 'Selecciona…'], ...REGIONES_CHILE.map((x) => [x, x])];
    return `<div class="form-grid">
      ${campoHtml({ nombre: 'nombre', etiqueta: 'Nombre', valor: r.nombre, requerido: true, completo: true, atributos: 'maxlength="120" required' })}
      ${campoHtml({ nombre: 'tipo', etiqueta: 'Tipo', valor: r.tipo || 'condominio', opciones: TIPOS, requerido: true })}
      ${campoHtml({ nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', valor: r.telefono, atributos: 'placeholder="+56 2 2345 6789"' })}
      ${campoHtml({ nombre: 'direccion', etiqueta: 'Dirección', valor: r.direccion, completo: true, atributos: 'maxlength="200"' })}
      ${campoHtml({ nombre: 'comuna', etiqueta: 'Comuna', valor: r.comuna, atributos: 'maxlength="80"' })}
      ${campoHtml({ nombre: 'region', etiqueta: 'Región', valor: r.region, opciones: regiones })}
    </div>`;
  }

  function abrirFormulario(recinto) {
    const edicion = Boolean(recinto);
    abrirModal({
      titulo: edicion ? 'Editar recinto' : 'Nuevo recinto',
      cuerpo: formularioRecinto(recinto),
      textoEnviar: edicion ? 'Guardar cambios' : 'Crear recinto',
      alEnviar: async (datos) => {
        if (edicion) await api.put('/recintos/' + recinto.id, datos);
        else await api.post('/recintos', datos);
        toast(edicion ? 'Recinto actualizado' : 'Recinto creado', 'exito');
        cargar();
      },
    });
  }

  async function cambiarEstado(recinto) {
    const activar = !recinto.activo;
    const ok = await confirmar({
      titulo: activar ? 'Activar recinto' : 'Desactivar recinto',
      mensaje: activar
        ? `¿Activar "${recinto.nombre}"? Sus usuarios podrán volver a iniciar sesión.`
        : `¿Desactivar "${recinto.nombre}"? Ninguno de sus usuarios podrá iniciar sesión hasta que se vuelva a activar.`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar,
    });
    if (!ok) return;
    try {
      await api.patch(`/recintos/${recinto.id}/estado`, { activo: activar });
      toast(activar ? 'Recinto activado' : 'Recinto desactivado', 'exito');
      cargar();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  // ---------- Eventos ----------
  document.getElementById('btn-nuevo').addEventListener('click', () => abrirFormulario());
  filtroBusqueda.addEventListener('input', conRetraso(cargar));
  filtroEstado.addEventListener('change', cargar);

  tbody.addEventListener('click', (e) => {
    const boton = e.target.closest('button');
    if (!boton) return;
    const id = Number(boton.dataset.editar || boton.dataset.estado);
    const recinto = recintos.find((r) => r.id === id);
    if (boton.dataset.editar) abrirFormulario(recinto);
    else if (boton.dataset.estado) cambiarEstado(recinto);
  });

  cargar();
})();
