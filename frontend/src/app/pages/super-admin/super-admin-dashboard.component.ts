import { Component, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="layout-dashboard">
      <!-- Sidebar -->
      <aside class="sidenav">
        <div class="brand">
          <div class="brand-icon">
            <span class="material-symbols-outlined">admin_panel_settings</span>
          </div>
          <div>
            <p class="brand-title">CeroEspera</p>
            <p class="brand-subtitle">Super Admin</p>
          </div>
        </div>

        <nav class="menu">
          <a
            class="menu-item"
            routerLink="/super-admin/dashboard"
            routerLinkActive="menu-item-active"
            [routerLinkActiveOptions]="{ exact: true }">
            <span class="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </a>
          <a
            class="menu-item"
            routerLink="/super-admin/talleres"
            routerLinkActive="menu-item-active">
            <span class="material-symbols-outlined">business</span>
            <span>Talleres</span>
          </a>
          <a
            class="menu-item"
            routerLink="/super-admin/planes"
            routerLinkActive="menu-item-active">
            <span class="material-symbols-outlined">plans</span>
            <span>Planes</span>
          </a>
          <a
            class="menu-item"
            routerLink="/super-admin/pagos"
            routerLinkActive="menu-item-active">
            <span class="material-symbols-outlined">payments</span>
            <span>Pagos</span>
          </a>
          <a
            class="menu-item"
            routerLink="/super-admin/opiniones"
            routerLinkActive="menu-item-active">
            <span class="material-symbols-outlined">star_rate</span>
            <span>Opiniones</span>
          </a>
          <a
            class="menu-item"
            routerLink="/super-admin/analitica"
            routerLinkActive="menu-item-active">
            <span class="material-symbols-outlined">analytics</span>
            <span>Analítica</span>
          </a>
        </nav>

        <button class="boton-alerta" type="button" (click)="cerrarSesion()">
          <span class="material-symbols-outlined">logout</span>
          Cerrar Sesión
        </button>
      </aside>

      <!-- Main Content -->
      <main class="contenido">
        <header class="topbar">
          <h1>Panel de Administración</h1>
          <div class="topbar-actions">
            <div class="cuenta-box" (click)="$event.stopPropagation()">
              <button
                class="cuenta-boton"
                type="button"
                (click)="toggleMenuCuenta($event)"
                [class.cuenta-boton-activo]="mostrarMenuCuenta"
                aria-label="Abrir menu de cuenta">
                <span class="avatar-cuenta">{{ obtenerIniciales() }}</span>
                <span class="cuenta-texto">
                  <strong>Super Admin</strong>
                  <small>superadmin@admin.com</small>
                </span>
                <span class="material-symbols-outlined chevron">expand_more</span>
              </button>

              @if (mostrarMenuCuenta) {
                <div class="panel-float panel-cuenta">
                  <button type="button" (click)="cerrarSesion()" class="accion-peligro">
                    <span class="material-symbols-outlined">logout</span>
                    Cerrar sesión
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <section class="contenido-router">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
    }

    .layout-dashboard {
      min-height: 100dvh;
      display: grid;
      grid-template-columns: 260px 1fr;
      background:
        radial-gradient(circle at 90% 0%, rgba(0, 127, 215, 0.09), transparent 30%),
        radial-gradient(circle at 0% 100%, rgba(255, 143, 6, 0.12), transparent 32%),
        #f6f8fb;
    }

    .sidenav {
      border-right: 1px solid #d7dde7;
      background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
      padding: 1.25rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      position: sticky;
      top: 0;
      height: 100dvh;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
    }

    .brand-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.85rem;
      background: linear-gradient(140deg, #0077ce, #005ea4);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(0, 94, 164, 0.25);
    }

    .brand-title {
      margin: 0;
      font-family: 'Manrope', sans-serif;
      font-weight: 800;
      font-size: 1rem;
      color: #10223b;
    }

    .brand-subtitle {
      margin: 0;
      color: #5b687d;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .menu {
      margin-top: 0.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .menu-item {
      text-decoration: none;
      color: #44546d;
      border-radius: 0.8rem;
      padding: 0.72rem 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .menu-item:hover {
      background: #eaf2ff;
      color: #0f3f78;
    }

    .menu-item-active {
      background: #d3e4ff;
      color: #005ea4;
    }

    .boton-alerta {
      margin-top: auto;
      border: 0;
      border-radius: 0.9rem;
      background: linear-gradient(135deg, #ffb77b 0%, #ff8f06 100%);
      color: #3f2500;
      font-family: 'Manrope', sans-serif;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.85rem 0.6rem;
      cursor: pointer;
      box-shadow: 0 12px 24px rgba(143, 74, 0, 0.2);
    }

    .boton-alerta:hover {
      filter: brightness(1.05);
    }

    .contenido {
      padding: 1.35rem 1.6rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .topbar h1 {
      margin: 0;
      font-family: 'Manrope', sans-serif;
      font-size: clamp(1.25rem, 2vw, 1.8rem);
      line-height: 1.15;
      color: #132237;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      position: relative;
    }

    .cuenta-box {
      position: relative;
    }

    .cuenta-boton {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      border: 1px solid #d7dde7;
      background: #fff;
      height: 2.4rem;
      border-radius: 999px;
      padding: 0 0.45rem 0 0.3rem;
      cursor: pointer;
      max-width: 340px;
    }

    .cuenta-boton:hover,
    .cuenta-boton-activo {
      border-color: #a9c6ea;
      background: #eef5ff;
    }

    .avatar-cuenta {
      width: 1.8rem;
      height: 1.8rem;
      border-radius: 999px;
      background: linear-gradient(140deg, #0077ce, #005ea4);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.73rem;
      font-weight: 800;
      flex: 0 0 auto;
    }

    .cuenta-texto {
      display: grid;
      text-align: left;
      line-height: 1.05;
      min-width: 0;
    }

    .cuenta-texto strong {
      font-size: 0.76rem;
      color: #17314f;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cuenta-texto small {
      font-size: 0.66rem;
      color: #607893;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chevron {
      font-size: 1.1rem;
      color: #5f7390;
    }

    .panel-float {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      background: #fff;
      border: 1px solid #dbe5f2;
      border-radius: 0.95rem;
      box-shadow: 0 18px 36px rgba(16, 39, 73, 0.15);
      z-index: 30;
    }

    .panel-cuenta {
      width: 220px;
      padding: 0.4rem;
      display: grid;
      gap: 0.2rem;
    }

    .panel-cuenta button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border: 0;
      background: transparent;
      text-align: left;
      padding: 0.6rem;
      border-radius: 0.65rem;
      font-weight: 700;
      color: #27405c;
      cursor: pointer;
      width: 100%;
    }

    .panel-cuenta button:hover {
      background: #eef5ff;
    }

    .panel-cuenta .accion-peligro {
      color: #8f1f1f;
    }

    .panel-cuenta .accion-peligro:hover {
      background: #ffe9e9;
    }

    .contenido-router {
      display: block;
    }

    @media (max-width: 1100px) {
      .layout-dashboard {
        grid-template-columns: 1fr;
      }

      .sidenav {
        position: static;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid #d7dde7;
      }

      .boton-alerta {
        margin-top: 0.4rem;
      }
    }

    @media (max-width: 720px) {
      .contenido {
        padding: 1rem;
      }

      .topbar {
        flex-direction: column;
        align-items: stretch;
      }

      .topbar-actions {
        justify-content: space-between;
      }

      .cuenta-boton {
        max-width: calc(100vw - 2rem);
      }
    }
  `]
})
export class SuperAdminDashboardComponent {
  mostrarMenuCuenta = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }

  toggleMenuCuenta(event: MouseEvent): void {
    event.stopPropagation();
    this.mostrarMenuCuenta = !this.mostrarMenuCuenta;
  }

  obtenerIniciales(): string {
    return 'SA';
  }

  @HostListener('document:click', ['$event'])
  onDocumentoClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.mostrarMenuCuenta = false;
    }
  }
}