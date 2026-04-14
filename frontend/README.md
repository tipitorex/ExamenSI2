# Web Frontend - Dashboard de Talleres (Guardian Pulse)

Aplicación Angular 21.2+ que permite a talleres de reparación gestionar técnicos, ver incidentes y coordinar respuestas de emergencia en tiempo real.

## Requisitos

- **Node.js** 20.x LTS
- **npm** 10.x o **pnpm**
- **Angular CLI** 21.2+
- **Backend FastAPI** corriendo en `http://localhost:8000`

### Instalación Rápida

```bash
# Instalar Node.js desde https://nodejs.org/
node --version
npm --version

# Instalar Angular CLI globalmente (opcional)
npm install -g @angular/cli@latest

# En la carpeta del proyecto
npm install
```

---

## 🏗️ Arquitectura

### Estructura de Carpetas

```
src/app/
├── layouts/
│   └── main-layout.component.ts     # Layout principal (header + sidebar)
│
├── pages/
│   ├── landing.component.ts         # Página inicio pública
│   ├── landing.component.html
│   ├── dashboard.component.ts       # Panel de control (protegido)
│   ├── dashboard.component.html
│   └── dashboard.component.scss
│
├── components/
│   ├── header.component.ts          # Navbar superior
│   ├── footer.component.ts          # Footer
│   ├── tecnico-list.component.ts    # Tabla/listado de técnicos
│   └── incidente-card.component.ts  # Card de incidente
│
├── services/
│   ├── auth.service.ts              # Login, session, token mgmt
│   ├── tecnico.service.ts           # CRUD técnicos
│   ├── incidente.service.ts         # Listar/actualizar incidentes
│   └── http-interceptor.ts          # Agregar Bearer token
│
├── models/
│   └── tipos.ts                     # Interfaces (TallerRespuesta, TecnicoRespuesta, etc)
│
├── guards/
│   └── auth.guard.ts                # Proteger rutas (/dashboard)
│
├── app.config.ts                    # HttpClient, Router, Interceptors
├── app.routes.ts                    # Definición de rutas
├── app.component.ts                 # Componente root
└── main.ts                          # Bootstrap
```

### Rutas

| Ruta | Componente | Auth | Descripción |
|------|-----------|------|-------------|
| `/` | LandingComponent | – | Página pública |
| `/dashboard` | DashboardComponent | ✓ | Panel de control |
| `/login` | LoginComponent | – | Form login (si aplica) |

---

## 🔧 Comandos Principales

### Desarrollo Local

```bash
cd frontend

# Instalar dependencias
npm install

# Servidor de desarrollo (hot reload)
npm start
# o
ng serve

# Abre http://localhost:4200 en el navegador
```

### Build para Producción

```bash
# Build optimizado
npm run build
# o
ng build

# Artefactos: frontend/dist/
```

### Tests

```bash
# Tests unitarios (Vitest)
npm run test
# o
ng test

# Tests e2e (si está configurado)
npm run e2e
```

### Linting

```bash
# Analizar código
npm run lint
```

### Docker

```bash
# Build imagen Docker
docker build -f Dockerfile -t app-talleres:latest .

# Run contenedor
docker run -p 4200:4200 app-talleres:latest

# Desarrollo con Docker (live reload)
docker build -f Dockerfile.dev -t app-talleres:dev .
docker run -p 4200:4200 -v ${PWD}/src:/app/src app-talleres:dev
```

---

## 🌐 Integración con Backend

### Base URL API

```typescript
// src/app/services/api.config.ts (crear si no existe)
export const API_BASE_URL = 'http://localhost:8000/api/v1';
```

### HttpInterceptor (Agregar token Bearer)

```typescript
// src/app/services/http-interceptor.ts
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  const token = localStorage.getItem('token_taller');
  if (token) {
    req = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }
  return next.handle(req);
}
```

### Endpoints Utilizados

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/talleres/iniciar-sesion` | POST | – | Login taller |
| `/talleres/perfil` | GET | ✓ | Perfil del taller actual |
| `/tecnicos` | GET | ✓ | Listar técnicos del taller |
| `/tecnicos` | POST | ✓ | Crear técnico |
| `/tecnicos/{id}` | PUT | ✓ | Actualizar disponibilidad |
| `/incidentes` | GET | ✓ | Listar incidentes asignados |

---

## 🎨 Diseño y Branding

### Colores (Guardian Pulse / CeroEspera)

```scss
$primary-blue: #0077CE;      // Azul principal
$orange-accent: #FF8F06;     // Naranja emergencia
$error-red: #BA1A1A;         // Rojo errores
$surface-light: #F9F9F9;     // Fondo claro
$text-primary: #1A1C1C;      // Texto principal
$text-secondary: #404752;    // Texto secundario
```

### Tipografía

- **Headlines**: Manrope (bold)
- **Body**: Inter (regular/medium)
- **Icons**: Material Symbols (Google Fonts)

### Responsive Breakpoints

```scss
$mobile: 720px;    // Stack vertical
$tablet: 1100px;   // 2 columnas
$desktop: 1440px;  // Layout completo
```

---

## 📱 Flujos Principales

### 1. Acceso a Landing

1. Usuario accede `http://localhost:4200/`
2. Página pública con información del servicio
3. Bot ón "Iniciar Sesión" → `/dashboard` (con guard)

### 2. Autenticación

1. Taller intenta acceder `/dashboard`
2. Guard verifica `AuthService.estaAutenticado()`
3. Si no está autenticado → Redirige a landing o login
4. Si está autenticado → Carga dashboard

### 3. Dashboard del Taller

1. Se carga `DashboardComponent`
2. `TecnicoService.obtenerTecnicos()` → Lista técnicos
3. `IncidenteService.obtenerIncidentes()` → Incidentes asignados
4. Mostrar:
   - Indicadores: técnicos disponibles, incidentes activos
   - Tabla de técnicos con botón cambiar disponibilidad
   - Lista de incidentes con estado

---

## 📦 Dependencias Principales

```json
{
  "dependencies": {
    "@angular/animations": "^21.0.0",
    "@angular/common": "^21.0.0",
    "@angular/compiler": "^21.0.0",
    "@angular/core": "^21.0.0",
    "@angular/forms": "^21.0.0",
    "@angular/platform-browser": "^21.0.0",
    "@angular/platform-browser-dynamic": "^21.0.0",
    "@angular/router": "^21.0.0",
    "rxjs": "^7.8.0",
    "tslib": "^2.6.0",
    "zone.js": "^0.14.0"
  },
  "devDependencies": {
    "@angular/cli": "^21.2.7",
    "@angular/compiler-cli": "^21.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## 🔐 Autenticación y Autorización

### AuthService

```typescript
// Métodos principales
iniciarSesion(email: string, contrasena: string): Observable<TallerTokenRespuesta>
obtenerPerfil(): Observable<TallerRespuesta>
obtenerTallerActual(): TallerRespuesta | null
estaAutenticado(): boolean
cerrarSesion(): void
obtenerToken(): string | null
```

### Guards

```typescript
// auth.guard.ts
canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
  if (authService.estaAutenticado()) {
    return true;
  }
  router.navigate(['/']);
  return false;
}
```

---

## 🏪 State Management

### Estado Local (Angular Services + localStorage)

```typescript
// Almacenar token
localStorage.setItem('token_taller', response.token_acceso);

// Acceder
const token = localStorage.getItem('token_taller');

// Borrar (logout)
localStorage.removeItem('token_taller');
```

### Para escalar (futuro: agregar NgRx si es necesario)

```bash
npm install @ngrx/store @ngrx/effects
```

---

## 🧪 Probar Flujo Completo

### 1. Backend corriendo

```bash
docker compose up
```

### 2. Iniciar frontend

```bash
cd frontend
npm install
npm start
```

### 3. Navegar en http://localhost:4200

1. Acceder `/` → Ver landing
2. NavBar → "Iniciar Sesión"
3. Form login: usar credenciales de un taller registrado en BD
4. Entrar a `/dashboard` → Ver técnicos e incidentes

---

## 📚 Documentación Detallada

Ver [ARQUITECTURA.md](ARQUITECTURA.md) para detalles técnicos, flujos y decisiones de diseño.

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| "Cannot GET /dashboard" | Verificar que AuthService tiene token en localStorage |
| "401 Unauthorized" | Token expirado; limpiar localStorage o re-login |
| "CORS error" | Backend debe tener corsMiddleware; ver `backend/app/main.py` |
| Port 4200 en uso | `ng serve --port 4300` |
| "Module not found" | `npm install`, `npm cache clean --force` |
| Build error | `npm run clean`, `npm install`, `npm run build` |

---

## 🚀 Roadmap

- [ ] Conectar datos reales de incidentes desde API
- [ ] Notificaciones en tiempo real (WebSockets o polling)
- [ ] Asignación inteligente de técnicos (matching)
- [ ] Mapa interactivo con Google Maps / Leaflet
- [ ] Catálogo de servicios/reparaciones
- [ ] Historial de incidentes resueltos
- [ ] Reportes y analíticas
- [ ] Tests unitarios completos
- [ ] E2E tests
