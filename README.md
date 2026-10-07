# SegurIA-LPR – Frontend

Interfaz web de **SegurIA-LPR**, sistema de control de acceso vehicular por reconocimiento de patentes (LPR). Proyecto Capstone – Duoc UC.

- **Stack:** HTML + CSS + JavaScript vanilla (sin frameworks ni build).
- **Hosting:** Netlify.
- **Backend:** repositorio aparte → [seguria-lpr-backend](https://github.com/dahyungotica/seguria-lpr-backend).

> Estado actual: login con redirección por rol y las secciones de los cuatro roles completas.

## Secciones disponibles

| Rol | Sección | Qué permite |
|---|---|---|
| Admin de plataforma | Recintos | Crear, editar, buscar y activar/desactivar recintos |
| Admin de plataforma | Administradores | Crear y editar administradores marcando **todos los recintos a su cargo** en un solo formulario; generar contraseña, filtrar por recinto |
| Admin de plataforma | Accesos de recintos | Historial de accesos de todos los recintos con filtro por recinto; cada consulta queda en la auditoría (HU-23) |
| Admin de plataforma | Auditoría | Bitácora de todos los recintos y de las acciones de plataforma |
| Admin de recinto | Panel | Accesos de hoy, gráfico de 7 días, resumen del recinto, últimas detecciones en tiempo real y estado de equipos |
| Admin de recinto | Personas y unidades | Pestañas de propietarios (con sus patentes), guardias, administradores y unidades. **Un solo formulario por persona**: datos básicos + roles (Administrador, Guardia, Propietario con su unidad) en cada recinto que administra. Botón **Vehículos y visitas** para gestionarlos a nombre de un propietario que no puede usar la plataforma |
| Admin de recinto | Cámaras y equipos | Gestionar cámaras y Raspberry Pi, con API key que se muestra una sola vez |
| Admin de recinto | Historial de accesos | Filtros por fecha, patente, resultado, cámara y sentido; detalle con captura y zoom |
| Admin de recinto | Notificación de cambios | Cambios de vehículos (antes → después), visitas programadas y accesos no autorizados; marcar como leídas, contador en el menú |
| Admin de recinto | Auditoría | Pestañas «Cambios de propietarios» (HU-26) y «Bitácora completa» (HU-5), con detalle antes/después |
| Propietario | Mis vehículos | Agregar, editar, activar/desactivar y eliminar vehículos sin aprobación (se notifica al admin) |
| Propietario | Mis visitas | Programar visitas de hasta 24 horas con patente opcional, editarlas y cancelarlas (el admin puede dar hasta 30 días, HU-28) |
| Propietario | Historial de accesos | Solo los accesos de sus vehículos y visitas |
| Guardia | Monitor en vivo | Captura siempre visible con zoom, detecciones en tiempo real, visitas de hoy; atiende las alertas autorizando (detalle obligatorio) o rechazando (HU-31) |
| Guardia | Historial de accesos | Historial del recinto; puede autorizar desde el detalle un acceso denegado |
| Guardia | Propietarios | Consulta de solo lectura: unidad, contacto y patentes |
| Todos | Mi perfil | Sus datos, cambio de contraseña y sus recintos y roles (entrar con otro perfil). El admin de recinto puede **agregarse como guardia o propietario** en sus recintos |

## Documentación

`documentation/SegurIA-LPR_Presentacion_Plataforma.docx`: documento de presentación de la plataforma (qué es, cómo funciona, roles y recorrido por cada pantalla).
`documentation/SegurIA-LPR_MER_final.png`: MER final con los cambios respecto al MER original.
Ambos archivos están también en el repositorio del backend.

## Estructura

```
seguria-lpr-frontend/
├── index.html              # Login
├── pages/
│   ├── plataforma/         # Admin de plataforma: recintos, administradores
│   ├── admin/              # Admin de recinto: panel, personas y unidades, cámaras, historial, notificaciones
│   ├── perfil.html         # Mi perfil (todos los roles)
│   ├── propietario/        # Propietario: vehículos, visitas, historial
│   └── guardia/            # Guardia: monitor, historial, propietarios
├── css/
│   ├── base.css            # Variables de color y componentes comunes
│   ├── login.css           # Pantalla de login
│   ├── layout.css          # Sidebar + header de páginas internas
│   └── components.css      # Tablas, modales, badges, pestañas, indicadores, toasts
├── js/
│   ├── config.js           # URL del backend según el ambiente
│   ├── auth.js             # Sesión: login, logout, requireRole()
│   ├── api.js              # fetch con token JWT (401 → vuelve al login)
│   ├── layout.js           # Genera sidebar y header según el rol
│   ├── ui.js               # Utilidades: modales, toasts, formato, paginación
│   ├── usuarios-form.js    # Formulario de persona compartido (datos + roles por recinto)
│   ├── socket.js           # Cliente Socket.io (tiempo real)
│   ├── login.js            # Lógica del formulario de login
│   ├── autorizacion.js     # Modal de autorización manual (guardia)
│   ├── formularios-propietario.js # Formularios de vehículo y visita (propietario y admin)
│   └── pages/              # Lógica de cada sección (plataforma-*, admin-*, propietario-*, guardia-*, historial.js)
├── assets/                 # Logo e imágenes
├── documentation/          # Documento de presentación de la plataforma
└── netlify.toml
```

## Correr en local

1. Levanta el backend en `http://localhost:3000` (ver README del backend).
2. Abre **esta carpeta** (`seguria-lpr-frontend`) en VS Code.
3. Con la extensión **Live Server**, clic derecho en `index.html` → *Open with Live Server*.
   Se abrirá en `http://127.0.0.1:5500`.

> No abras el HTML con doble clic (`file://`): el navegador bloquea las peticiones al backend.
> Si usas otro puerto, agrégalo a `FRONTEND_URL` en el `.env` del backend (CORS).

`js/config.js` detecta el ambiente por el hostname: en `localhost`/`127.0.0.1` usa `http://localhost:3000`; en cualquier otro dominio usa la URL de Render.

### Usuarios de prueba (solo desarrollo)

| Rol | Email | Contraseña | Página inicial |
|---|---|---|---|
| Admin de plataforma | `admin@seguria-lpr.cl` | `Seguria2026!` | `pages/plataforma/recintos.html` |
| Admin de recinto | `recinto@seguria.cl` | `Seguria2026!` | `pages/admin/panel.html` |
| Propietario | `propietario@seguria.cl` | `Seguria2026!` | `pages/propietario/vehiculos.html` |
| Guardia | `guardia@seguria.cl` | `Seguria2026!` | `pages/guardia/monitor.html` |

## Cómo funciona la sesión

- Cada persona tiene **una sola cuenta**, aunque tenga varios roles o recintos (ej. administradora de 3 recintos y guardia en 1).
  Cada recinto + rol es un **perfil**: con varios, después de iniciar sesión elige con cuál entrar y puede cambiarlo
  con el botón **Cambiar perfil** del encabezado o desde **Mi perfil**, sin volver a escribir la contraseña (HU-19, HU-20).

- Al iniciar sesión se guardan `seguria_token` y `seguria_usuario` en `localStorage`.
- Cada página interna llama a `iniciarPagina({ roles: [...] })`, que usa `requireRole()`:
  sin sesión → vuelve al login; rol distinto → va a la página de su propio rol.
- Si el backend responde `401`, `api.js` cierra la sesión y vuelve al login.
- Si ya hay una sesión válida al abrir `index.html`, redirige directo a la página del rol.

## Deploy en Netlify

1. En Netlify: **Add new site → Import an existing project** → conectar este repositorio de GitHub.
2. Configuración de build:
   - **Build command:** (vacío)
   - **Publish directory:** `.` (ya está definido en `netlify.toml`)
3. Deploy. Anota la URL (ej. `https://seguria-lpr.netlify.app`).
4. En Render, agrega esa URL en la variable `FRONTEND_URL` del backend (CORS).
5. Si tu servicio de Render no se llama `seguria-lpr-backend`, actualiza `URL_PRODUCCION` en `js/config.js`.
