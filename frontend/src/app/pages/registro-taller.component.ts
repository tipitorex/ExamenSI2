import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';

import { AppHeaderComponent } from '../components/header.component';
import { AppFooterComponent } from '../components/footer.component';
import { TallerRespuesta } from '../models/tipos';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-registro-taller',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent, AppFooterComponent],
  template: `
    <app-header
      [tallerActual]="tallerActual"
      (onIniciarSesion)="irAIniciarSesion()"
      (onRegistarTaller)="irARegistroTaller()"
      (onCerrarSesion)="cerrarSesion()"
    ></app-header>

    <section class="pt-32 pb-20 bg-surface-container-low relative overflow-hidden">
      <div class="max-w-5xl mx-auto px-6">
        <div class="text-center mb-10">
          <h1 class="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4">
            Registra tu Taller en CeroEspera
          </h1>
          <p class="text-on-surface-variant text-lg max-w-2xl mx-auto">
            Crea tu cuenta profesional y elige los servicios que ofreces para recibir solicitudes compatibles.
          </p>
        </div>

        <form
          class="bg-surface rounded-3xl border border-outline-variant/20 p-8 md:p-10 shadow-2xl"
          (ngSubmit)="registrarTaller()"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label class="flex flex-col gap-2">
              <span class="text-sm font-semibold text-on-surface">Nombre del taller *</span>
              <input
                name="nombre"
                [(ngModel)]="registroNombre"
                required
                class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
                placeholder="Taller Express Norte"
              />
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-sm font-semibold text-on-surface">Correo *</span>
              <input
                name="email"
                [(ngModel)]="registroEmail"
                required
                type="email"
                class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
                placeholder="contacto@taller.com"
              />
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-sm font-semibold text-on-surface">Teléfono</span>
              <input
                name="telefono"
                [(ngModel)]="registroTelefono"
                class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
                placeholder="+57 300 123 4567"
              />
            </label>

            <!-- Campo de dirección con botón de búsqueda -->
            <div class="flex gap-2 items-end">
              <label class="flex flex-col gap-2 flex-1">
                <span class="text-sm font-semibold text-on-surface">Dirección</span>
                <input
                  name="direccion"
                  [(ngModel)]="registroDireccion"
                  (input)="onDireccionChange()"
                  class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
                  placeholder="Ej: Av. Busch, Santa Cruz"
                />
                <p class="text-xs text-on-surface-variant mt-1">
                  Escribe tu dirección en Santa Cruz y presiona "Buscar en mapa"
                </p>
              </label>
              <button
                type="button"
                (click)="buscarCoordenadasPorDireccion()"
                [disabled]="cargandoRegistro"
                class="bg-primary text-white px-5 py-3 rounded-xl font-semibold whitespace-nowrap disabled:opacity-50"
              >
                {{ cargandoRegistro ? 'Buscando...' : '🔍 Buscar en mapa' }}
              </button>
            </div>
          </div>

          <!-- MAPA -->
          <div class="mt-6">
            <label class="text-sm font-semibold text-on-surface mb-2 block">
              Ubicación del taller en el mapa *
            </label>
            <div id="mapaTaller" style="height: 320px; border-radius: 16px; z-index: 0;"></div>
            <p class="text-xs text-on-surface-variant mt-2">
              Arrastra el marcador o haz clic en el mapa para ajustar la ubicación exacta.
            </p>
            <div *ngIf="registroLatitud && registroLongitud" class="mt-2 text-xs text-primary font-mono">
              📍 Lat: {{ registroLatitud | number:'1.6' }} | Lng: {{ registroLongitud | number:'1.6' }}
            </div>
          </div>

          <!-- Servicios -->
          <div class="mt-8">
            <p class="text-sm font-semibold text-on-surface mb-3">Servicios que ofrece *</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <label
                *ngFor="let servicio of serviciosDisponibles"
                class="flex items-center gap-3 rounded-xl border border-outline-variant/25 px-4 py-3 bg-surface-container-low"
              >
                <input
                  type="checkbox"
                  [checked]="serviciosSeleccionados.includes(servicio)"
                  (change)="alternarServicio(servicio, $event)"
                  class="w-4 h-4 accent-primary"
                />
                <span class="text-sm font-medium text-on-surface">{{ servicio }}</span>
              </label>
            </div>
          </div>

          <label class="flex flex-col gap-2 mt-6">
            <span class="text-sm font-semibold text-on-surface">Otros servicios (opcional)</span>
            <input
              name="otrosServicios"
              [(ngModel)]="otrosServicios"
              class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
              placeholder="Separados por coma"
            />
          </label>

          <label class="flex flex-col gap-2 mt-6">
            <span class="text-sm font-semibold text-on-surface">Contraseña *</span>
            <input
              name="contrasena"
              [(ngModel)]="registroContrasena"
              required
              minlength="6"
              type="password"
              class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          <!-- Campos ocultos para coordenadas -->
          <input type="hidden" [(ngModel)]="registroLatitud" name="latitud" />
          <input type="hidden" [(ngModel)]="registroLongitud" name="longitud" />

          <p *ngIf="errorRegistro" class="mt-4 text-sm text-error font-medium">{{ errorRegistro }}</p>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              [disabled]="cargandoRegistro"
              class="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3 rounded-xl font-bold disabled:opacity-60"
            >
              {{ cargandoRegistro ? 'Registrando...' : 'Crear cuenta de Taller' }}
            </button>
            <button
              type="button"
              (click)="irAIniciarSesion()"
              class="px-6 py-3 rounded-xl font-semibold border border-outline-variant/30 text-on-surface"
            >
              Ya tengo cuenta
            </button>
          </div>
        </form>
      </div>
    </section>

    <!-- Modal de registro exitoso -->
    <div *ngIf="mostrarModalExito" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" (click)="cerrarModal()">
      <div class="bg-surface rounded-2xl p-8 max-w-md mx-4 shadow-2xl" (click)="$event.stopPropagation()">
        <div class="text-center">
          <!-- Icono de éxito -->
          <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          
          <!-- Título -->
          <h2 class="text-2xl font-bold text-on-surface mb-2">¡Registro Exitoso!</h2>
          
          <!-- Mensaje personalizado -->
          <p class="text-on-surface-variant mb-6">
            Bienvenido/a a la familia <span class="font-bold text-primary">CeroEspera</span> {{ nombreTallerRegistrado }}.
          </p>
          
          <p class="text-sm text-on-surface-variant mb-6">
            Tu taller ha sido registrado correctamente.<br>
            Ya puedes iniciar sesión y comenzar a recibir solicitudes.
          </p>
          
          <!-- Botones -->
          <div class="flex flex-col gap-3">
            <button
              (click)="irAIniciarSesion()"
              class="bg-gradient-to-r from-primary to-primary-container text-white px-6 py-3 rounded-xl font-bold"
            >
              Iniciar Sesión
            </button>
            <button
              (click)="cerrarModal()"
              class="px-6 py-3 rounded-xl font-semibold border border-outline-variant/30 text-on-surface"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>

    <app-footer></app-footer>
  `,
})
export class RegistroTallerComponent implements OnInit, AfterViewInit {
  tallerActual: TallerRespuesta | null = null;

  cargandoRegistro = false;
  errorRegistro = '';
  mensajeRegistro = '';  
  mostrarModalExito = false;
  nombreTallerRegistrado = '';

  registroNombre = '';
  registroEmail = '';
  registroTelefono = '';
  registroDireccion = '';
  registroContrasena = '';
  registroLatitud: number | null = null;
  registroLongitud: number | null = null;
  otrosServicios = '';

  serviciosDisponibles = [
    'Grua',
    'Cambio de bateria',
    'Cambio de aceite',
    'Diagnostico electrico',
    'Pinchazo / llantas',
    'Remolque',
    'Mecanica general',
    'Escaner OBD',
    'Cerrajeria automotriz',
  ];

  serviciosSeleccionados: string[] = [];

  // Mapa
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private timeoutIdBusqueda: any = null;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.taller$.subscribe((taller) => {
      this.tallerActual = taller;
    });
  }

  ngAfterViewInit(): void {
    this.inicializarMapa();
  }

  private inicializarMapa(): void {
    // SOLUCIÓN DE ICONOS - CDN (funciona sin descargar archivos)
    const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
    const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
    const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
    
    L.Marker.prototype.options.icon = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });

    const latInicial = -17.7831;  
    const lngInicial = -63.1821; 

    this.map = L.map('mapaTaller').setView([latInicial, lngInicial], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Marcador arrastrable
    this.marker = L.marker([latInicial, lngInicial], { draggable: true }).addTo(this.map);

    // Evento: cuando se arrastra el marcador
    this.marker.on('dragend', () => {
      const pos = this.marker!.getLatLng();
      this.registroLatitud = pos.lat;
      this.registroLongitud = pos.lng;
    });

    // Evento: cuando se hace clic en el mapa
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.registroLatitud = lat;
      this.registroLongitud = lng;
      this.marker!.setLatLng([lat, lng]);
    });
  }

  // Método para buscar coordenadas por dirección usando Nominatim (limitado a Santa Cruz, Bolivia)
  async buscarCoordenadasPorDireccion(): Promise<void> {
    if (!this.registroDireccion || this.registroDireccion.trim().length < 5) {
      this.errorRegistro = 'Ingresa una dirección más específica (mínimo 5 caracteres)';
      return;
    }

    this.cargandoRegistro = true;
    this.errorRegistro = '';

    // Agregar contexto geográfico automáticamente (Santa Cruz, Bolivia)
    const queryCompleta = `${this.registroDireccion}, Santa Cruz, Bolivia`;
    const direccionEncoded = encodeURIComponent(queryCompleta);
    const url = `https://nominatim.openstreetmap.org/search?q=${direccionEncoded}&format=json&limit=1`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CeroEsperaApp/1.0'
        }
      });
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        
        this.registroLatitud = lat;
        this.registroLongitud = lng;
        
        if (this.map && this.marker) {
          this.map.setView([lat, lng], 15);
          this.marker.setLatLng([lat, lng]);
        }
        
        // Mostrar mensaje temporal
        const mensajeTemp = '📍 Ubicación encontrada en Santa Cruz';
        this.mensajeRegistro = mensajeTemp;
        setTimeout(() => {
          if (this.mensajeRegistro === mensajeTemp) {
            this.mensajeRegistro = '';
          }
        }, 3000);
      } else {
        this.errorRegistro = 'No se encontró la dirección en Santa Cruz. Intenta con una más específica o ajusta el marcador manualmente.';
      }
    } catch (error) {
      console.error('Error al geocodificar:', error);
      this.errorRegistro = 'Error al buscar la dirección. Verifica tu conexión o ajusta el marcador manualmente.';
    } finally {
      this.cargandoRegistro = false;
    }
  }

  // Búsqueda automática mientras escribe (con debounce)
  onDireccionChange(): void {
    if (this.timeoutIdBusqueda) {
      clearTimeout(this.timeoutIdBusqueda);
    }
    
    this.timeoutIdBusqueda = setTimeout(() => {
      if (this.registroDireccion && this.registroDireccion.trim().length >= 5) {
        this.buscarCoordenadasPorDireccion();
      }
    }, 800);
  }

  alternarServicio(servicio: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      if (!this.serviciosSeleccionados.includes(servicio)) {
        this.serviciosSeleccionados.push(servicio);
      }
      return;
    }

    this.serviciosSeleccionados = this.serviciosSeleccionados.filter((item) => item !== servicio);
  }

  registrarTaller(): void {
    this.errorRegistro = '';

    if (!this.registroNombre || !this.registroEmail || !this.registroContrasena) {
      this.errorRegistro = 'Nombre, correo y contraseña son obligatorios.';
      return;
    }

    if (!this.registroLatitud || !this.registroLongitud) {
      this.errorRegistro = 'Selecciona la ubicación del taller en el mapa.';
      return;
    }

    const extras = this.otrosServicios
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const servicios = Array.from(new Set([...this.serviciosSeleccionados, ...extras]));

    if (servicios.length === 0) {
      this.errorRegistro = 'Selecciona al menos un servicio.';
      return;
    }

    this.cargandoRegistro = true;

    this.authService
      .registrarTaller({
        nombre: this.registroNombre.trim(),
        email: this.registroEmail.trim(),
        telefono: this.registroTelefono.trim() || undefined,
        direccion: this.registroDireccion.trim() || undefined,
        latitud: this.registroLatitud,
        longitud: this.registroLongitud,
        servicios,
        contrasena: this.registroContrasena,
      })
      .subscribe({
        next: () => {
          this.cargandoRegistro = false;
          
          // Guardar el nombre del taller para mostrarlo en el modal
          this.nombreTallerRegistrado = this.registroNombre.trim();
          
          // Mostrar modal de éxito
          this.mostrarModalExito = true;
          
          // Limpiar formulario
          this.registroNombre = '';
          this.registroEmail = '';
          this.registroTelefono = '';
          this.registroDireccion = '';
          this.registroContrasena = '';
          this.registroLatitud = null;
          this.registroLongitud = null;
          this.otrosServicios = '';
          this.serviciosSeleccionados = [];
        },
        error: (error) => {
          this.cargandoRegistro = false;
          this.errorRegistro = error?.error?.detail ?? 'No se pudo registrar el taller. Intenta nuevamente.';
        },
      });
  }

  cerrarModal(): void {
    this.mostrarModalExito = false;
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }

  irAIniciarSesion(): void {
    this.mostrarModalExito = false;
    setTimeout(() => {
      this.router.navigate(['/iniciar-sesion']);
    }, 50);
  }

  irARegistroTaller(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}