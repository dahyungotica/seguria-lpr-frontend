// =====================================================================
// Configuración global del frontend.
// Se detecta el ambiente por el hostname: en local se usa el backend en
// localhost:3000; en Netlify, el backend publicado en Render.
// =====================================================================
(function () {
  // URL del backend en Render (cámbiala si tu servicio tiene otro nombre)
  const URL_PRODUCCION = 'https://seguria-lpr-backend.onrender.com';
  const URL_DESARROLLO = 'http://localhost:3000';

  const host = window.location.hostname;
  const esLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  const backend = esLocal ? URL_DESARROLLO : URL_PRODUCCION;

  // Raíz del sitio, calculada desde la ubicación de este archivo (js/config.js).
  // Permite armar rutas correctas tanto en Live Server como en Netlify.
  const RAIZ = document.currentScript.src.replace(/js\/config\.js(\?.*)?$/, '');

  window.CONFIG = Object.freeze({
    API_URL: backend + '/api',
    SOCKET_URL: backend,
    RAIZ: RAIZ,
    ES_LOCAL: esLocal,
  });
})();
