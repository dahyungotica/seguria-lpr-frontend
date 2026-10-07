// =====================================================================
// Utilidades de interfaz compartidas por las secciones:
// formato de datos, badges, toasts, modales, confirmaciones,
// formularios y paginación.
// =====================================================================

const ZONA_HORARIA = 'America/Santiago';

// ---------- Formato ----------

// Escapa texto para insertarlo en HTML de forma segura (evita XSS)
function escapar(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatearFecha(iso, { conHora = true } = {}) {
  if (!iso) return '—';
  const opciones = { timeZone: ZONA_HORARIA, day: '2-digit', month: '2-digit', year: 'numeric' };
  if (conHora) Object.assign(opciones, { hour: '2-digit', minute: '2-digit' });
  return new Date(iso).toLocaleString('es-CL', opciones);
}

// "hace 5 min", "hace 3 h", "hace 2 días"
function tiempoRelativo(iso) {
  if (!iso) return 'Nunca';
  const segundos = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (segundos < 60) return 'hace un momento';
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}

// Fecha de hoy en Chile en formato YYYY-MM-DD (para inputs de fecha)
function fechaHoyISO(desplazamientoDias = 0) {
  const fecha = new Date(Date.now() + desplazamientoDias * 86400000);
  return fecha.toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA });
}

// Fecha para un <input type="datetime-local"> (hora local del navegador): "2026-10-06T18:30"
function fechaParaInput(fecha) {
  const d = new Date(fecha);
  const dosDigitos = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}T${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
}

// Valor de un datetime-local -> ISO en UTC para enviar al backend
function fechaDesdeInput(valor) {
  return valor ? new Date(valor).toISOString() : null;
}

// Hora corta "18:30"
function formatearHora(iso) {
  return new Date(iso).toLocaleTimeString('es-CL', { timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit' });
}

// "12345678-9" -> "12.345.678-9"
function formatearRut(rut) {
  if (!rut) return '—';
  const [cuerpo, dv] = String(rut).split('-');
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}

function formatearNumero(n) {
  return Number(n || 0).toLocaleString('es-CL');
}

function patenteChip(patente, activa = true) {
  return `<span class="patente-chip${activa ? '' : ' inactiva'}">${escapar(patente)}</span>`;
}

// ---------- Badges (siempre con texto, el color solo acompaña) ----------

const ESTADOS = {
  // Resultado de un acceso
  autorizado: ['Autorizado', 'exito'],
  denegado: ['Denegado', 'peligro'],
  autorizado_manual: ['Autorizado manual', 'alerta'],
  visita: ['Visita', 'info'],
  // Cámaras y dispositivos
  activa: ['Activa', 'exito'],
  inactiva: ['Inactiva', ''],
  falla: ['Falla', 'peligro'],
  activo: ['Activo', 'exito'],
  inactivo: ['Inactivo', ''],
  sin_conexion: ['Sin conexión', 'peligro'],
};

function badge(clave) {
  const [texto, tipo] = ESTADOS[clave] || [clave, ''];
  return `<span class="badge${tipo ? ' badge-' + tipo : ''}">${escapar(texto)}</span>`;
}

// Estado de una visita (calculado por el backend en estado_actual)
const ESTADOS_VISITA = {
  programada: ['Programada', 'info'],
  activa: ['En curso', 'exito'],
  finalizada: ['Finalizada', ''],
  cancelada: ['Cancelada', 'peligro'],
};

function badgeVisita(estado) {
  const [texto, tipo] = ESTADOS_VISITA[estado] || [estado, ''];
  return `<span class="badge${tipo ? ' badge-' + tipo : ''}">${escapar(texto)}</span>`;
}

function badgeActivo(activo) {
  return activo ? '<span class="badge badge-exito">Activo</span>' : '<span class="badge">Inactivo</span>';
}

// ---------- Toasts ----------

function toast(mensaje, tipo = 'info') {
  let contenedor = document.querySelector('.toasts');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.className = 'toasts';
    contenedor.setAttribute('role', 'status');
    contenedor.setAttribute('aria-live', 'polite');
    document.body.appendChild(contenedor);
  }
  const elemento = document.createElement('div');
  elemento.className = 'toast ' + tipo;
  elemento.textContent = mensaje;
  contenedor.appendChild(elemento);
  setTimeout(() => elemento.remove(), 4500);
}

// ---------- Modal ----------

const ICONO_CERRAR =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';

// Abre un modal. Si recibe alEnviar, el cuerpo se envuelve en un <form>:
//   alEnviar(datos, form) -> si lanza un error, se muestra en el modal sin cerrarlo.
// Devuelve { elemento, cerrar }.
// alCerrar(): opcional, se ejecuta cuando el modal se cierra (por cualquier vía).
function abrirModal({ titulo, cuerpo, alEnviar, alCerrar, textoEnviar = 'Guardar', textoCancelar = 'Cancelar', ancho = false, peligro = false }) {
  const anterior = document.activeElement;
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';

  const conFormulario = typeof alEnviar === 'function';
  const pie = conFormulario
    ? `<div class="modal-pie">
         <button type="button" class="btn btn-secundario" data-cerrar>${escapar(textoCancelar)}</button>
         <button type="submit" class="btn ${peligro ? 'btn-peligro' : 'btn-primario'}" data-enviar>
           <span class="spinner oculto" aria-hidden="true"></span><span>${escapar(textoEnviar)}</span>
         </button>
       </div>`
    : `<div class="modal-pie"><button type="button" class="btn btn-secundario" data-cerrar>Cerrar</button></div>`;

  const etiqueta = conFormulario ? 'form' : 'div';
  fondo.innerHTML = `
    <div class="modal${ancho ? ' ancho' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <div class="modal-cabecera">
        <h2 id="modal-titulo">${escapar(titulo)}</h2>
        <button type="button" class="modal-cerrar" data-cerrar aria-label="Cerrar">${ICONO_CERRAR}</button>
      </div>
      <${etiqueta} class="modal-form" novalidate>
        <div class="modal-cuerpo">
          <div class="alerta alerta-error oculto" role="alert" data-error></div>
          ${cuerpo}
        </div>
        ${pie}
      </${etiqueta}>
    </div>`;

  document.body.appendChild(fondo);
  document.body.style.overflow = 'hidden';

  function cerrar() {
    if (!fondo.isConnected) return;
    fondo.remove();
    document.removeEventListener('keydown', alPresionarTecla);
    if (!document.querySelector('.modal-fondo')) document.body.style.overflow = '';
    if (anterior && anterior.focus) anterior.focus();
    if (alCerrar) alCerrar();
  }

  // Con modales apilados, Escape cierra solo el que está encima
  function alPresionarTecla(e) {
    const modales = document.querySelectorAll('.modal-fondo');
    if (e.key === 'Escape' && modales[modales.length - 1] === fondo) cerrar();
  }

  document.addEventListener('keydown', alPresionarTecla);
  fondo.addEventListener('mousedown', (e) => {
    if (e.target === fondo) cerrar();
  });
  fondo.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrar));

  const form = fondo.querySelector('.modal-form');
  const cajaError = fondo.querySelector('[data-error]');

  if (conFormulario) {
    const boton = fondo.querySelector('[data-enviar]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      limpiarErroresFormulario(form);
      cajaError.classList.add('oculto');
      boton.disabled = true;
      boton.querySelector('.spinner').classList.remove('oculto');
      try {
        await alEnviar(datosFormulario(form), form);
        cerrar();
      } catch (error) {
        const detalles = error.datos && error.datos.detalles;
        if (detalles) mostrarErroresFormulario(form, detalles);
        cajaError.textContent = detalles ? 'Revisa los campos marcados.' : error.message;
        cajaError.classList.remove('oculto');
        cajaError.scrollIntoView({ block: 'nearest' });
      } finally {
        boton.disabled = false;
        boton.querySelector('.spinner').classList.add('oculto');
      }
    });
  }

  // Foco en el primer campo (o en el botón de cerrar)
  const primerCampo = fondo.querySelector('input:not([type=hidden]), select, textarea') || fondo.querySelector('[data-cerrar]');
  setTimeout(() => primerCampo.focus(), 0);

  return { elemento: fondo, cerrar };
}

// Pide confirmación. Devuelve una promesa con true/false.
function confirmar({ titulo, mensaje, textoConfirmar = 'Confirmar', peligro = false }) {
  return new Promise((resolver) => {
    let confirmado = false;
    const modal = abrirModal({
      titulo,
      cuerpo: `<p style="margin:0">${escapar(mensaje)}</p>`,
      textoEnviar: textoConfirmar,
      peligro,
      alEnviar: async () => {
        confirmado = true;
      },
    });
    // Se resuelve cuando el modal deja de existir
    const observador = new MutationObserver(() => {
      if (!document.body.contains(modal.elemento)) {
        observador.disconnect();
        resolver(confirmado);
      }
    });
    observador.observe(document.body, { childList: true });
  });
}

// ---------- Formularios ----------

// Lee los campos del formulario. Los vacíos se envían como null;
// los checkbox como true/false; los <input type=number> y data-tipo="numero" como número.
function datosFormulario(form) {
  const datos = {};
  form.querySelectorAll('input[name], select[name], textarea[name]').forEach((campo) => {
    if (campo.disabled) return;
    let valor;
    if (campo.type === 'checkbox') valor = campo.checked;
    else {
      valor = campo.value.trim();
      if (valor === '') valor = null;
      else if (campo.type === 'number' || campo.dataset.tipo === 'numero') valor = Number(valor);
    }
    datos[campo.name] = valor;
  });
  return datos;
}

function limpiarErroresFormulario(form) {
  form.querySelectorAll('.invalido').forEach((c) => c.classList.remove('invalido'));
  form.querySelectorAll('.texto-error-campo').forEach((s) => (s.textContent = ''));
}

// Marca los campos con error según la respuesta del backend: [{ campo, mensaje }]
function mostrarErroresFormulario(form, detalles) {
  for (const { campo, mensaje } of detalles) {
    const input = form.querySelector(`[name="${campo}"]`);
    if (!input) continue;
    input.classList.add('invalido');
    const span = input.closest('.campo') && input.closest('.campo').querySelector('.texto-error-campo');
    if (span && !span.textContent) span.textContent = mensaje;
  }
}

// HTML de un campo de formulario
function campoHtml({ nombre, etiqueta, tipo = 'text', valor = '', requerido = false, opciones = null, ayuda = '', completo = false, atributos = '' }) {
  const id = 'campo-' + nombre;
  let control;
  if (opciones) {
    const items = opciones
      .map(([v, t]) => `<option value="${escapar(v)}"${String(v) === String(valor ?? '') ? ' selected' : ''}>${escapar(t)}</option>`)
      .join('');
    control = `<select class="input" id="${id}" name="${nombre}" ${atributos}>${items}</select>`;
  } else if (tipo === 'textarea') {
    control = `<textarea class="input" id="${id}" name="${nombre}" rows="3" ${atributos}>${escapar(valor)}</textarea>`;
  } else {
    control = `<input class="input" id="${id}" name="${nombre}" type="${tipo}" value="${escapar(valor ?? '')}" ${atributos} />`;
  }
  return `
    <div class="campo${completo ? ' completo' : ''}">
      <label for="${id}">${escapar(etiqueta)}${requerido ? ' <span class="obligatorio" aria-hidden="true">*</span>' : ''}</label>
      ${control}
      ${ayuda ? `<span class="ayuda">${escapar(ayuda)}</span>` : ''}
      <span class="texto-error-campo"></span>
    </div>`;
}

// Contraseña segura aleatoria (letras + números + símbolo)
function generarPassword() {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const valores = crypto.getRandomValues(new Uint32Array(10));
  let password = '';
  for (const v of valores) password += caracteres[v % caracteres.length];
  return password + (valores[0] % 10) + '!';
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    toast('Copiado al portapapeles', 'exito');
  } catch (e) {
    toast('No se pudo copiar. Selecciona el texto y cópialo manualmente.', 'error');
  }
}

// ---------- Tablas y paginación ----------

// Fila única para estados de carga, vacío o error
function filaEstado(tbody, columnas, mensaje) {
  tbody.innerHTML = `<tr><td class="tabla-estado" colspan="${columnas}">${escapar(mensaje)}</td></tr>`;
}

// Dibuja la paginación. respuesta = { pagina, paginas, total }
function renderPaginacion(contenedor, respuesta, alCambiar) {
  const { pagina, paginas, total } = respuesta;
  contenedor.innerHTML = `
    <span>${formatearNumero(total)} resultado${total === 1 ? '' : 's'} · Página ${pagina} de ${paginas}</span>
    <div class="paginacion-botones">
      <button type="button" class="btn btn-secundario btn-sm" data-pag="${pagina - 1}" ${pagina <= 1 ? 'disabled' : ''}>Anterior</button>
      <button type="button" class="btn btn-secundario btn-sm" data-pag="${pagina + 1}" ${pagina >= paginas ? 'disabled' : ''}>Siguiente</button>
    </div>`;
  contenedor.querySelectorAll('[data-pag]').forEach((b) =>
    b.addEventListener('click', () => alCambiar(Number(b.dataset.pag)))
  );
}

// Ejecuta fn después de que el usuario deja de escribir
function conRetraso(fn, ms = 350) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn(...args), ms);
  };
}

// Arma "?a=1&b=2" ignorando valores vacíos
function queryString(parametros) {
  const p = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') p.set(clave, valor);
  }
  const texto = p.toString();
  return texto ? '?' + texto : '';
}

// Regiones de Chile (para formularios de recinto)
const REGIONES_CHILE = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
  'Metropolitana', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos',
  'Los Lagos', 'Aysén', 'Magallanes',
];
