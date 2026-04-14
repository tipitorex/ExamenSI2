import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AppHeaderComponent } from '../components/header.component';
import { AppFooterComponent } from '../components/footer.component';
import { TallerRespuesta } from '../models/tipos';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-iniciar-sesion',
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
      <div class="max-w-3xl mx-auto px-6">
        <div class="text-center mb-10">
          <h1 class="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4">
            Iniciar sesion 
          </h1>
          <p class="text-on-surface-variant text-lg">
            Accede al panel operativo para gestionar tecnicos y atender emergencias en tiempo real.
          </p>
        </div>

        <div class="bg-surface rounded-3xl border border-outline-variant/20 p-8 md:p-10 shadow-2xl">
          @if (!tallerActual) {
            <form class="space-y-5" (ngSubmit)="iniciarSesionTaller()">
              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-on-surface">Correo *</span>
                <input
                  [(ngModel)]="email"
                  name="email"
                  type="email"
                  required
                  class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
                  placeholder="contacto@taller.com"
                />
              </label>

              <label class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-on-surface">Contrasena *</span>
                <input
                  [(ngModel)]="contrasena"
                  name="contrasena"
                  type="password"
                  required
                  class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
                  placeholder="Tu contrasena"
                />
              </label>

              <p *ngIf="errorLogin" class="text-sm text-error font-medium">{{ errorLogin }}</p>

              <div class="pt-2 flex flex-wrap gap-3">
                <button
                  [disabled]="cargandoLogin"
                  type="submit"
                  class="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3 rounded-xl font-bold disabled:opacity-60"
                >
                  {{ cargandoLogin ? 'Ingresando...' : 'Ingresar' }}
                </button>
                <button
                  type="button"
                  (click)="irARegistroTaller()"
                  class="px-6 py-3 rounded-xl font-semibold border border-outline-variant/30 text-on-surface"
                >
                  Crear cuenta
                </button>
              </div>
            </form>
          } @else {
            <div class="space-y-4">
              <h2 class="font-headline text-2xl font-bold text-on-surface">Sesion activa</h2>
              <p class="text-on-surface-variant">{{ tallerActual.nombre }} · {{ tallerActual.email }}</p>
              <div class="flex flex-wrap gap-3">
                <button
                  type="button"
                  (click)="irADashboard()"
                  class="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3 rounded-xl font-bold"
                >
                  Ir al dashboard
                </button>
                <button
                  type="button"
                  (click)="cerrarSesion()"
                  class="px-6 py-3 rounded-xl font-semibold border border-outline-variant/30 text-on-surface"
                >
                  Cerrar sesion
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <app-footer></app-footer>
  `,
})
export class IniciarSesionComponent implements OnInit {
  tallerActual: TallerRespuesta | null = null;

  email = '';
  contrasena = '';
  cargandoLogin = false;
  errorLogin = '';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.taller$.subscribe((taller) => {
      this.tallerActual = taller;
    });
  }

  iniciarSesionTaller(): void {
    this.errorLogin = '';
    this.cargandoLogin = true;

    this.authService.iniciarSesion(this.email, this.contrasena).subscribe({
      next: () => {
        this.cargandoLogin = false;
        this.errorLogin = '';
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.cargandoLogin = false;
        this.errorLogin = 'No se pudo iniciar sesion. Verifica credenciales.';
      },
    });
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }

  irADashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  irAIniciarSesion(): void {
    this.router.navigate(['/iniciar-sesion']);
  }

  irARegistroTaller(): void {
    this.router.navigate(['/registro-taller']);
  }
}
