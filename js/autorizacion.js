// =====================================================================
// Gestión de alertas (HU-31): el guardia atiende un ingreso denegado
//  - Autorizar: el detalle es obligatorio y queda registrado con su nombre.
//  - Rechazar:  el detalle es opcional; el acceso sigue denegado.
// En ambos casos la alerta queda "atendida" con la decisión tomada.
// Requiere: api.js, ui.js
// =====================================================================

// Texto que resume la gestión de la alerta de un acceso (para tablas y detalle)
function estadoAlerta(a) {
  if (!a.alerta_id) return '';
  if (a.alerta_estado === 'pendiente') return 'Alerta pendiente';
  const decision = a.alerta_decision === 'autorizado' ? 'Autorizado' : 'Rechazado';
  return `${decision} por ${a.alerta_guardia_nombre || 'guardia'}`;
}

function abrirRechazo(acceso, alRechazar) {
  abrirModal({
    titulo: 'Rechazar ingreso',
    textoEnviar: 'Rechazar ingreso',
    peligro: true,
    cuerpo: `
      <p style="margin-top:0">Se rechazará el ingreso de ${patenteChip(acceso.patente_detectada)}. La alerta quedará atendida con tu nombre.</p>
      <div class="campo">
        <label for="campo-detalle-rechazo">Motivo (opcional)</label>
        <textarea class="input" id="campo-detalle-rechazo" name="detalle" rows="3" maxlength="500"
          placeholder="Ej: Ningún residente confirmó la visita"></textarea>
        <span class="texto-error-campo"></span>
      </div>`,
    alEnviar: async (datos) => {
      const actualizado = await api.post(`/accesos/${acceso.id}/rechazar`, { detalle: datos.detalle });
      toast(`Ingreso de ${actualizado.patente_detectada} rechazado`, 'exito');
      if (alRechazar) alRechazar(actualizado);
    },
  });
}

const MINIMO_DETALLE = 5;

// Abre el modal de autorización. alAutorizar(accesoActualizado) se llama si se confirma.
function abrirAutorizacion(acceso, alAutorizar) {
  abrirModal({
    titulo: 'Autorizar ingreso',
    textoEnviar: 'Autorizar ingreso',
    cuerpo: `
      <div class="alerta alerta-aviso">La patente ${patenteChip(acceso.patente_detectada)} no está autorizada.
        Indica por qué permites el ingreso: quedará registrado con tu nombre.</div>
      <div class="campo">
        <label for="campo-detalle">Motivo de la autorización <span class="obligatorio" aria-hidden="true">*</span></label>
        <textarea class="input" id="campo-detalle" name="detalle_autorizacion" rows="4" maxlength="500" required
          placeholder="Ej: Proveedor de gas confirmado por teléfono con el Depto 304"></textarea>
        <span class="ayuda">Entre ${MINIMO_DETALLE} y 500 caracteres.</span>
        <span class="texto-error-campo"></span>
      </div>`,
    alEnviar: async (datos, form) => {
      // Validación en el navegador antes de llamar al backend
      if (!datos.detalle_autorizacion || datos.detalle_autorizacion.length < MINIMO_DETALLE) {
        const error = new Error('Revisa los campos marcados.');
        error.datos = { detalles: [{ campo: 'detalle_autorizacion', mensaje: 'Debes indicar el motivo (mínimo 5 caracteres).' }] };
        throw error;
      }
      const actualizado = await api.post(`/accesos/${acceso.id}/autorizar`, {
        detalle_autorizacion: datos.detalle_autorizacion,
      });
      toast(`Ingreso de ${actualizado.patente_detectada} autorizado`, 'exito');
      if (alAutorizar) alAutorizar(actualizado);
    },
  });
}
