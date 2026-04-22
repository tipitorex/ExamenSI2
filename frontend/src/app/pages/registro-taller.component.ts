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
            <!-- Nombre del taller -->
            <label class="flex flex-col gap-2">
              <span class="text-sm font-semibold text-on-surface">Nombre del taller *</span>
              <input
                name="nombre"
                [(ngModel)]="registroNombre"
                (blur)="validarCampo('nombre')"
                [class.border-error]="errores.nombre"
                class="rounded-xl border px-4 py-3 bg-white transition-colors"
                [class.border-outline-variant/30]="!errores.nombre"
                placeholder="Taller Express Norte"
              />
              <p *ngIf="errores.nombre" class="text-xs text-error mt-1">{{ errores.nombre }}</p>
            </label>

            <!-- Correo -->
            <label class="flex flex-col gap-2">
              <span class="text-sm font-semibold text-on-surface">Correo *</span>
              <input
                name="email"
                [(ngModel)]="registroEmail"
                (blur)="validarCampo('email')"
                type="email"
                [class.border-error]="errores.email"
                class="rounded-xl border px-4 py-3 bg-white transition-colors"
                [class.border-outline-variant/30]="!errores.email"
                placeholder="contacto@taller.com"
              />
              <p *ngIf="errores.email" class="text-xs text-error mt-1">{{ errores.email }}</p>
            </label>

            <!-- Teléfono -->
            <label class="flex flex-col gap-2">
              <span class="text-sm font-semibold text-on-surface">Teléfono</span>
              <input
                name="telefono"
                [(ngModel)]="registroTelefono"
                (blur)="validarCampo('telefono')"
                [class.border-error]="errores.telefono"
                class="rounded-xl border px-4 py-3 bg-white transition-colors"
                [class.border-outline-variant/30]="!errores.telefono"
                placeholder="+57 300 123 4567"
              />
              <p *ngIf="errores.telefono" class="text-xs text-error mt-1">{{ errores.telefono }}</p>
            </label>

            <!-- Dirección del taller -->
            <label class="flex flex-col gap-2">
              <span class="text-sm font-semibold text-on-surface">Dirección del taller</span>
              <input
                name="direccion"
                [(ngModel)]="registroDireccion"
                class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
                placeholder="Ej: Av. Busch #123, Santa Cruz"
              />
              <p class="text-xs text-on-surface-variant mt-1">
                Escribe la dirección textual de tu taller
              </p>
            </label>
          </div>

          <!-- MAPA CON BUSCADOR INTEGRADO -->
          <div class="mt-6">
            <div class="flex gap-2 mb-3">
              <div class="flex-1 relative">
                <input
                  type="text"
                  [(ngModel)]="buscarUbicacion"
                  (keyup.enter)="buscarEnMapa()"
                  placeholder="Buscar ubicación en el mapa (ej: Av. Busch, Santa Cruz)"
                  class="w-full rounded-xl border border-outline-variant/30 px-4 py-3 bg-white pr-12"
                  name="buscadorMapa"
                />
                <button
                  type="button"
                  (click)="buscarEnMapa()"
                  class="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold"
                >
                  🔍
                </button>
              </div>
            </div>
            
            <label class="text-sm font-semibold text-on-surface mb-2 block">
              Ubicación del taller en el mapa *
            </label>
            <div id="mapaTaller" style="height: 320px; border-radius: 16px; z-index: 0;" [class.border-error]="errores.ubicacion"></div>
            <p class="text-xs text-on-surface-variant mt-2">
              Arrastra el marcador o haz clic en el mapa para ajustar la ubicación exacta.
            </p>
            <p *ngIf="errores.ubicacion" class="text-xs text-error mt-1">{{ errores.ubicacion }}</p>
            <div *ngIf="registroLatitud && registroLongitud" class="mt-2 text-xs text-primary font-mono">
              📍 Coordenadas: Lat: {{ registroLatitud | number:'1.6' }} | Lng: {{ registroLongitud | number:'1.6' }}
            </div>
            <div *ngIf="mensajeBusqueda" class="mt-2 text-xs text-info">
              {{ mensajeBusqueda }}
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
            <p *ngIf="errores.servicios" class="text-xs text-error mt-2">{{ errores.servicios }}</p>
          </div>

          <!-- Otros servicios -->
          <label class="flex flex-col gap-2 mt-6">
            <span class="text-sm font-semibold text-on-surface">Otros servicios (opcional)</span>
            <input
              name="otrosServicios"
              [(ngModel)]="otrosServicios"
              class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
              placeholder="Separados por coma"
            />
          </label>

          <!-- Contraseña -->
          <label class="flex flex-col gap-2 mt-6">
            <span class="text-sm font-semibold text-on-surface">Contraseña *</span>
            <input
              name="contrasena"
              [(ngModel)]="registroContrasena"
              (blur)="validarCampo('contrasena')"
              minlength="6"
              type="password"
              [class.border-error]="errores.contrasena"
              class="rounded-xl border px-4 py-3 bg-white transition-colors"
              [class.border-outline-variant/30]="!errores.contrasena"
              placeholder="Mínimo 6 caracteres"
            />
            <p *ngIf="errores.contrasena" class="text-xs text-error mt-1">{{ errores.contrasena }}</p>
          </label>

          <!-- Campos ocultos para coordenadas -->
          <input type="hidden" [(ngModel)]="registroLatitud" name="latitud" />
          <input type="hidden" [(ngModel)]="registroLongitud" name="longitud" />

          <!-- Error general (si falla el servidor) -->
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
          <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          
          <h2 class="text-2xl font-bold text-on-surface mb-2">¡Registro Exitoso!</h2>
          
          <p class="text-on-surface-variant mb-6">
            Bienvenido/a a la familia <span class="font-bold text-primary">CeroEspera</span> {{ nombreTallerRegistrado }}.
          </p>
          
          <p class="text-sm text-on-surface-variant mb-6">
            Tu taller ha sido registrado correctamente.<br>
            Ya puedes iniciar sesión y comenzar a recibir solicitudes.
          </p>
          
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

  // Buscador del mapa
  buscarUbicacion = '';
  mensajeBusqueda = '';

  // Objeto para almacenar errores por campo
  errores: any = {
    nombre: '',
    email: '',
    telefono: '',
    contrasena: '',
    ubicacion: '',
    servicios: ''
  };

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
    setTimeout(() => {
      this.inicializarMapa();
    }, 100);
  }

  // Validación por campo individual
  validarCampo(campo: string): void {
    switch(campo) {
      case 'nombre':
        if (!this.registroNombre || this.registroNombre.trim().length === 0) {
          this.errores.nombre = 'El nombre del taller es obligatorio';
        } else if (this.registroNombre.trim().length < 3) {
          this.errores.nombre = 'El nombre debe tener al menos 3 caracteres';
        } else {
          this.errores.nombre = '';
        }
        break;
      
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!this.registroEmail) {
          this.errores.email = 'El correo electrónico es obligatorio';
        } else if (!emailRegex.test(this.registroEmail)) {
          this.errores.email = 'Ingresa un correo electrónico válido (ej: nombre@dominio.com)';
        } else {
          this.errores.email = '';
        }
        break;
      
      case 'telefono':
        if (this.registroTelefono && this.registroTelefono.trim().length > 0) {
          const telefonoLimpio = this.registroTelefono.replace(/[\s\-\(\)\+]/g, '');
          if (telefonoLimpio.length < 8) {
            this.errores.telefono = 'Ingresa un número de teléfono válido (mínimo 8 dígitos)';
          } else {
            this.errores.telefono = '';
          }
        } else {
          this.errores.telefono = '';
        }
        break;
      
      case 'contrasena':
        if (!this.registroContrasena) {
          this.errores.contrasena = 'La contraseña es obligatoria';
        } else if (this.registroContrasena.length < 6) {
          this.errores.contrasena = 'La contraseña debe tener al menos 6 caracteres';
        } else {
          this.errores.contrasena = '';
        }
        break;
    }
  }

  // Validar todos los campos antes de enviar
  validarFormularioCompleto(): boolean {
    // Validar cada campo
    this.validarCampo('nombre');
    this.validarCampo('email');
    this.validarCampo('telefono');
    this.validarCampo('contrasena');
    
    // Validar ubicación
    if (!this.registroLatitud || !this.registroLongitud) {
      this.errores.ubicacion = 'Selecciona la ubicación del taller en el mapa';
    } else {
      this.errores.ubicacion = '';
    }
    
    // Validar servicios
    const extras = this.otrosServicios
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    
    const servicios = Array.from(new Set([...this.serviciosSeleccionados, ...extras]));
    
    if (servicios.length === 0) {
      this.errores.servicios = 'Selecciona al menos un servicio';
    } else {
      this.errores.servicios = '';
    }
    
    // Verificar si hay algún error
    return !this.errores.nombre && 
           !this.errores.email && 
           !this.errores.telefono && 
           !this.errores.contrasena && 
           !this.errores.ubicacion && 
           !this.errores.servicios;
  }

  private inicializarMapa(): void {
    // SOLUCIÓN DE ICONOS - CDN
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
      // Limpiar error de ubicación cuando el usuario selecciona una
      if (this.errores.ubicacion) {
        this.errores.ubicacion = '';
      }
    });

    // Evento: cuando se hace clic en el mapa
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.registroLatitud = lat;
      this.registroLongitud = lng;
      this.marker!.setLatLng([lat, lng]);
      // Limpiar error de ubicación cuando el usuario selecciona una
      if (this.errores.ubicacion) {
        this.errores.ubicacion = '';
      }
    });
  }

  // Método para buscar ubicación en el mapa
  async buscarEnMapa(): Promise<void> {
    if (!this.buscarUbicacion || this.buscarUbicacion.trim().length < 3) {
      this.mensajeBusqueda = 'Ingresa una ubicación más específica (mínimo 3 caracteres)';
      setTimeout(() => {
        if (this.mensajeBusqueda === 'Ingresa una ubicación más específica (mínimo 3 caracteres)') {
          this.mensajeBusqueda = '';
        }
      }, 3000);
      return;
    }

    this.cargandoRegistro = true;
    this.mensajeBusqueda = 'Buscando ubicación...';

    const queryCompleta = `${this.buscarUbicacion}, Santa Cruz, Bolivia`;
    const direccionEncoded = encodeURIComponent(queryCompleta);
    const url = `https://nominatim.openstreetmap.org/search?q=${direccionEncoded}&format=json&limit=5`;

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
        const nombreLugar = data[0].display_name;
        
        this.registroLatitud = lat;
        this.registroLongitud = lng;
        
        if (this.map && this.marker) {
          this.map.setView([lat, lng], 16);
          this.marker.setLatLng([lat, lng]);
        }
        
        // Limpiar error de ubicación
        if (this.errores.ubicacion) {
          this.errores.ubicacion = '';
        }
        
        this.mensajeBusqueda = `📍 Ubicación encontrada: ${nombreLugar.substring(0, 60)}...`;
        setTimeout(() => {
          if (this.mensajeBusqueda?.includes('Ubicación encontrada')) {
            this.mensajeBusqueda = '';
          }
        }, 4000);
      } else {
        this.mensajeBusqueda = 'No se encontró la ubicación en Santa Cruz. Intenta con términos más específicos.';
        setTimeout(() => {
          if (this.mensajeBusqueda === 'No se encontró la ubicación en Santa Cruz. Intenta con términos más específicos.') {
            this.mensajeBusqueda = '';
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error al geocodificar:', error);
      this.mensajeBusqueda = 'Error al buscar la ubicación. Verifica tu conexión.';
      setTimeout(() => {
        if (this.mensajeBusqueda === 'Error al buscar la ubicación. Verifica tu conexión.') {
          this.mensajeBusqueda = '';
        }
      }, 3000);
    } finally {
      this.cargandoRegistro = false;
    }
  }

  alternarServicio(servicio: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      if (!this.serviciosSeleccionados.includes(servicio)) {
        this.serviciosSeleccionados.push(servicio);
      }
    } else {
      this.serviciosSeleccionados = this.serviciosSeleccionados.filter((item) => item !== servicio);
    }
    
    // Limpiar error de servicios cuando el usuario selecciona alguno
    if (this.serviciosSeleccionados.length > 0 && this.errores.servicios) {
      this.errores.servicios = '';
    }
  }

  registrarTaller(): void {
    // Limpiar error general
    this.errorRegistro = '';
    
    // Validar todo el formulario
    if (!this.validarFormularioCompleto()) {
      // Scroll al primer campo con error
      const primerError = document.querySelector('.border-error');
      if (primerError) {
        primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const extras = this.otrosServicios
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const servicios = Array.from(new Set([...this.serviciosSeleccionados, ...extras]));

    this.cargandoRegistro = true;

    this.authService
      .registrarTaller({
        nombre: this.registroNombre.trim(),
        email: this.registroEmail.trim(),
        telefono: this.registroTelefono.trim() || undefined,
        direccion: this.registroDireccion.trim() || undefined,
        latitud: this.registroLatitud!,
        longitud: this.registroLongitud!,
        servicios,
        contrasena: this.registroContrasena,
      })
      .subscribe({
        next: () => {
          this.cargandoRegistro = false;
          this.nombreTallerRegistrado = this.registroNombre.trim();
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
          this.buscarUbicacion = '';
          this.errores = {
            nombre: '',
            email: '',
            telefono: '',
            contrasena: '',
            ubicacion: '',
            servicios: ''
          };
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