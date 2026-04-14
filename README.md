
## 🎯 Descripción General

**CeroEspera** es una plataforma de emergencias vehiculares que conecta:
- **Clientes/Conductores** (app mobile) → reportan incidentes
- **Talleres/Coordinadores** (web dashboard) → asignan técnicos, gestionan respuestas
- **Backend centralizado** (API REST) → orquesta la comunicación, almacena datos

---


### Infra (Docker & Config)

📁 **Raíz del proyecto**
- `docker-compose.yml` – Orquestación principal de servicios
- `.env` – Variables de entorno activas
- `.env.example` – Plantilla de variables

**Servicios**:
- FastAPI backend
- PostgreSQL
- (Nginx para web si está configurado)

---

## Requisitos Globales

- **Docker** & **Docker Compose** (v2.0+)
- **Python** 3.11+ (solo si corre backend sin contenedor)
- **Flutter** 3.35+ & **Dart** 3.9+ (solo para mobile, debe incluir Android SDK)
- **Node.js** 20.x LTS (solo para web)
- **npm** 10.x (solo para web)

---

---

## 🚀 Arranque Rápido (Docker)

### 1. Configurar Variables de Entorno

```bash
# desde la raiz del proyecto
cp .env.example .env
# Editar .env con datos reales (DB_PASSWORD, JWT_SECRET, etc.)
```

### 2. Levantar Backend + PostgreSQL

```bash
docker compose up --build
```

**Espera el mensaje:** `Application startup complete` en los logs.

### 3. Verificar Servicios

- **API Salud:** `http://localhost:8000/api/v1/salud`
- **Swagger UI:** `http://localhost:8000/docs`
- **PostgreSQL:** localhost:5432 (usar credenciales de `.env`)

### 4. Detener Servicios

```bash
docker compose down
```

---

## Backend: Estructura y Arquitectura

### Estructura de Carpetas

```
backend/
├── app/
│   ├── main.py                    # Punto de entrada FastAPI
│   ├── api/
│   │   └── v1/
│   │       ├── router.py          # Agregador de routers
│   │       └── endpoints/
│   │           ├── autenticacion.py (POST /autenticacion/iniciar-sesion)
│   │           ├── clientes.py    (POST /clientes)
│   │           ├── vehiculos.py   (POST/GET /vehiculos)
│   │           ├── incidentes.py  (POST /incidentes)
│   │           ├── talleres.py
│   │           ├── tecnicos.py
│   │           └── salud.py       (GET /salud)
│   ├── models/
│   │   ├── cliente.py
│   │   ├── vehiculo.py
│   │   ├── incidente.py
│   │   ├── tecnico.py
│   │   └── taller.py
│   ├── schemas/
│   │   ├── autenticacion.py       (SolicitudInicioSesion, RespuestaToken)
│   │   ├── cliente.py
│   │   ├── vehiculo.py            (VehiculoCrear, VehiculoRespuesta)
│   │   ├── incidente.py           (IncidenteCrear, IncidenteRespuesta)
│   │   └── otros schemas
│   ├── services/
│   │   ├── autenticacion_servicio.py
│   │   ├── vehiculo_servicio.py
│   │   ├── incidente_servicio.py
│   │   └── otros servicios
│   ├── api/
│   │   ├── deps.py                (obtener_cliente_actual, get_db, etc.)
│   │   └── v1/
│   ├── utils/
│   │   └── seguridad.py           (JWT, hashing)
│   └── config.py                  (Settings con Pydantic)
├── Dockerfile
├── requirements.txt
└── .dockerignore
```



### Tecnologías Backend

- **FastAPI** – Framework REST moderno, async
- **SQLAlchemy** – ORM, modelos
- **Pydantic** – Validación schemas
- **PostgreSQL** – BD relacional
- **PyJWT** – Autenticación con bearer tokens
- **Alembic** – Migraciones BD

---

## 🔧 Comandos Útiles

### Backend (Docker)

```bash
# Build y run
docker compose up --build

# Solo run (sin rebuild)
docker compose up

# Ver logs
docker compose logs -f backend

# Detener
docker compose down

# Limpiar volúmenes (cuidado: borra datos)
docker compose down -v
```

### Backend (Local, sin Docker)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Web Frontend (Angular)

```bash
cd frontend

# Instalar dependencias
npm install

# Dev server (hot reload)
npm start

# Build producción
npm run build

# Tests unitarios
npm run test

# Docker dev
docker build -f Dockerfile.dev -t app-talleres:dev .
docker run -p 4200:4200 -v ${PWD}/src:/app/src app-talleres:dev
```

### Mobile (Flutter)

Ver [mobile/README.md](mobile/README.md).

```bash
cd mobile

# Configurar teléfono
adb reverse tcp:8000 tcp:8000

# Run en dispositivo
flutter run -d <device_id>

# Hot reload / Hot restart
# Presiona 'r' en terminal (hot reload)
# Presiona 'R' en terminal (hot restart)
```






