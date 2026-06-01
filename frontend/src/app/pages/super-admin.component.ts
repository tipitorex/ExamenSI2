import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SuperAdminService } from '../services/super-admin.service';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="layout-dashboard">
      <aside class="sidenav">
        <div class="brand">
          <div class="brand-icon">
            <span class="material-symbols-outlined">admin_panel_settings</span>
          </div>
          <div>
            <p class="brand-title">Super Admin</p>
            <p class="brand-subtitle">CeroEspera SaaS</p>
          </div>
        </div>

        <nav class="menu">
          <a class="menu-item" routerLink="/super-admin/tenants" routerLinkActive="menu-item-active">
            <span class="material-symbols-outlined">apartment</span>
            <span>Tenants</span>
          </a>
        </nav>

        <button class="boton-alerta" type="button" (click)="cerrarSesion()">
          <span class="material-symbols-outlined">logout</span>
          CERRAR SESION
        </button>
      </aside>

      <main class="contenido">
        <header class="topbar">
          <h1>Panel Super Admin</h1>
          <div class="text-sm text-on-surface-variant">
            {{ usuarioEmail }}
          </div>
        </header>

        <section class="contenido-router">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
  styleUrl: './dashboard.component.scss',
})
export class SuperAdminComponent {
  usuarioEmail = '';

  constructor(
    private superAdminService: SuperAdminService,
    private router: Router,
  ) {
    if (!this.superAdminService.estaAutenticado()) {
      this.router.navigate(['/super-admin/iniciar-sesion']);
      return;
    }

    this.usuarioEmail = this.superAdminService.obtenerUsuarioActual()?.email ?? 'super admin';
  }

  cerrarSesion(): void {
    this.superAdminService.cerrarSesion();
    this.router.navigate(['/super-admin/iniciar-sesion']);
  }
}
