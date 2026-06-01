import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AppHeaderComponent } from '../components/header.component';
import { AppFooterComponent } from '../components/footer.component';
import { SuperAdminService } from '../services/super-admin.service';

@Component({
  selector: 'app-super-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent, AppFooterComponent],
  template: `
    <app-header
      [tallerActual]="null"
      (onIniciarSesion)="irAIniciarSesionTaller()"
      (onRegistarTaller)="irARegistroTaller()"
      (onCerrarSesion)="noop()"
    ></app-header>

    <section class="pt-32 pb-20 bg-surface-container-low">
      <div class="max-w-2xl mx-auto px-6">
        <div class="text-center mb-10">
          <h1 class="font-headline text-4xl font-extrabold text-on-surface mb-4">Acceso Super Admin</h1>
          <p class="text-on-surface-variant">Gestión global de tenants, planes y estado de la plataforma.</p>
        </div>

        <form class="bg-surface rounded-3xl border border-outline-variant/20 p-8 shadow-2xl space-y-4" (ngSubmit)="iniciarSesion()">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold">Correo super admin</span>
            <input
              [(ngModel)]="email"
              name="email"
              type="email"
              required
              class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
              placeholder="owner@plataforma.com"
            />
          </label>

          <label class="flex flex-col gap-2">
            <span class="text-sm font-semibold">Contraseña</span>
            <input
              [(ngModel)]="contrasena"
              name="contrasena"
              type="password"
              required
              class="rounded-xl border border-outline-variant/30 px-4 py-3 bg-white"
              placeholder="********"
            />
          </label>

          <p *ngIf="error" class="text-sm text-error font-medium">{{ error }}</p>

          <button
            type="submit"
            [disabled]="cargando"
            class="w-full bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3 rounded-xl font-bold disabled:opacity-60"
          >
            {{ cargando ? 'Ingresando...' : 'Entrar a Super Admin' }}
          </button>
        </form>
      </div>
    </section>

    <app-footer></app-footer>
  `,
})
export class SuperAdminLoginComponent {
  email = 'owner@plataforma.com';
  contrasena = '';
  cargando = false;
  error = '';

  constructor(
    private superAdminService: SuperAdminService,
    private router: Router,
  ) {}

  iniciarSesion(): void {
    this.error = '';
    this.cargando = true;

    this.superAdminService.iniciarSesion(this.email, this.contrasena).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/super-admin/tenants']);
      },
      error: () => {
        this.cargando = false;
        this.error = 'Credenciales inválidas para super admin';
      },
    });
  }

  irAIniciarSesionTaller(): void {
    this.router.navigate(['/iniciar-sesion']);
  }

  irARegistroTaller(): void {
    this.router.navigate(['/registro-taller']);
  }

  noop(): void {}
}
