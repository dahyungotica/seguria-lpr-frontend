// =====================================================================
// Autorización manual de un ingreso denegado (guardia).
// El detalle es obligatorio: queda registrado junto al guardia que autorizó.
// Requiere: api.js, ui.js
// =====================================================================

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
