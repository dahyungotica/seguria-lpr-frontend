// =====================================================================
// Formulario de persona compartido (administradores, guardias y propietarios)
// Requiere: ui.js
//
// Una persona tiene una sola cuenta y uno o varios roles por recinto.
// El formulario tiene los datos básicos + la sección "Roles por recinto",
// donde se marca si es Administrador, Guardia y/o Propietario en cada recinto.
// =====================================================================

// Orden en que se muestran los roles
const ROLES_FORMULARIO = ['admin_recinto', 'guardia', 'propietario'];

// extras: HTML adicional (se inserta antes de la contraseña)
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
        ? 'Entrégala a la persona por un canal seguro.'
        : 'Entrégala a la persona por un canal seguro. Si ya tiene cuenta (por ejemplo, es propietaria en otro recinto), déjala vacía: se le agregan los roles a su cuenta existente con el mismo email y RUT.'}</span>
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

// ---------- Roles por recinto ----------

// Sección de roles.
//   opciones:     respuesta de GET /usuarios/opciones -> { roles, recintos: [{ id, nombre, comuna, activo, unidades }] }
//   vinculos:     roles actuales de la persona [{ recinto_id, rol, unidad_id }]
//   preseleccion: { recinto_id, rol } a marcar en una persona nueva (ej. desde la pestaña Guardias)
//   propio:       true si es la cuenta de quien edita (no puede quitarse su rol de administrador)
function seccionRolesHtml(opciones, { vinculos = [], preseleccion = null, propio = false } = {}) {
  const tiene = (recintoId, rol) =>
    vinculos.find((v) => v.recinto_id === recintoId && v.rol === rol) ||
    (preseleccion && preseleccion.recinto_id === recintoId && preseleccion.rol === rol ? {} : null);
  const soloAdministrador = opciones.roles.length === 1;

  // Admin de plataforma: lista simple de recintos a cargo
  if (soloAdministrador) {
    const filas = opciones.recintos
      .filter((r) => r.activo || tiene(r.id, 'admin_recinto'))
      .map(
        (r) => `
        <label class="check-recinto" data-recinto="${r.id}">
          <input type="checkbox" data-rol="admin_recinto" ${tiene(r.id, 'admin_recinto') ? 'checked' : ''} />
          <span><strong>${escapar(r.nombre)}</strong>
            <span class="secundario">${escapar([r.comuna, r.activo ? '' : 'Recinto inactivo'].filter(Boolean).join(' · '))}</span></span>
        </label>`
      )
      .join('');
    return `
      <fieldset class="roles-recintos completo">
        <legend>Recintos a su cargo <span class="obligatorio" aria-hidden="true">*</span></legend>
        <p class="ayuda">Marca uno o más recintos. Con una sola cuenta administrará todos los que marques.</p>
        <div class="lista-check-recintos">${filas || '<p class="texto-suave">Primero crea un recinto activo.</p>'}</div>
      </fieldset>`;
  }

  // Admin de recinto: por cada recinto que administra, los 3 roles
  const bloques = opciones.recintos
    .map((r, i) => {
      const unidadActual = (vinculos.find((v) => v.recinto_id === r.id && v.rol === 'propietario') || {}).unidad_id;
      const unidades = (r.unidades || []).filter((u) => u.activo || u.id === unidadActual);
      const chips = ROLES_FORMULARIO.filter((rol) => opciones.roles.includes(rol))
        .map((rol) => {
          const marcado = Boolean(tiene(r.id, rol));
          const bloqueado = propio && rol === 'admin_recinto' && marcado;
          const sinUnidades = rol === 'propietario' && unidades.length === 0;
          return `<label class="chip-check${bloqueado || sinUnidades ? ' deshabilitado' : ''}"
                    title="${bloqueado ? 'No puedes quitarte tu propio rol de administrador' : sinUnidades ? 'Este recinto aún no tiene unidades' : ''}">
                    <input type="checkbox" data-rol="${rol}" ${marcado ? 'checked' : ''} ${bloqueado || (sinUnidades && !marcado) ? 'disabled' : ''} />
                    <span>${NOMBRE_ROL_CORTO[rol]}</span></label>`;
        })
        .join('');
      const visibleUnidad = Boolean(tiene(r.id, 'propietario'));
      const opcionesUnidad = ['<option value="">Selecciona la unidad…</option>']
        .concat(unidades.map((u) => `<option value="${u.id}" ${u.id === unidadActual ? 'selected' : ''}>${escapar(u.identificador)}${u.activo ? '' : ' (inactiva)'}</option>`))
        .join('');
      return `
        <div class="rol-recinto" data-recinto="${r.id}">
          <div class="rol-recinto-nombre"><strong>${escapar(r.nombre)}</strong>${i === 0 && opciones.recintos.length > 1 ? '<span class="badge badge-info">Recinto actual</span>' : ''}</div>
          <div class="rol-opciones">${chips}</div>
          <label class="rol-unidad${visibleUnidad ? '' : ' oculto'}">
            <span>Unidad donde vive</span>
            <select class="input" data-unidad aria-label="Unidad en ${escapar(r.nombre)}">${opcionesUnidad}</select>
          </label>
        </div>`;
    })
    .join('');

  return `
    <fieldset class="roles-recintos completo">
      <legend>${propio ? 'Mis roles' : 'Roles'} en ${opciones.recintos.length > 1 ? 'tus recintos' : 'el recinto'} <span class="obligatorio" aria-hidden="true">*</span></legend>
      <p class="ayuda">${propio
        ? 'Marca si también eres guardia o propietario. Usarás la misma cuenta y elegirás con qué perfil entrar.'
        : 'Marca uno o más roles. La persona usa una sola cuenta para todos y elige con cuál entrar.'}</p>
      ${bloques}
    </fieldset>`;
}

// Muestra el selector de unidad solo cuando "Propietario" está marcado
function activarSeccionRoles(modal) {
  modal.elemento.querySelectorAll('.rol-recinto').forEach((bloque) => {
    const check = bloque.querySelector('[data-rol="propietario"]');
    if (!check) return;
    check.addEventListener('change', () => {
      bloque.querySelector('.rol-unidad').classList.toggle('oculto', !check.checked);
      if (check.checked) bloque.querySelector('[data-unidad]').focus();
    });
  });
}

// Lee los roles marcados: [{ recinto_id, rol, unidad_id }]. Lanza un error si falta una unidad.
function leerRoles(form) {
  const roles = [];
  form.querySelectorAll('[data-recinto]').forEach((bloque) => {
    const recintoId = Number(bloque.dataset.recinto);
    bloque.querySelectorAll('input[data-rol]:checked').forEach((check) => {
      const rol = check.dataset.rol;
      let unidadId = null;
      if (rol === 'propietario') {
        unidadId = Number(bloque.querySelector('[data-unidad]').value) || null;
        if (!unidadId) {
          const nombre = bloque.querySelector('.rol-recinto-nombre strong').textContent;
          throw new Error(`Selecciona la unidad donde vive en ${nombre}.`);
        }
      }
      roles.push({ recinto_id: recintoId, rol, unidad_id: unidadId });
    });
  });
  return roles;
}

// Texto corto de un rol: "Propietario · Depto 304"
function textoRol(v) {
  return (NOMBRE_ROL_CORTO[v.rol] || v.rol) + (v.unidad ? ' · ' + v.unidad : '');
}

// Etiquetas de roles para las tablas
function chipsRoles(vinculos) {
  return vinculos
    .map((v) => `<span class="chip-rol chip-${v.rol}${v.activo === false ? ' inactivo' : ''}">${escapar(textoRol(v))}</span>`)
    .join('');
}
