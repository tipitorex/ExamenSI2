import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
              <span class="text-sm font-semibold text-on-surface">Telefono</span>
              <input
                name="telefono"
                [(ngModel)]="registroTelefono"
                class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
                placeholder="+57 300 123 4567"
              />
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-sm font-semibold text-on-surface">Direccion</span>
              <input
                name="direccion"
                [(ngModel)]="registroDireccion"
                class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
                placeholder="Av. Principal #123"
              />
            </label>
          </div>

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
            <p class="text-xs text-on-surface-variant mt-2">Selecciona uno o mas servicios.</p>
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
            <span class="text-sm font-semibold text-on-surface">Contrasena *</span>
            <input
              name="contrasena"
              [(ngModel)]="registroContrasena"
              required
              minlength="6"
              type="password"
              class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
              placeholder="Minimo 6 caracteres"
            />
          </label>

          <p *ngIf="errorRegistro" class="mt-4 text-sm text-error font-medium">{{ errorRegistro }}</p>
          <p *ngIf="mensajeRegistro" class="mt-4 text-sm text-green-700 font-medium">{{ mensajeRegistro }}</p>

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

    <app-footer></app-footer>
  `,
})
export class RegistroTallerComponent implements OnInit {
  tallerActual: TallerRespuesta | null = null;

  cargandoRegistro = false;
  errorRegistro = '';
  mensajeRegistro = '';

  registroNombre = '';
  registroEmail = '';
  registroTelefono = '';
  registroDireccion = '';
  registroContrasena = '';
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

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.taller$.subscribe((taller) => {
      this.tallerActual = taller;
    });
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
    this.mensajeRegistro = '';

    if (!this.registroNombre || !this.registroEmail || !this.registroContrasena) {
      this.errorRegistro = 'Nombre, correo y contrasena son obligatorios.';
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
        servicios,
        contrasena: this.registroContrasena,
      })
      .subscribe({
        next: () => {
          this.cargandoRegistro = false;
          this.mensajeRegistro = 'Registro exitoso. Ahora puedes iniciar sesion como taller.';
          this.registroNombre = '';
          this.registroEmail = '';
          this.registroTelefono = '';
          this.registroDireccion = '';
          this.registroContrasena = '';
          this.otrosServicios = '';
          this.serviciosSeleccionados = [];
        },
        error: (error) => {
          this.cargandoRegistro = false;
          this.errorRegistro = error?.error?.detail ?? 'No se pudo registrar el taller. Intenta nuevamente.';
        },
      });
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }

  irAIniciarSesion(): void {
    this.router.navigate(['/iniciar-sesion']);
  }

  irARegistroTaller(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
