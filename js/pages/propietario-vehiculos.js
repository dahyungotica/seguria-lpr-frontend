// =====================================================================
// Propietario > Mis vehículos
// Crea, edita, activa/desactiva y elimina sus vehículos sin aprobación.
// Cada cambio se notifica en tiempo real al administrador del recinto.
// Los formularios están en js/formularios-propietario.js
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['propietario'], activo: 'vehiculos', titulo: 'Mis vehículos' });
  if (!usuario) return;

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
            <div class="texto-suave">${escapar(NOMBRE_TIPO_VEHICULO[v.tipo] || v.tipo)}${v.color ? ' · ' + escapar(v.color) : ''}</div>
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

  const AVISO = 'El administrador del recinto será notificado de este cambio.';

  document.getElementById('btn-nuevo').addEventListener('click', () =>
    abrirFormularioVehiculo({ aviso: AVISO, alGuardar: cargar })
  );
  contenedor.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const v = vehiculos.find((x) => x.id === Number(boton.dataset.id));
    if (boton.dataset.accion === 'editar') abrirFormularioVehiculo({ vehiculo: v, aviso: AVISO, alGuardar: cargar });
    else if (boton.dataset.accion === 'estado') cambiarEstadoVehiculo(v, cargar);
    else if (boton.dataset.accion === 'eliminar') eliminarVehiculo(v, cargar);
  });

  cargar();
})();
