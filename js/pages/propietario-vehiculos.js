// =====================================================================
// Propietario > Mis vehículos
// Crea, edita, activa/desactiva y elimina sus vehículos sin aprobación.
// Cada cambio se notifica en tiempo real al administrador del recinto.
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['propietario'], activo: 'vehiculos', titulo: 'Mis vehículos' });
  if (!usuario) return;

  const TIPOS = [['auto', 'Auto'], ['camioneta', 'Camioneta'], ['moto', 'Moto'], ['otro', 'Otro']];
  const NOMBRE_TIPO = Object.fromEntries(TIPOS);
  const contenedor = document.getElementById('lista-vehiculos');
  let vehiculos = [];

  async function cargar() {
    contenedor.innerHTML = '<p class="texto-suave">Cargando vehículos…</p>';
    try {
      vehiculos = await api.get('/vehiculos');
      dibujar();
    } catch (error) {
      contenedor.innerHTML = `<p class="texto-suave">${escapar(error.message)}</p>`;
    }
  }

  function dibujar() {
    if (vehiculos.length === 0) {
      contenedor.innerHTML = `<div class="placeholder" style="grid-column:1/-1">
        <strong>Aún no tienes vehículos registrados</strong>
        <span>Agrega tu vehículo para que la cámara lo reconozca al ingresar.</span></div>`;
      return;
    }
    contenedor.innerHTML = vehiculos
      .map(
        (v) => `
        <article class="vehiculo-tarjeta${v.activo ? '' : ' inactivo'}">
          <span class="patente-grande">${escapar(v.patente)}</span>
          <div>
            <div class="principal">${escapar([v.marca, v.modelo].filter(Boolean).join(' ') || 'Sin marca ni modelo')}</div>
            <div class="texto-suave">${escapar(NOMBRE_TIPO[v.tipo] || v.tipo)}${v.color ? ' · ' + escapar(v.color) : ''}</div>
          </div>
          <div>${v.activo ? '<span class="badge badge-exito">Autorizado</span>' : '<span class="badge">Desactivado: no puede ingresar</span>'}</div>
          <div class="acciones">
            <button type="button" class="btn-texto" data-accion="editar" data-id="${v.id}">Editar</button>
            <button type="button" class="btn-texto" data-accion="estado" data-id="${v.id}">${v.activo ? 'Desactivar' : 'Activar'}</button>
            <button type="button" class="btn-texto peligro" data-accion="eliminar" data-id="${v.id}">Eliminar</button>
          </div>
        </article>`
      )
      .join('');
  }

  function abrirFormulario(v) {
    const edicion = Boolean(v);
    const modal = abrirModal({
      titulo: edicion ? `Editar vehículo ${v.patente}` : 'Agregar vehículo',
      cuerpo: `<div class="form-grid">
        ${campoHtml({ nombre: 'patente', etiqueta: 'Patente', valor: v && v.patente, requerido: true,
          ayuda: 'Ej: BBCD12 (autos) o BBC12 (motos). Sin guiones.', atributos: 'maxlength="8" autocomplete="off" style="text-transform:uppercase"' })}
        ${campoHtml({ nombre: 'tipo', etiqueta: 'Tipo', valor: (v && v.tipo) || 'auto', opciones: TIPOS })}
        ${campoHtml({ nombre: 'marca', etiqueta: 'Marca', valor: v && v.marca, atributos: 'maxlength="50" placeholder="Ej: Toyota"' })}
        ${campoHtml({ nombre: 'modelo', etiqueta: 'Modelo', valor: v && v.modelo, atributos: 'maxlength="50" placeholder="Ej: Yaris"' })}
        ${campoHtml({ nombre: 'color', etiqueta: 'Color', valor: v && v.color, completo: true, atributos: 'maxlength="30" placeholder="Ej: Gris"' })}
      </div>
      <div class="alerta alerta-info">El administrador del recinto será notificado de este cambio.</div>`,
      textoEnviar: edicion ? 'Guardar cambios' : 'Agregar vehículo',
      alEnviar: async (datos) => {
        datos.patente = (datos.patente || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (edicion) await api.put('/vehiculos/' + v.id, datos);
        else await api.post('/vehiculos', datos);
        toast(edicion ? 'Vehículo actualizado' : 'Vehículo agregado', 'exito');
        cargar();
      },
    });
    // La patente se muestra en mayúsculas mientras se escribe
    const input = modal.elemento.querySelector('[name=patente]');
    input.addEventListener('input', () => (input.value = input.value.toUpperCase()));
  }

  async function cambiarEstado(v) {
    const activar = !v.activo;
    const ok = await confirmar({
      titulo: activar ? 'Activar vehículo' : 'Desactivar vehículo',
      mensaje: activar
        ? `¿Activar ${v.patente}? Podrá volver a ingresar al recinto.`
        : `¿Desactivar ${v.patente}? No podrá ingresar al recinto hasta que lo vuelvas a activar.`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      peligro: !activar,
    });
    if (!ok) return;
    try {
      await api.put('/vehiculos/' + v.id, { activo: activar });
      toast(activar ? 'Vehículo activado' : 'Vehículo desactivado', 'exito');
      cargar();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function eliminar(v) {
    const ok = await confirmar({
      titulo: 'Eliminar vehículo',
      mensaje: `¿Eliminar ${v.patente}? Dejará de estar autorizado. El historial de accesos se conserva.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.delete('/vehiculos/' + v.id);
      toast('Vehículo eliminado', 'exito');
      cargar();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  document.getElementById('btn-nuevo').addEventListener('click', () => abrirFormulario());
  contenedor.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const v = vehiculos.find((x) => x.id === Number(boton.dataset.id));
    if (boton.dataset.accion === 'editar') abrirFormulario(v);
    else if (boton.dataset.accion === 'estado') cambiarEstado(v);
    else if (boton.dataset.accion === 'eliminar') eliminar(v);
  });

  cargar();
})();
