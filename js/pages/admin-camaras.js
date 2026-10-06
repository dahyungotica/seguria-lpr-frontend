// =====================================================================
// Admin de recinto > Cámaras y equipos (Raspberry Pi)
// =====================================================================
(function () {
  const usuario = iniciarPagina({ roles: ['admin_recinto'], activo: 'camaras', titulo: 'Cámaras y equipos' });
  if (!usuario) return;

  const tbodyDispositivos = document.getElementById('tabla-dispositivos');
  const tbodyCamaras = document.getElementById('tabla-camaras');
  let dispositivos = [];
  let camaras = [];

  async function cargar() {
    filaEstado(tbodyDispositivos, 7, 'Cargando equipos…');
    filaEstado(tbodyCamaras, 6, 'Cargando cámaras…');
    try {
      [dispositivos, camaras] = await Promise.all([api.get('/dispositivos'), api.get('/camaras')]);
      dibujarDispositivos();
      dibujarCamaras();
    } catch (error) {
      filaEstado(tbodyDispositivos, 7, error.message);
      filaEstado(tbodyCamaras, 6, error.message);
    }
  }

  // ---------- Dispositivos ----------
  function dibujarDispositivos() {
    if (dispositivos.length === 0) {
      filaEstado(tbodyDispositivos, 7, 'No hay equipos registrados.');
      return;
    }
    tbodyDispositivos.innerHTML = dispositivos
      .map(
        (d) => `
        <tr>
          <td><span class="principal">${escapar(d.nombre)}</span>
              <span class="secundario">${escapar(d.identificador)}</span></td>
          <td>${escapar(d.ip || '—')}</td>
          <td title="${escapar(formatearFecha(d.ultimo_heartbeat))}">${escapar(tiempoRelativo(d.ultimo_heartbeat))}</td>
          <td title="${escapar(formatearFecha(d.ultima_sincronizacion))}">${escapar(tiempoRelativo(d.ultima_sincronizacion))}</td>
          <td class="num">${d.total_camaras}</td>
          <td>${badge(d.estado)}</td>
          <td class="acciones">
            <button type="button" class="btn-texto" data-accion="editar" data-id="${d.id}">Editar</button>
            <button type="button" class="btn-texto" data-accion="api-key" data-id="${d.id}">Nueva API key</button>
            <button type="button" class="btn-texto peligro" data-accion="eliminar" data-id="${d.id}">Eliminar</button>
          </td>
        </tr>`
      )
      .join('');
  }

  // Muestra la API key una sola vez (el backend solo guarda su hash)
  function mostrarApiKey(dispositivo, apiKey) {
    const modal = abrirModal({
      titulo: 'API key del equipo',
      cuerpo: `
        <div class="alerta alerta-aviso">Copia esta clave ahora: <strong>no se volverá a mostrar</strong>.
          Si la pierdes, tendrás que generar una nueva.</div>
        <dl class="detalle-lista" style="margin-bottom:1rem">
          <dt>Equipo</dt><dd>${escapar(dispositivo.nombre)}</dd>
          <dt>Identificador</dt><dd><code>${escapar(dispositivo.identificador)}</code></dd>
        </dl>
        <div class="caja-secreto" id="api-key">${escapar(apiKey)}</div>
        <p class="texto-suave" style="font-size:.85rem">Configúrala en la Raspberry Pi con los headers
          <code>X-Dispositivo-Id</code> y <code>X-API-Key</code>.</p>
        <button type="button" class="btn btn-secundario btn-sm" id="btn-copiar">Copiar API key</button>`,
    });
    modal.elemento.querySelector('#btn-copiar').addEventListener('click', () => copiarTexto(apiKey));
  }

  function abrirFormularioDispositivo(d) {
    const edicion = Boolean(d);
    abrirModal({
      titulo: edicion ? 'Editar equipo' : 'Nuevo equipo Raspberry Pi',
      cuerpo: `<div class="form-grid">
        ${campoHtml({ nombre: 'nombre', etiqueta: 'Nombre', valor: d && d.nombre, requerido: true, completo: true, atributos: 'maxlength="80" placeholder="Ej: Raspberry Pi Acceso Principal"' })}
        ${campoHtml({ nombre: 'identificador', etiqueta: 'Identificador único', valor: d && d.identificador, requerido: true, atributos: 'maxlength="60" placeholder="Ej: RPI-AROMOS-02"', ayuda: 'Número de serie o código del equipo.' })}
        ${campoHtml({ nombre: 'ip', etiqueta: 'IP', valor: d && d.ip, atributos: 'placeholder="192.168.1.50"' })}
        ${edicion ? campoHtml({ nombre: 'estado', etiqueta: 'Estado', valor: d.estado, opciones: [['activo', 'Activo'], ['inactivo', 'Inactivo'], ['sin_conexion', 'Sin conexión']] }) : ''}
      </div>
      ${edicion ? '' : '<div class="alerta alerta-info">Al crearlo se generará una API key para que el equipo se conecte al sistema.</div>'}`,
      textoEnviar: edicion ? 'Guardar cambios' : 'Crear equipo',
      alEnviar: async (datos) => {
        if (edicion) {
          await api.put('/dispositivos/' + d.id, datos);
          toast('Equipo actualizado', 'exito');
        } else {
          const respuesta = await api.post('/dispositivos', datos);
          // Se abre después de cerrar el formulario
          setTimeout(() => mostrarApiKey(respuesta.dispositivo, respuesta.api_key), 0);
        }
        cargar();
      },
    });
  }

  async function regenerarApiKey(d) {
    const ok = await confirmar({
      titulo: 'Generar nueva API key',
      mensaje: `La clave actual de "${d.nombre}" dejará de funcionar de inmediato y tendrás que configurar la nueva en el equipo. ¿Continuar?`,
      textoConfirmar: 'Generar nueva',
      peligro: true,
    });
    if (!ok) return;
    try {
      const { api_key: apiKey } = await api.post(`/dispositivos/${d.id}/api-key`);
      mostrarApiKey(d, apiKey);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function eliminarDispositivo(d) {
    const ok = await confirmar({
      titulo: 'Eliminar equipo',
      mensaje: `¿Eliminar "${d.nombre}"? Sus cámaras quedarán sin equipo asignado. El historial de accesos se conserva.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.delete('/dispositivos/' + d.id);
      toast('Equipo eliminado', 'exito');
      cargar();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  // ---------- Cámaras ----------
  function dibujarCamaras() {
    if (camaras.length === 0) {
      filaEstado(tbodyCamaras, 6, 'No hay cámaras registradas.');
      return;
    }
    tbodyCamaras.innerHTML = camaras
      .map(
        (c) => `
        <tr>
          <td><span class="principal">${escapar(c.nombre)}</span>
              <span class="secundario">${escapar(c.ubicacion || '')}</span></td>
          <td>${c.sentido === 'entrada' ? 'Entrada' : 'Salida'}</td>
          <td>${escapar(c.ip || '—')}</td>
          <td>${escapar(c.dispositivo_nombre || 'Sin equipo')}</td>
          <td>${badge(c.estado)}</td>
          <td class="acciones">
            <button type="button" class="btn-texto" data-accion="editar-camara" data-id="${c.id}">Editar</button>
            <button type="button" class="btn-texto peligro" data-accion="eliminar-camara" data-id="${c.id}">Eliminar</button>
          </td>
        </tr>`
      )
      .join('');
  }

  function abrirFormularioCamara(c) {
    const edicion = Boolean(c);
    const opcionesEquipo = [['', 'Sin equipo'], ...dispositivos.map((d) => [d.id, d.nombre])];
    abrirModal({
      titulo: edicion ? 'Editar cámara' : 'Nueva cámara',
      cuerpo: `<div class="form-grid">
        ${campoHtml({ nombre: 'nombre', etiqueta: 'Nombre', valor: c && c.nombre, requerido: true, completo: true, atributos: 'maxlength="80" placeholder="Ej: Cámara Portón Norte"' })}
        ${campoHtml({ nombre: 'sentido', etiqueta: 'Sentido', valor: (c && c.sentido) || 'entrada', opciones: [['entrada', 'Entrada'], ['salida', 'Salida']], requerido: true })}
        ${campoHtml({ nombre: 'estado', etiqueta: 'Estado', valor: (c && c.estado) || 'activa', opciones: [['activa', 'Activa'], ['inactiva', 'Inactiva'], ['falla', 'Falla']] })}
        ${campoHtml({ nombre: 'ubicacion', etiqueta: 'Ubicación', valor: c && c.ubicacion, completo: true, atributos: 'maxlength="120" placeholder="Ej: Acceso vehicular norte"' })}
        ${campoHtml({ nombre: 'ip', etiqueta: 'IP', valor: c && c.ip, atributos: 'placeholder="192.168.1.60"' })}
        ${campoHtml({ nombre: 'dispositivo_id', etiqueta: 'Equipo', valor: c && c.dispositivo_id, opciones: opcionesEquipo, atributos: 'data-tipo="numero"' })}
        ${campoHtml({ nombre: 'url_stream', etiqueta: 'URL del stream', valor: c && c.url_stream, completo: true, atributos: 'maxlength="300" placeholder="rtsp://192.168.1.60:554/stream1"' })}
      </div>`,
      textoEnviar: edicion ? 'Guardar cambios' : 'Crear cámara',
      alEnviar: async (datos) => {
        if (edicion) await api.put('/camaras/' + c.id, datos);
        else await api.post('/camaras', datos);
        toast(edicion ? 'Cámara actualizada' : 'Cámara creada', 'exito');
        cargar();
      },
    });
  }

  async function eliminarCamara(c) {
    const ok = await confirmar({
      titulo: 'Eliminar cámara',
      mensaje: `¿Eliminar "${c.nombre}"? Si ya registró accesos no se podrá eliminar; en ese caso márcala como inactiva.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await api.delete('/camaras/' + c.id);
      toast('Cámara eliminada', 'exito');
      cargar();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  // ---------- Eventos ----------
  document.getElementById('btn-nuevo-dispositivo').addEventListener('click', () => abrirFormularioDispositivo());
  document.getElementById('btn-nueva-camara').addEventListener('click', () => abrirFormularioCamara());

  document.querySelector('.contenido').addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-accion]');
    if (!boton) return;
    const id = Number(boton.dataset.id);
    const d = dispositivos.find((x) => x.id === id);
    const c = camaras.find((x) => x.id === id);
    switch (boton.dataset.accion) {
      case 'editar': return abrirFormularioDispositivo(d);
      case 'api-key': return regenerarApiKey(d);
      case 'eliminar': return eliminarDispositivo(d);
      case 'editar-camara': return abrirFormularioCamara(c);
      case 'eliminar-camara': return eliminarCamara(c);
    }
  });

  cargar();
})();
