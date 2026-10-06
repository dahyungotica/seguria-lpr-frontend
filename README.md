# SegurIA-LPR – Frontend

Interfaz web de **SegurIA-LPR**, sistema de control de acceso vehicular por reconocimiento de patentes (LPR). Proyecto Capstone – Duoc UC.

- **Stack:** HTML + CSS + JavaScript vanilla (sin frameworks ni build).
- **Hosting:** Netlify.
- **Backend:** repositorio aparte → [seguria-lpr-backend](https://github.com/dahyungotica/seguria-lpr-backend).

> Estado actual: login funcional con redirección por rol y protección de páginas. Las secciones internas son esqueletos.

## Estructura

```
seguria-lpr-frontend/
├── index.html              # Login
├── pages/
│   ├── plataforma/         # Admin de plataforma: recintos, administradores
│   ├── admin/              # Admin de recinto: panel, propietarios, cámaras, historial, notificaciones
│   ├── propietario/        # Propietario: vehículos, visitas, historial
│   └── guardia/            # Guardia: monitor, historial, propietarios
├── css/
│   ├── base.css            # Variables de color y componentes comunes
│   ├── login.css           # Pantalla de login
│   └── layout.css          # Sidebar + header de páginas internas
├── js/
│   ├── config.js           # URL del backend según el ambiente
│   ├── auth.js             # Sesión: login, logout, requireRole()
│   ├── api.js              # fetch con token JWT (401 → vuelve al login)
│   ├── layout.js           # Genera sidebar y header según el rol
│   ├── socket.js           # Cliente Socket.io (tiempo real)
│   └── login.js            # Lógica del formulario de login
├── assets/                 # Logo e imágenes
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
| Admin de plataforma | `admin@seguria.cl` | `Seguria2026!` | `pages/plataforma/recintos.html` |
| Admin de recinto | `recinto@seguria.cl` | `Seguria2026!` | `pages/admin/panel.html` |
| Propietario | `propietario@seguria.cl` | `Seguria2026!` | `pages/propietario/vehiculos.html` |
| Guardia | `guardia@seguria.cl` | `Seguria2026!` | `pages/guardia/monitor.html` |

## Cómo funciona la sesión

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
