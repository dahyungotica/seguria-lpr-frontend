// =====================================================================
// Formulario de usuario compartido (administradores, propietarios y guardias)
// Requiere: ui.js
// =====================================================================

// extras: HTML adicional (ej. select de recinto o de unidad)
function formularioUsuarioHtml(u = {}, { extras = '', edicion = false } = {}) {
  return `<div class="form-grid">
    ${campoHtml({ nombre: 'nombre', etiqueta: 'Nombre', valor: u.nombre, requerido: true, atributos: 'maxlength="80" autocomplete="off"' })}
    ${campoHtml({ nombre: 'apellido', etiqueta: 'Apellido', valor: u.apellido, requerido: true, atributos: 'maxlength="80" autocomplete="off"' })}
    ${campoHtml({ nombre: 'rut', etiqueta: 'RUT', valor: u.rut ? formatearRut(u.rut) : '', requerido: true, atributos: 'placeholder="12.345.678-9" maxlength="12" autocomplete="off"' })}
    ${campoHtml({ nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', valor: u.telefono, atributos: 'placeholder="+56 9 1234 5678"' })}
    ${campoHtml({ nombre: 'email', etiqueta: 'Email', tipo: 'email', valor: u.email, requerido: true, completo: true, atributos: 'maxlength="150" autocomplete="off"' })}
    ${extras}
    <div class="campo completo">
      <label for="campo-password">${edicion ? 'Nueva contraseña' : 'Contraseña inicial'}</label>
      <div class="input-con-accion">
        <input class="input" id="campo-password" name="password" type="text" autocomplete="new-password"
               placeholder="${edicion ? 'Dejar vacío para mantener la actual' : 'Mínimo 8 caracteres, con letras y números'}" />
        <button type="button" class="btn btn-secundario btn-sm" data-generar-password>Generar</button>
      </div>
      <span class="ayuda">${edicion
        ? 'Entrégala al usuario por un canal seguro.'
        : 'Entrégala al usuario por un canal seguro. Si la persona ya tiene cuenta en otro recinto, déjala vacía: se vinculará a su cuenta existente con el mismo email y RUT.'}</span>
      <span class="texto-error-campo"></span>
    </div>
  </div>`;
}

// Conecta el botón "Generar" del formulario abierto
function activarGeneradorPassword(modal) {
  const boton = modal.elemento.querySelector('[data-generar-password]');
  const input = modal.elemento.querySelector('[name="password"]');
  boton.addEventListener('click', () => {
    input.value = generarPassword();
    input.focus();
    input.select();
  });
}
