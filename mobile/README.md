# Mobile (Flutter) – App Cliente de Emergencias Vehiculares

Aplicación Flutter 3.35+ para clientes CeroEspera. Permite registrar vehículos, reportar incidentes de emergencia con geolocalización, y monitorear el estado de solicitudes.

## Requisitos

- **Flutter** 3.35+ & **Dart** 3.9+
- **Android SDK** (API 33+, configurado en Flutter)
- **ADB** (Android Debug Bridge)
- Dispositivo Android físico o emulador

### Instalación Rápida

```bash
# Verificar instalación
flutter --version
flutter doctor

# Si falta algo, instalar
flutter pub global activate fvm
```

---

## 🏗️ Arquitectura de Carpetas

```
lib/
├── main.dart                          # Punto de entrada (bootstrap)
├── app.dart                           # MaterialApp + todas las rutas
│
├── core/
│   ├── config/
│   │   └── api_config.dart           # baseUrl: http://127.0.0.1:8000/api/v1
│   └── theme/
│       └── app_theme.dart            # CeroEspera colors, TextTheme
│
├── features/
│   │
│   ├── auth/
│   │   ├── models/
│   │   │   ├── cliente_model.dart
│   │   │   └── auth_session.dart     # {token_acceso, tipo_token, cliente}
│   │   ├── services/
│   │   │   └── auth_api_service.dart # login, register, session mgmt
│   │   ├── pages/
│   │   │   ├── welcome_page.dart
│   │   │   ├── login_page.dart       # POST /autenticacion/iniciar-sesion
│   │   │   └── register_page.dart    # POST /clientes
│   │   └── widgets/
│   │       ├── gradient_primary_button.dart
│   │       ├── auth_text_field.dart
│   │       └── auth_top_brand.dart
│   │
│   ├── dashboard/
│   │   └── pages/
│   │       └── client_dashboard_page.dart # Pantalla principal post-login
│   │
│   ├── vehicles/
│   │   ├── models/
│   │   │   └── vehiculo_model.dart   # {id, placa, marca, modelo, anio?, color?}
│   │   ├── services/
│   │   │   └── vehiculo_api_service.dart # POST/GET /vehiculos (Bearer token)
│   │   └── pages/
│   │       └── vehicle_register_page.dart # Formulario registrar vehículo
│   │
│   ├── incidents/
│   │   ├── services/
│   │   │   └── incidente_api_service.dart # POST /incidentes (Bearer token)
│   │   └── pages/
│   │       └── incident_report_page.dart # Reportar emergencia
│   │
│   └── shared/
│       └── widgets/
│           └── (componentes reutilizables)
│
├── pubspec.yaml
└── pubspec.lock
```

---

## 📚 Flujos Principales

### 1. Autenticación
1. **Welcome Screen** – Opciones: Login / Registro
2. **Register** – Nombre completo, email, teléfono, contraseña → `POST /clientes`
3. **Login** – Email, contraseña → `POST /autenticacion/iniciar-sesion` → JWT token guardado
4. **Dashboard** – Post-login, muestra cliente bienvenido

### 2. Registro de Vehículo
1. Dashboard → botón "Registrar mi vehiculo"
2. **VehicleRegisterPage** – Formulario: Placa (required), Marca, Modelo, Año (opt), Color (opt)
3. Submit → `POST /vehiculos` con Bearer token
4. Retorna al Dashboard

### 3. Reportar Incidente
1. Dashboard → botón SOS naranja
2. **IncidentReportPage** – Multi-step form:
   - Seleccionar vehículo (cargado de `GET /vehiculos`)
   - Nivel de prioridad: baja/media/alta
   - Descripción del incidente (min 5 char)
   - Ubicación (lat/lng pre-llenadas, pueden editarse)
   - Evidencia fotográfica (slots para fotos, UI lista, no camera integration aún)
   - Audio (waveform mock, no recording aún)
3. Submit → `POST /incidentes` con Bearer token

---

## 🎨 Diseño de Marca: CeroEspera

```dart
// Colores principales en app_theme.dart
primary: #005EA4 (azul intenso)
container: #0077CE (azul claro)
orange: #FF8F06 (naranja emergencia/SOS)
surface: #F9F9F9 (fondo claro)
text_primary: #1A1C1C
text_secondary: #404752

// Geometría
BorderRadius: 14-28px (cards redondeadas)
```

---

## 🔧 Comandos Principales

### Setup Inicial

```bash
cd mobile

# Obtener dependencias
flutter pub get

# Verificar salud del proyecto
flutter doctor

# Limpiar build (si hay problemas)
flutter clean
flutter pub get
```

### Desarrollo

```bash
# Conectar dispositivo (verificar)
flutter devices

# Correr en dispositivo específico
flutter run -d cef15ef9

# Hot reload (presiona 'r' en terminal)
# Hot restart (presiona 'R' en terminal)

# Build solo (sin instalar)
flutter build apk --debug
```

### Testing

```bash
# Ejecutar tests
flutter test

# Analizar código
flutter analyze

# Ver advertencias
flutter pub outdated
```

### Build Producción

```bash
# APK release (unsigned)
flutter build apk --release

# Ubicación: build/app/outputs/flutter-apk/app-release.apk
```

---

## 📱 Configuración Android

### AndroidManifest.xml (Ya configurado)

```xml
<!-- Permitir HTTP local (127.0.0.1:8000) -->
<application android:usesCleartextTraffic="true" ... />

<!-- Permisos sugeridos para el futuro -->
<!-- <uses-permission android:name="android.permission.CAMERA" /> -->
<!-- <uses-permission android:name="android.permission.RECORD_AUDIO" /> -->
<!-- <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /> -->
```

### ADB Reverse (Conectar PC ↔ Phone)

```bash
# Reenviar puerto 8000 del teléfono al PC
adb reverse tcp:8000 tcp:8000

# Verificar
adb reverse --list

# Eliminar forward específico
adb reverse --remove tcp:8000
```

---

## 🌐 Integración Backend

### API Base URL

```dart
// lib/core/config/api_config.dart
static const String baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://127.0.0.1:8000/api/v1',
);
```

### Autenticación (Bearer Token)

```dart
// Guardado en SharedPreferences tras login
// Adjuntado a todos los requests autenticados:
headers: {
  'Authorization': 'Bearer <token_acceso>',
  'Content-Type': 'application/json',
}
```

### Endpoints Utilizados

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/autenticacion/iniciar-sesion` | POST | – | Login |
| `/clientes` | POST | – | Registro |
| `/vehiculos` | POST | ✓ | Crear vehículo |
| `/vehiculos` | GET | ✓ | Listar vehículos cliente |
| `/incidentes` | POST | ✓ | Reportar incidente |

---

## 📦 Dependencias Principales

```yaml
dependencies:
  flutter: sdk: flutter
  http: ^1.2.2              # HTTP client
  shared_preferences: ^2.3.2 # Token persistence
```

### Futuras (No integradas aún)
```yaml
  image_picker: ^1.x        # Fotos de incidentes
  geolocator: ^12.x         # GPS automático
  record: ^5.x              # Grabación de audio
  provider: ^6.x            # State management (si necesita escalarse)
```

---

## 🧪 Probar Flujo Completo

### 1. Backend corriendo

```bash
docker compose up
# Validar: curl http://localhost:8000/api/v1/salud
```

### 2. Teléfono conectado

```bash
flutter devices
# Si usa emulador, debe verse el puerto 8000 accesible
```

### 3. ADB reverse + Run

```bash
adb reverse tcp:8000 tcp:8000
cd mobile
flutter run -d <device_id>
```

### 4. Flujo de prueba

1. **Welcome** → Tap "Crear Cuenta"
2. **Register** – Llenar: nombre, email, teléfono, contraseña → "Registrarse"
3. **Login** – Email/contraseña del paso anterior → "Iniciar Sesión"
4. **Dashboard** – Ver bienvenida, vehículo mock
5. **Registrar Vehículo** – Llenar placa/marca/modelo → "Guardar vehiculo"
   - Validar en backend: `GET http://localhost:8000/docs` → Probar `/vehiculos`
6. **Reportar Incidente** – SOS → Seleccionar vehículo registrado → Llenar datos → "Analizar con IA"
   - Validar backend: `/incidentes`

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| "Lost connection to device" | Ejecutar `flutter devices`, desconectar/conectar USB, reintentar |
| "Cannot connect to localhost:8000" | Verificar `adb reverse tcp:8000 tcp:8000` |
| "Widget still doesn't update" | `flutter clean && flutter pub get && flutter run -d <id>` |
| "Gradle daemon error" | `flutter clean`, luego retry |
| "403/401 en API calls" | Token expirado o no guardado; verificar login |

---

## 📝 Estructura de Archivos Importante

- **`lib/features/auth/services/auth_api_service.dart`** – Gestión session, `obtenerHeadersAutorizados()`
- **`lib/features/vehicles/services/vehiculo_api_service.dart`** – CRUD vehículos
- **`lib/features/incidents/services/incidente_api_service.dart`** – Reportar incidentes
- **`pubspec.yaml`** – Dependencias, versionado

---

## 🚀 Próximos Pasos (Roadmap)

- [ ] Integrar `image_picker` para fotos de incidentes
- [ ] Integrar `geolocator` para GPS automático
- [ ] Integrar `record` para grabación de audio
- [ ] Dashboard mostrando vehículos/alertas reales
- [ ] Historial de incidentes
- [ ] Notificaciones push (local o backend)
- [ ] Tests unitarios/widget
- [ ] Build APK release firmado
