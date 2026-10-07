// =====================================================================
// Mi perfil (todos los roles)
//  - Mis recintos y roles: entrar con otro perfil sin volver a iniciar sesión.
//    El administrador de recinto puede agregarse roles (ej. también es guardia
//    o propietario) en los recintos que administra.
//  - Mis datos y cambio de contraseña.
// =====================================================================
(function () {
  const usuario = iniciarPagina({
    roles: ['admin_plataforma', 'admin_recinto', 'propietario', 'guardia'],
    activo: 'perfil',
    titulo: 'Mi perfil',
  });
  if (!usuario) return;

  const listaPerfiles = document.getElementById('lista-perfiles');
  const botonEditarRoles = document.getElementById('btn-editar-roles');
  const formDatos = document.getElementById('form-datos');
  const formPassword = document.getElementById('form-password');
  let perfil = null;

  // ---------- Recintos y roles ----------
  function pintarRoles() {
    if (usuario.rol === 'admin_plataforma') {
      document.getElementById('descripcion-roles').textContent =
        'Eres administrador de la plataforma: gestionas todos los recintos y no trabajas dentro de uno en particular.';
      listaPerfiles.innerHTML = '';
      return;
    }
    pintarPerfiles(listaPerfiles, {
      actual: { recinto_id: usuario.recinto_id, rol: usuario.rol },
      alElegir: entrarConPerfil,
    });
    botonEditarRoles.classList.toggle('oculto', !perfil.roles_editables);
    // El botón "Cambiar perfil" del header aparece si ahora tiene más de un perfil
    document.getElementById('btn-cambiar-recinto').classList.toggle('oculto', totalPerfiles() <= 1);
  }

  async function abrirEdicionRoles() {
    let opciones;
    try {
      opciones = await api.get('/usuarios/opciones');
    } catch (error) {
      toast(error.message, 'error');
      return;
    }
    const modal = abrirModal({
      titulo: 'Editar mis roles',
      ancho: true,
      cuerpo: `<div class="form-grid">${seccionRolesHtml(opciones, { vinculos: perfil.roles_editables, propio: true })}</div>`,
      textoEnviar: 'Guardar mis roles',
      alEnviar: async (_, form) => {
        perfil = await api.put('/perfil/roles', { roles: leerRoles(form) });
        await refrescarSesion();
        pintarRoles();
        toast('Tus roles se actualizaron. Usa "Cambiar perfil" para entrar con otro rol.', 'exito');
      },
    });
    activarSeccionRoles(modal);
  }

  // ---------- Mis datos ----------
  function pintarDatos() {
    document.getElementById('campos-datos').innerHTML = `
      ${campoHtml({ nombre: 'nombre', etiqueta: 'Nombre', valor: perfil.nombre, requerido: true, atributos: 'maxlength="80"' })}
      ${campoHtml({ nombre: 'apellido', etiqueta: 'Apellido', valor: perfil.apellido, requerido: true, atributos: 'maxlength="80"' })}
      ${campoHtml({ nombre: 'email', etiqueta: 'Email', tipo: 'email', valor: perfil.email, requerido: true, atributos: 'maxlength="150"', ayuda: 'Es el correo con que inicias sesión.' })}
      ${campoHtml({ nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', valor: perfil.telefono, atributos: 'placeholder="+56 9 1234 5678"' })}
      <div class="campo">
        <span class="etiqueta-dato">RUT</span>
        <span class="dato-fijo">${escapar(formatearRut(perfil.rut))}</span>
        <span class="ayuda">Si tu RUT está mal, pídele al administrador que lo corrija.</span>
      </div>`;
  }

  // Envía un formulario simple mostrando los errores dentro de él
  async function enviar(form, accion) {
    const cajaError = form.querySelector('[data-error]');
    const boton = form.querySelector('[type="submit"]');
    limpiarErroresFormulario(form);
    cajaError.classList.add('oculto');
    boton.disabled = true;
    try {
      await accion(datosFormulario(form));
    } catch (error) {
      const detalles = error.datos && error.datos.detalles;
      if (detalles) mostrarErroresFormulario(form, detalles);
      cajaError.textContent = detalles ? 'Revisa los campos marcados.' : error.message;
      cajaError.classList.remove('oculto');
    } finally {
      boton.disabled = false;
    }
  }

  formDatos.addEventListener('submit', (e) => {
    e.preventDefault();
    enviar(formDatos, async (datos) => {
      perfil = await api.put('/perfil', datos);
      await refrescarSesion();
      document.querySelector('.usuario-nombre').textContent = perfil.nombre + ' ' + perfil.apellido;
      toast('Datos guardados', 'exito');
    });
  });

  formPassword.addEventListener('submit', (e) => {
    e.preventDefault();
    enviar(formPassword, async (datos) => {
      if (!datos.password_actual || !datos.password) throw new Error('Completa las contraseñas.');
      if (datos.password !== datos.confirmar) throw new Error('Las contraseñas nuevas no coinciden.');
      await api.put('/perfil/password', { password_actual: datos.password_actual, password: datos.password });
      formPassword.reset();
      toast('Contraseña actualizada', 'exito');
    });
  });

  botonEditarRoles.addEventListener('click', abrirEdicionRoles);

  // ---------- Inicio ----------
  (async () => {
    try {
      [perfil] = await Promise.all([api.get('/perfil'), usuario.rol === 'admin_plataforma' ? null : refrescarSesion()]);
      pintarDatos();
      pintarRoles();
      // Desde "Mis roles" en Personas y unidades se llega con #roles: se abre el editor directamente
      if (location.hash === '#roles' && perfil.roles_editables) abrirEdicionRoles();
    } catch (error) {
      toast(error.message, 'error');
    }
  })();
})();
