// =====================================================================
// Formularios de vehículo y de visita.
// Los usa el propietario (sus propios datos) y el admin de recinto
// (a nombre de un propietario que no puede usar la plataforma).
// Requiere: api.js, ui.js
// =====================================================================

const TIPOS_VEHICULO = [['auto', 'Auto'], ['camioneta', 'Camioneta'], ['moto', 'Moto'], ['otro', 'Otro']];
const NOMBRE_TIPO_VEHICULO = Object.fromEntries(TIPOS_VEHICULO);

function limpiarPatente(texto) {
  return (texto || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Agregar o editar un vehículo.
//   propietarioId: solo cuando lo hace el admin a nombre de un propietario.
//   aviso:         texto informativo bajo el formulario.
function abrirFormularioVehiculo({ vehiculo, propietarioId, aviso, alGuardar }) {
  const v = vehiculo;
  const edicion = Boolean(v);
  const modal = abrirModal({
    titulo: edicion ? `Editar vehículo ${v.patente}` : 'Agregar vehículo',
    cuerpo: `<div class="form-grid">
      ${campoHtml({ nombre: 'patente', etiqueta: 'Patente', valor: v && v.patente, requerido: true,
        ayuda: 'Ej: BBCD12 (autos) o BBC12 (motos). Sin guiones.', atributos: 'maxlength="8" autocomplete="off" style="text-transform:uppercase"' })}
      ${campoHtml({ nombre: 'tipo', etiqueta: 'Tipo', valor: (v && v.tipo) || 'auto', opciones: TIPOS_VEHICULO })}
      ${campoHtml({ nombre: 'marca', etiqueta: 'Marca', valor: v && v.marca, atributos: 'maxlength="50" placeholder="Ej: Toyota"' })}
      ${campoHtml({ nombre: 'modelo', etiqueta: 'Modelo', valor: v && v.modelo, atributos: 'maxlength="50" placeholder="Ej: Yaris"' })}
      ${campoHtml({ nombre: 'color', etiqueta: 'Color', valor: v && v.color, completo: true, atributos: 'maxlength="30" placeholder="Ej: Gris"' })}
    </div>
    ${aviso ? `<div class="alerta alerta-info">${escapar(aviso)}</div>` : ''}`,
    textoEnviar: edicion ? 'Guardar cambios' : 'Agregar vehículo',
    alEnviar: async (datos) => {
      datos.patente = limpiarPatente(datos.patente);
      if (edicion) await api.put('/vehiculos/' + v.id, datos);
      else await api.post('/vehiculos', propietarioId ? { ...datos, propietario_id: propietarioId } : datos);
      toast(edicion ? 'Vehículo actualizado' : 'Vehículo agregado', 'exito');
      if (alGuardar) alGuardar();
    },
  });
  // La patente se muestra en mayúsculas mientras se escribe
  const input = modal.elemento.querySelector('[name=patente]');
  input.addEventListener('input', () => (input.value = input.value.toUpperCase()));
}

// Activar / desactivar un vehículo (con confirmación)
async function cambiarEstadoVehiculo(v, alGuardar) {
  const activar = !v.activo;
  const ok = await confirmar({
    titulo: activar ? 'Activar vehículo' : 'Desactivar vehículo',
    mensaje: activar
      ? `¿Activar ${v.patente}? Podrá volver a ingresar al recinto.`
      : `¿Desactivar ${v.patente}? No podrá ingresar al recinto hasta que se vuelva a activar.`,
    textoConfirmar: activar ? 'Activar' : 'Desactivar',
    peligro: !activar,
  });
  if (!ok) return;
  try {
    await api.put('/vehiculos/' + v.id, { activo: activar });
    toast(activar ? 'Vehículo activado' : 'Vehículo desactivado', 'exito');
    if (alGuardar) alGuardar();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function eliminarVehiculo(v, alGuardar) {
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
    if (alGuardar) alGuardar();
  } catch (error) {
    toast(error.message, 'error');
  }
}

// "06-10-2026 18:00 – 22:00" o, si cruza días, ambas fechas completas
function horarioVisita(v) {
  const mismoDia = formatearFecha(v.fecha_inicio, { conHora: false }) === formatearFecha(v.fecha_fin, { conHora: false });
  return mismoDia
    ? `${formatearFecha(v.fecha_inicio, { conHora: false })}<span class="secundario">${formatearHora(v.fecha_inicio)} – ${formatearHora(v.fecha_fin)}</span>`
    : `${formatearFecha(v.fecha_inicio)}<span class="secundario">hasta ${formatearFecha(v.fecha_fin)}</span>`;
}

// Programar o editar una visita.
//   propietarioId: solo cuando la programa el admin a nombre de un propietario.
// HU-28: el propietario autoriza visitas de hasta 24 horas; el admin de recinto, de hasta 30 días.
function abrirFormularioVisita({ visita, propietarioId, alGuardar }) {
  const v = visita;
  const edicion = Boolean(v);
  const esAdmin = obtenerUsuario().rol === 'admin_recinto';
  // Por defecto: desde este minuto (para que pueda entrar de inmediato) por 24 horas
  const inicio = edicion ? new Date(v.fecha_inicio) : new Date(Math.floor(Date.now() / 60000) * 60000);
  const fin = edicion ? new Date(v.fecha_fin) : new Date(inicio.getTime() + 24 * 3600000);
  const aviso = esAdmin
    ? 'Como administrador puedes autorizar la visita por hasta 30 días.'
    : 'La visita queda autorizada como máximo por 24 horas y expira sola. Si necesitas más tiempo, pídelo al administrador del recinto.';

  abrirModal({
    titulo: edicion ? 'Editar visita' : 'Programar visita',
    cuerpo: `<div class="form-grid">
      ${campoHtml({ nombre: 'nombre_visitante', etiqueta: 'Nombre del visitante', valor: v && v.nombre_visitante, requerido: true, completo: true, atributos: 'maxlength="120"' })}
      ${campoHtml({ nombre: 'rut_visitante', etiqueta: 'RUT del visitante', valor: v && v.rut_visitante ? formatearRut(v.rut_visitante) : '', atributos: 'maxlength="12" placeholder="12.345.678-9"' })}
      ${campoHtml({ nombre: 'patente', etiqueta: 'Patente del vehículo', valor: v && v.patente, ayuda: 'Déjala vacía si viene a pie.', atributos: 'maxlength="8" style="text-transform:uppercase" autocomplete="off"' })}
      ${campoHtml({ nombre: 'fecha_inicio', etiqueta: 'Desde', tipo: 'datetime-local', valor: fechaParaInput(inicio), requerido: true })}
      ${campoHtml({ nombre: 'fecha_fin', etiqueta: 'Hasta', tipo: 'datetime-local', valor: fechaParaInput(fin), requerido: true })}
      ${campoHtml({ nombre: 'motivo', etiqueta: 'Motivo', valor: v && v.motivo, completo: true, atributos: 'maxlength="200" placeholder="Ej: Visita familiar, técnico de internet"' })}
    </div>
    <div class="alerta alerta-info">${escapar(aviso)}</div>`,
    textoEnviar: edicion ? 'Guardar cambios' : 'Programar visita',
    alEnviar: async (datos) => {
      datos.fecha_inicio = fechaDesdeInput(datos.fecha_inicio);
      datos.fecha_fin = fechaDesdeInput(datos.fecha_fin);
      if (datos.patente) datos.patente = limpiarPatente(datos.patente);
      if (edicion) await api.put('/visitas/' + v.id, datos);
      else await api.post('/visitas', propietarioId ? { ...datos, propietario_id: propietarioId } : datos);
      toast(edicion ? 'Visita actualizada' : 'Visita programada', 'exito');
      if (alGuardar) alGuardar();
    },
  });
}

async function cancelarVisita(v, alGuardar) {
  const ok = await confirmar({
    titulo: 'Cancelar visita',
    mensaje: `¿Cancelar la visita de ${v.nombre_visitante}?${v.patente ? ` La patente ${v.patente} dejará de estar autorizada.` : ''}`,
    textoConfirmar: 'Cancelar visita',
    peligro: true,
  });
  if (!ok) return;
  try {
    await api.patch(`/visitas/${v.id}/cancelar`);
    toast('Visita cancelada', 'exito');
    if (alGuardar) alGuardar();
  } catch (error) {
    toast(error.message, 'error');
  }
}
