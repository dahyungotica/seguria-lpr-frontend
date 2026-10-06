// =====================================================================
// Lógica de la pantalla de login (index.html)
// Requiere: config.js, auth.js y api.js
// =====================================================================

// Si ya hay una sesión válida, ir directo a la página del rol
if (haySesionValida()) {
  irAPaginaDeRol(obtenerUsuario().rol);
}

const formulario = document.getElementById('form-login');
const inputEmail = document.getElementById('email');
const inputPassword = document.getElementById('password');
const errorEmail = document.getElementById('email-error');
const errorPassword = document.getElementById('password-error');
const cajaError = document.getElementById('login-error');
const boton = document.getElementById('btn-login');
const spinner = document.getElementById('login-spinner');
const textoBoton = document.getElementById('login-texto');
const avisoServidor = document.getElementById('aviso-servidor');
const botonVer = document.getElementById('btn-ver-password');

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Mostrar / ocultar contraseña ----------
botonVer.addEventListener('click', () => {
  const mostrar = inputPassword.type === 'password';
  inputPassword.type = mostrar ? 'text' : 'password';
  botonVer.setAttribute('aria-pressed', String(mostrar));
  botonVer.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
  document.getElementById('icono-ver').classList.toggle('oculto', mostrar);
  document.getElementById('icono-ocultar').classList.toggle('oculto', !mostrar);
});

// ---------- Validación básica ----------
function marcarCampo(input, spanError, mensaje) {
  spanError.textContent = mensaje;
  input.classList.toggle('invalido', Boolean(mensaje));
  input.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
}

function validarFormulario() {
  const email = inputEmail.value.trim();
  const password = inputPassword.value;
  let valido = true;

  if (!email) {
    marcarCampo(inputEmail, errorEmail, 'Ingresa tu correo electrónico.');
    valido = false;
  } else if (!REGEX_EMAIL.test(email)) {
    marcarCampo(inputEmail, errorEmail, 'El correo no tiene un formato válido.');
    valido = false;
  } else {
    marcarCampo(inputEmail, errorEmail, '');
  }

  if (!password) {
    marcarCampo(inputPassword, errorPassword, 'Ingresa tu contraseña.');
    valido = false;
  } else {
    marcarCampo(inputPassword, errorPassword, '');
  }

  return valido;
}

// Limpia el error de un campo apenas el usuario lo corrige
inputEmail.addEventListener('input', () => marcarCampo(inputEmail, errorEmail, ''));
inputPassword.addEventListener('input', () => marcarCampo(inputPassword, errorPassword, ''));

// ---------- Estados de la interfaz ----------
function mostrarError(mensaje) {
  cajaError.textContent = mensaje;
  cajaError.classList.remove('oculto');
}

function ocultarError() {
  cajaError.textContent = '';
  cajaError.classList.add('oculto');
}

let temporizadorAviso = null;

function setCargando(cargando) {
  boton.disabled = cargando;
  spinner.classList.toggle('oculto', !cargando);
  textoBoton.textContent = cargando ? 'Ingresando…' : 'Ingresar';

  // Render (plan gratuito) puede tardar en "despertar": avisar si demora
  clearTimeout(temporizadorAviso);
  avisoServidor.classList.add('oculto');
  if (cargando) {
    temporizadorAviso = setTimeout(() => avisoServidor.classList.remove('oculto'), 4000);
  }
}

// ---------- Envío del formulario ----------
formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  ocultarError();

  if (!validarFormulario()) {
    (inputEmail.classList.contains('invalido') ? inputEmail : inputPassword).focus();
    return;
  }

  setCargando(true);
  try {
    const usuario = await login(inputEmail.value.trim().toLowerCase(), inputPassword.value);
    irAPaginaDeRol(usuario.rol);
  } catch (error) {
    if (error.status === 400) {
      mostrarError('Revisa el correo y la contraseña ingresados.');
    } else {
      // 401 (credenciales inválidas), 403 (cuenta desactivada) o error de conexión
      mostrarError(error.message);
    }
    inputPassword.value = '';
    inputPassword.focus();
    setCargando(false);
  }
});
