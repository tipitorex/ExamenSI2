import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SuperAdminService, TenantAdmin } from '../services/super-admin.service';

@Component({
  selector: 'app-super-admin-tenants',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tenants-view">
      <section class="hero-admin">
        <div>
          <p class="eyebrow">Control de plataforma</p>
          <h2>Tenants registrados</h2>
          <p class="subtitle">Administra plan y estado de cada red/taller tenant desde un panel centralizado.</p>
        </div>
        <button class="btn-ghost" type="button" (click)="cargarTenants()">
          <span class="material-symbols-outlined">refresh</span>
          Actualizar
        </button>
      </section>

      <section class="stats-grid" *ngIf="!cargando && !error">
        <article class="stat-card">
          <span class="material-symbols-outlined">apartment</span>
          <div>
            <p>Total tenants</p>
            <strong>{{ tenants.length }}</strong>
          </div>
        </article>
        <article class="stat-card">
          <span class="material-symbols-outlined">check_circle</span>
          <div>
            <p>Activos</p>
            <strong>{{ contarPorEstado('activo') }}</strong>
          </div>
        </article>
        <article class="stat-card">
          <span class="material-symbols-outlined">stars</span>
          <div>
            <p>Plan Pro</p>
            <strong>{{ contarPorPlan('pro') }}</strong>
          </div>
        </article>
        <article class="stat-card">
          <span class="material-symbols-outlined">warning</span>
          <div>
            <p>Suspendidos</p>
            <strong>{{ contarPorEstado('suspendido') }}</strong>
          </div>
        </article>
      </section>

      <div *ngIf="cargando" class="card-admin loading-state">
        <span class="material-symbols-outlined spin">progress_activity</span>
        Cargando tenants...
      </div>

      <div *ngIf="error" class="card-admin error-state">
        <span class="material-symbols-outlined">error</span>
        {{ error }}
      </div>

      <section class="table-card" *ngIf="!cargando && !error">
        <header class="table-head">
          <span>Tenant</span>
          <span>Plan</span>
          <span>Estado</span>
          <span>Acciones</span>
        </header>

        <article class="tenant-row" *ngFor="let tenant of tenants">
          <div class="tenant-main">
            <h3>{{ tenant.nombre }}</h3>
            <p>
              <span>slug: {{ tenant.slug }}</span>
              <span>schema: {{ tenant.schema_name }}</span>
            </p>
          </div>

          <div>
            <span class="badge" [ngClass]="clasePlan(tenant.plan_actual)">
              {{ (tenant.plan_actual || 'sin plan') | uppercase }}
            </span>
          </div>

          <div>
            <span class="badge" [ngClass]="claseEstado(tenant.estado)">
              {{ tenant.estado | uppercase }}
            </span>
          </div>

          <div class="actions">
            <div class="actions-row">
              <button class="btn-admin btn-outline" (click)="cambiarPlan(tenant, 'free')">Plan Free</button>
              <button class="btn-admin btn-primary" (click)="cambiarPlan(tenant, 'pro')">Plan Pro</button>
            </div>
            <div class="actions-row">
              <button class="btn-admin btn-success" (click)="cambiarEstado(tenant, 'activo', true)">Activar</button>
              <button class="btn-admin btn-warn" (click)="cambiarEstado(tenant, 'suspendido', false)">Suspender</button>
            </div>
          </div>
        </article>

        <div class="empty-state" *ngIf="tenants.length === 0">
          <span class="material-symbols-outlined">folder_open</span>
          <p>No hay tenants registrados todavía.</p>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .tenants-view {
        display: grid;
        gap: 1rem;
      }

      .hero-admin {
        background: linear-gradient(120deg, #ffffff 0%, #eef5ff 100%);
        border: 1px solid #d5e4f8;
        border-radius: 18px;
        padding: 1.1rem 1.2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .eyebrow {
        margin: 0 0 0.25rem;
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #5f7390;
        font-weight: 800;
      }

      .hero-admin h2 {
        margin: 0;
        font-family: 'Manrope', sans-serif;
        font-size: clamp(1.25rem, 1.8vw, 1.7rem);
        color: #132237;
      }

      .subtitle {
        margin: 0.3rem 0 0;
        color: #5c718e;
        font-size: 0.9rem;
      }

      .card-admin {
        background: var(--surface, #ffffff);
        border: 1px solid #d7dde7;
        border-radius: 18px;
        padding: 1.25rem;
      }

      .table-card {
        background: #ffffff;
        border: 1px solid #d7dde7;
        border-radius: 18px;
        overflow: hidden;
      }

      .table-head {
        display: grid;
        grid-template-columns: 2.3fr 0.8fr 0.9fr 1.6fr;
        gap: 0.75rem;
        padding: 0.8rem 1rem;
        background: #f5f8fd;
        border-bottom: 1px solid #dfe7f2;
        color: #5a708d;
        font-size: 0.78rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .tenant-row {
        display: grid;
        grid-template-columns: 2.3fr 0.8fr 0.9fr 1.6fr;
        gap: 0.75rem;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #edf2f8;
      }

      .tenant-row:last-child {
        border-bottom: 0;
      }

      .tenant-main h3 {
        margin: 0;
        font-size: 1rem;
        color: #11243d;
        font-family: 'Manrope', sans-serif;
      }

      .tenant-main p {
        margin: 0.3rem 0 0;
        color: #607893;
        font-size: 0.8rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.8rem;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0.28rem 0.65rem;
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.03em;
      }

      .badge-plan-pro {
        background: #d8ebff;
        color: #005ea4;
      }

      .badge-plan-free {
        background: #eaf6ea;
        color: #206b39;
      }

      .badge-plan-none {
        background: #f1f4f8;
        color: #566881;
      }

      .badge-estado-activo {
        background: #eaf6ea;
        color: #206b39;
      }

      .badge-estado-suspendido {
        background: #fff4e8;
        color: #8f4a00;
      }

      .badge-estado-inactivo {
        background: #fdecec;
        color: #9f1e1e;
      }

      .actions {
        display: grid;
        gap: 0.4rem;
      }

      .actions-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }

      .btn-admin {
        border: 1px solid #cfd9e7;
        border-radius: 10px;
        padding: 0.4rem 0.65rem;
        font-size: 0.78rem;
        font-weight: 700;
        background: white;
        color: #324c69;
        cursor: pointer;
      }

      .btn-outline:hover {
        background: #eef5ff;
      }

      .btn-primary {
        background: #d8ebff;
        border-color: #b7d7fb;
        color: #005ea4;
      }

      .btn-primary:hover {
        background: #cde4ff;
      }

      .btn-success {
        background: #eaf6ea;
        border-color: #cbe9cb;
        color: #206b39;
      }

      .btn-success:hover {
        background: #dff0df;
      }

      .btn-warn {
        background: #fff4e8;
        border-color: #ffd6ad;
        color: #8f4a00;
      }

      .btn-warn:hover {
        background: #ffe9cf;
      }

      .btn-ghost {
        border: 1px solid #cfd9e7;
        border-radius: 10px;
        background: #fff;
        color: #335171;
        font-weight: 700;
        padding: 0.45rem 0.75rem;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        cursor: pointer;
      }

      .btn-ghost:hover {
        background: #eef5ff;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
      }

      .stat-card {
        border: 1px solid #d7dde7;
        border-radius: 14px;
        background: #ffffff;
        padding: 0.75rem 0.85rem;
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .stat-card span {
        width: 2rem;
        height: 2rem;
        border-radius: 999px;
        background: #eef5ff;
        color: #005ea4;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .stat-card p {
        margin: 0;
        color: #607893;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 700;
      }

      .stat-card strong {
        color: #14253c;
        font-family: 'Manrope', sans-serif;
        font-size: 1.15rem;
      }

      .loading-state,
      .error-state,
      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        color: #5a708d;
        font-weight: 700;
      }

      .error-state {
        color: #a22727;
      }

      .empty-state {
        padding: 1.4rem;
      }

      .spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 1080px) {
        .table-head,
        .tenant-row {
          grid-template-columns: 1fr;
          gap: 0.55rem;
        }

        .table-head {
          display: none;
        }

        .tenant-row {
          border-bottom: 1px solid #e7edf6;
          padding: 0.95rem;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
        }
      }

      @media (max-width: 800px) {
        .stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 560px) {
        .hero-admin {
          flex-direction: column;
          align-items: flex-start;
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SuperAdminTenantsComponent implements OnInit {
  tenants: TenantAdmin[] = [];
  cargando = false;
  error = '';

  constructor(private superAdminService: SuperAdminService) {}

  ngOnInit(): void {
    this.cargarTenants();
  }

  contarPorEstado(estado: 'activo' | 'suspendido' | 'inactivo'): number {
    return this.tenants.filter((tenant) => tenant.estado === estado).length;
  }

  contarPorPlan(plan: 'free' | 'pro'): number {
    return this.tenants.filter((tenant) => tenant.plan_actual === plan).length;
  }

  clasePlan(plan: 'free' | 'pro' | null): string {
    if (plan === 'pro') {
      return 'badge-plan-pro';
    }
    if (plan === 'free') {
      return 'badge-plan-free';
    }
    return 'badge-plan-none';
  }

  claseEstado(estado: 'activo' | 'suspendido' | 'inactivo'): string {
    if (estado === 'activo') {
      return 'badge-estado-activo';
    }
    if (estado === 'suspendido') {
      return 'badge-estado-suspendido';
    }
    return 'badge-estado-inactivo';
  }

  cargarTenants(): void {
    this.cargando = true;
    this.error = '';

    this.superAdminService.listarTenants(0, 100).subscribe({
      next: (items) => {
        this.tenants = items;
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la lista de tenants';
        this.cargando = false;
      },
    });
  }

  cambiarPlan(tenant: TenantAdmin, planCodigo: 'free' | 'pro'): void {
    this.superAdminService.cambiarPlanTenant(tenant.id, planCodigo).subscribe({
      next: (actualizado) => {
        this.tenants = this.tenants.map((item) => (item.id === tenant.id ? actualizado : item));
      },
      error: () => {
        this.error = `No se pudo cambiar el plan para ${tenant.nombre}`;
      },
    });
  }

  cambiarEstado(tenant: TenantAdmin, estado: 'activo' | 'suspendido' | 'inactivo', activo: boolean): void {
    this.superAdminService.cambiarEstadoTenant(tenant.id, { estado, activo }).subscribe({
      next: (actualizado) => {
        this.tenants = this.tenants.map((item) => (item.id === tenant.id ? actualizado : item));
      },
      error: () => {
        this.error = `No se pudo cambiar el estado para ${tenant.nombre}`;
      },
    });
  }
}
