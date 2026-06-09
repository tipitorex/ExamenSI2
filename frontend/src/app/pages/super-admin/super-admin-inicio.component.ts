import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface PlanStat { nombre: string; cantidad: number; }

interface RankingItem {
  taller_id: number;
  taller_nombre: string;
  promedio_puntuacion: number;
  total_resenas: number;
  promedio_tecnico: number | null;
}

interface DashboardData {
  totales: {
    talleres: number;
    incidentes: number;
    clientes: number;
    ingresos_planes_bob: number;
    ingresos_comisiones_bob: number;
    ingresos_totales_bob: number;
  };
  salud: {
    talleres_activos: number;
    incidentes_este_mes: number;
    tasa_finalizacion_pct: number;
    facturas_pendientes: number;
  };
  talleres_por_plan: PlanStat[];
}

@Component({
  selector: 'app-super-admin-inicio',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-inicio">

      <!-- Loading -->
      <div *ngIf="cargando" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando métricas...</p>
      </div>

      <ng-container *ngIf="!cargando && datos">

        <!-- ── Cabecera ─────────────────────────────── -->
        <div class="page-header">
          <div>
            <h2 class="page-title">Resumen General</h2>
            <p class="page-subtitle">Vista global de la plataforma CeroEspera</p>
          </div>
          <button class="btn-reload" (click)="cargarMetricas()">
            <span class="material-symbols-outlined">refresh</span>
            Actualizar
          </button>
        </div>

        <!-- ── Fila 1: Conteos ─────────────────────── -->
        <div class="kpi-grid">

          <div class="kpi-card">
            <div class="kpi-top">
              <div class="kpi-icon" style="background:#dbeafe; color:#1d4ed8;">
                <span class="material-symbols-outlined">store</span>
              </div>
              <span class="kpi-meta">Talleres registrados</span>
            </div>
            <div class="kpi-valor">{{ datos.totales.talleres }}</div>
            <p class="kpi-desc">
              <span class="kpi-sub-ok">{{ datos.salud.talleres_activos }} activos hoy</span>
              · {{ datos.totales.talleres - datos.salud.talleres_activos }} sin suscripción
            </p>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <div class="kpi-icon" style="background:#fee2e2; color:#b91c1c;">
                <span class="material-symbols-outlined">warning</span>
              </div>
              <span class="kpi-meta">Incidentes totales</span>
            </div>
            <div class="kpi-valor">{{ datos.totales.incidentes }}</div>
            <p class="kpi-desc">
              <span class="kpi-sub-ok">{{ datos.salud.incidentes_este_mes }} este mes</span>
              · {{ datos.salud.tasa_finalizacion_pct }}% finalización
            </p>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <div class="kpi-icon" style="background:#d1fae5; color:#065f46;">
                <span class="material-symbols-outlined">group</span>
              </div>
              <span class="kpi-meta">Clientes registrados</span>
            </div>
            <div class="kpi-valor">{{ datos.totales.clientes }}</div>
            <p class="kpi-desc">Usuarios activos en la plataforma</p>
          </div>

        </div>

        <!-- ── Fila 2: Ingresos ────────────────────── -->
        <div class="kpi-grid">

          <div class="kpi-card kpi-card-gradient kpi-gradient-total">
            <div class="kpi-top">
              <div class="kpi-icon" style="background:rgba(255,255,255,0.2); color:#fff;">
                <span class="material-symbols-outlined">account_balance</span>
              </div>
              <span class="kpi-meta" style="color:rgba(255,255,255,0.8);">Ingresos Totales</span>
            </div>
            <div class="kpi-valor" style="color:#fff;">
              {{ datos.totales.ingresos_totales_bob | currency:'BOB':'symbol':'1.2-2' }}
            </div>
            <p class="kpi-desc" style="color:rgba(255,255,255,0.75);">
              Planes + Comisiones de servicio
            </p>
          </div>

          <div class="kpi-card kpi-card-gradient kpi-gradient-planes">
            <div class="kpi-top">
              <div class="kpi-icon" style="background:rgba(255,255,255,0.2); color:#fff;">
                <span class="material-symbols-outlined">workspace_premium</span>
              </div>
              <span class="kpi-meta" style="color:rgba(255,255,255,0.8);">Ingresos por Planes</span>
            </div>
            <div class="kpi-valor" style="color:#fff;">
              {{ datos.totales.ingresos_planes_bob | currency:'BOB':'symbol':'1.2-2' }}
            </div>
            <p class="kpi-desc" style="color:rgba(255,255,255,0.75);">
              Suscripciones completadas
              · {{ pctPlanes }}% del total
            </p>
          </div>

          <div class="kpi-card kpi-card-gradient kpi-gradient-comisiones">
            <div class="kpi-top">
              <div class="kpi-icon" style="background:rgba(255,255,255,0.2); color:#fff;">
                <span class="material-symbols-outlined">percent</span>
              </div>
              <span class="kpi-meta" style="color:rgba(255,255,255,0.8);">Ingresos por Comisión</span>
            </div>
            <div class="kpi-valor" style="color:#fff;">
              {{ datos.totales.ingresos_comisiones_bob | currency:'BOB':'symbol':'1.2-2' }}
            </div>
            <p class="kpi-desc" style="color:rgba(255,255,255,0.75);">
              Comisiones de facturas pagadas
              · {{ pctComisiones }}% del total
            </p>
          </div>

        </div>

        <!-- ── Fila 3: Salud + Planes ──────────────── -->
        <div class="bottom-row">

          <!-- Salud de la plataforma -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <span class="material-symbols-outlined" style="color:#0077ce;vertical-align:middle;font-size:1rem;">monitor_heart</span>
                Salud de la Plataforma
              </h3>
            </div>
            <div class="salud-grid">

              <div class="salud-item">
                <div class="salud-icono" style="background:#dbeafe; color:#1d4ed8;">
                  <span class="material-symbols-outlined">store</span>
                </div>
                <div class="salud-body">
                  <p class="salud-label">Talleres activos</p>
                  <p class="salud-valor">{{ datos.salud.talleres_activos }}</p>
                  <div class="salud-bar-bg">
                    <div class="salud-bar" style="background:#1d4ed8;"
                      [style.width.%]="datos.totales.talleres > 0 ? (datos.salud.talleres_activos / datos.totales.talleres) * 100 : 0">
                    </div>
                  </div>
                  <p class="salud-sub">{{ datos.totales.talleres > 0 ? ((datos.salud.talleres_activos / datos.totales.talleres) * 100 | number:'1.0-0') : 0 }}% del total</p>
                </div>
              </div>

              <div class="salud-item">
                <div class="salud-icono" style="background:#fef3c7; color:#92400e;">
                  <span class="material-symbols-outlined">calendar_month</span>
                </div>
                <div class="salud-body">
                  <p class="salud-label">Incidentes este mes</p>
                  <p class="salud-valor">{{ datos.salud.incidentes_este_mes }}</p>
                  <div class="salud-bar-bg">
                    <div class="salud-bar" style="background:#f59e0b;"
                      [style.width.%]="datos.totales.incidentes > 0 ? (datos.salud.incidentes_este_mes / datos.totales.incidentes) * 100 : 0">
                    </div>
                  </div>
                  <p class="salud-sub">de {{ datos.totales.incidentes }} históricos</p>
                </div>
              </div>

              <div class="salud-item">
                <div class="salud-icono" style="background:#d1fae5; color:#065f46;">
                  <span class="material-symbols-outlined">task_alt</span>
                </div>
                <div class="salud-body">
                  <p class="salud-label">Tasa de finalización</p>
                  <p class="salud-valor">{{ datos.salud.tasa_finalizacion_pct }}<span style="font-size:0.9rem;font-weight:600;color:#8fa0b4;">%</span></p>
                  <div class="salud-bar-bg">
                    <div class="salud-bar"
                      [style.background]="datos.salud.tasa_finalizacion_pct >= 70 ? '#10b981' : datos.salud.tasa_finalizacion_pct >= 40 ? '#f59e0b' : '#ef4444'"
                      [style.width.%]="datos.salud.tasa_finalizacion_pct">
                    </div>
                  </div>
                  <p class="salud-sub">Incidentes finalizados exitosamente</p>
                </div>
              </div>

              <div class="salud-item">
                <div class="salud-icono" style="background:#fee2e2; color:#b91c1c;">
                  <span class="material-symbols-outlined">receipt_long</span>
                </div>
                <div class="salud-body">
                  <p class="salud-label">Facturas por cobrar</p>
                  <p class="salud-valor" [style.color]="datos.salud.facturas_pendientes > 0 ? '#b91c1c' : '#065f46'">
                    {{ datos.salud.facturas_pendientes }}
                  </p>
                  <div class="salud-bar-bg" *ngIf="datos.salud.facturas_pendientes > 0">
                    <div class="salud-bar" style="background:#ef4444; width:100%;"></div>
                  </div>
                  <p class="salud-sub">{{ datos.salud.facturas_pendientes === 0 ? 'Todo al día ✓' : 'Pendientes de pago' }}</p>
                </div>
              </div>

            </div>
          </div>

          <!-- Distribución por plan -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">
                <span class="material-symbols-outlined" style="color:#0077ce;vertical-align:middle;font-size:1rem;">pie_chart</span>
                Talleres por Plan
              </h3>
              <span class="badge-total">{{ datos.totales.talleres }} total</span>
            </div>

            <div *ngIf="datos.talleres_por_plan.length === 0" class="empty-state">
              Sin datos de planes
            </div>

            <div class="planes-list" *ngIf="datos.talleres_por_plan.length > 0">
              <div *ngFor="let p of datos.talleres_por_plan; let i = index" class="plan-row">
                <div class="plan-row-top">
                  <div class="plan-dot" [style.background]="coloresPlan[i % coloresPlan.length]"></div>
                  <span class="plan-nombre">{{ p.nombre }}</span>
                  <span class="plan-count">{{ p.cantidad }}</span>
                  <span class="plan-pct">{{ datos.totales.talleres > 0 ? ((p.cantidad / datos.totales.talleres) * 100 | number:'1.0-0') : 0 }}%</span>
                </div>
                <div class="plan-bar-bg">
                  <div class="plan-bar"
                    [style.background]="coloresPlan[i % coloresPlan.length]"
                    [style.width.%]="datos.totales.talleres > 0 ? (p.cantidad / datos.totales.talleres) * 100 : 0">
                  </div>
                </div>
              </div>
            </div>

            <!-- Barra apilada visual -->
            <div class="stacked-bar" *ngIf="datos.talleres_por_plan.length > 0">
              <div
                *ngFor="let p of datos.talleres_por_plan; let i = index"
                class="stacked-segment"
                [style.background]="coloresPlan[i % coloresPlan.length]"
                [style.flex]="p.cantidad"
                [title]="p.nombre + ': ' + p.cantidad">
              </div>
            </div>

          </div>

        </div>

        <!-- ── Ranking por Opiniones ──────────────── -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <span class="material-symbols-outlined" style="color:#f59e0b;vertical-align:middle;font-size:1rem;">star</span>
              Ranking de Talleres por Opiniones
            </h3>
            <span class="badge-total">{{ rankingTalleres.length }} talleres calificados</span>
          </div>

          <div *ngIf="rankingTalleres.length === 0" class="empty-state">
            Aún no hay reseñas registradas en la plataforma
          </div>

          <div *ngIf="rankingTalleres.length > 0" class="ranking-table-wrap">
            <table class="ranking-tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Taller</th>
                  <th>Puntuación</th>
                  <th>Reseñas</th>
                  
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of rankingTalleres; let i = index">
                  <td>
                    <span class="rank-badge"
                      [class.rank-gold]="i === 0"
                      [class.rank-silver]="i === 1"
                      [class.rank-bronze]="i === 2">
                      {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1 }}
                    </span>
                  </td>
                  <td class="rank-nombre">{{ t.taller_nombre }}</td>
                  <td>
                    <div class="rating-wrap">
                      <div class="stars-container">
                        <span class="stars-bg">★★★★★</span>
                        <span class="stars-fill" [style.width.%]="(t.promedio_puntuacion / 5) * 100">★★★★★</span>
                      </div>
                      <span class="rating-num">{{ t.promedio_puntuacion | number:'1.1-1' }}</span>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="resenas-badge">{{ t.total_resenas }}</span>
                  </td>
                  <td class="text-center">
                    <span *ngIf="t.promedio_tecnico" class="tecnico-score">
                      ⭐ {{ t.promedio_tecnico | number:'1.1-1' }}
                    </span>
                    <span *ngIf="!t.promedio_tecnico" class="sin-dato">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .dashboard-inicio {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    /* ── Loading ──────────────────────────────── */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      gap: 1rem;
      color: #5f748e;
    }

    .spinner {
      width: 2.2rem;
      height: 2.2rem;
      border: 3px solid #d9e3ef;
      border-top-color: #0077ce;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Cabecera ─────────────────────────────── */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .page-title {
      margin: 0;
      font-family: 'Manrope', sans-serif;
      font-size: 1.4rem;
      font-weight: 800;
      color: #10223b;
    }

    .page-subtitle {
      margin: 0.15rem 0 0;
      font-size: 0.8rem;
      color: #5b687d;
      font-weight: 500;
    }

    .btn-reload {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.9rem;
      border: 1px solid #d9e3ef;
      background: #fff;
      border-radius: 0.6rem;
      font-weight: 700;
      font-size: 0.78rem;
      cursor: pointer;
      color: #2d435e;
      transition: background 0.15s;
    }

    .btn-reload:hover { background: #eef5ff; }
    .btn-reload .material-symbols-outlined { font-size: 1rem; }

    /* ── KPI Grid ─────────────────────────────── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.85rem;
    }

    .kpi-card {
      background: #fff;
      border: 1px solid #d9e3ef;
      border-radius: 1rem;
      padding: 1rem 1.1rem;
      box-shadow: 0 6px 20px rgba(3, 24, 51, 0.05);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      transition: box-shadow 0.2s;
    }

    .kpi-card:hover { box-shadow: 0 10px 28px rgba(3, 24, 51, 0.1); }

    .kpi-card-gradient {
      border: none;
    }

    .kpi-gradient-total {
      background: linear-gradient(135deg, #0077ce, #005ea4);
    }

    .kpi-gradient-planes {
      background: linear-gradient(135deg, #059669, #047857);
    }

    .kpi-gradient-comisiones {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
    }

    .kpi-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .kpi-icon {
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 0.6rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kpi-icon .material-symbols-outlined { font-size: 1.15rem; }

    .kpi-meta {
      font-size: 0.63rem;
      font-weight: 700;
      color: #8fa0b4;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      text-align: right;
    }

    .kpi-valor {
      font-family: 'Manrope', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      color: #10223b;
      line-height: 1.1;
    }

    .kpi-unidad {
      font-size: 0.9rem;
      font-weight: 600;
      color: #8fa0b4;
    }

    .kpi-desc {
      margin: 0;
      font-size: 0.7rem;
      color: #7e92a8;
      line-height: 1.3;
    }

    .kpi-sub-ok {
      color: #065f46;
      font-weight: 700;
    }

    /* ── Cards genéricos ──────────────────────── */
    .card {
      background: #fff;
      border: 1px solid #d9e3ef;
      border-radius: 1rem;
      padding: 1.15rem;
      box-shadow: 0 6px 20px rgba(3, 24, 51, 0.05);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .card-title {
      margin: 0;
      font-family: 'Manrope', sans-serif;
      font-size: 0.88rem;
      font-weight: 800;
      color: #16293f;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .badge-total {
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
    }

    /* ── Fila inferior ────────────────────────── */
    .bottom-row {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 0.85rem;
    }

    /* ── Salud ────────────────────────────────── */
    .salud-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .salud-item {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
    }

    .salud-icono {
      width: 2rem;
      height: 2rem;
      border-radius: 0.6rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .salud-icono .material-symbols-outlined { font-size: 1.05rem; }

    .salud-body { flex: 1; min-width: 0; }

    .salud-label {
      margin: 0 0 0.1rem;
      font-size: 0.68rem;
      font-weight: 700;
      color: #8fa0b4;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .salud-valor {
      margin: 0 0 0.3rem;
      font-family: 'Manrope', sans-serif;
      font-size: 1.5rem;
      font-weight: 800;
      color: #10223b;
      line-height: 1.1;
    }

    .salud-bar-bg {
      width: 100%;
      height: 5px;
      background: #eef2f7;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 0.25rem;
    }

    .salud-bar {
      height: 100%;
      border-radius: 999px;
      transition: width 1s ease-out;
    }

    .salud-sub {
      margin: 0;
      font-size: 0.65rem;
      color: #8fa0b4;
      font-weight: 500;
    }

    /* ── Planes por plan ──────────────────────── */
    .planes-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      margin-bottom: 0.85rem;
    }

    .plan-row { display: flex; flex-direction: column; gap: 0.3rem; }

    .plan-row-top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .plan-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .plan-nombre {
      flex: 1;
      font-size: 0.78rem;
      font-weight: 600;
      color: #2d435e;
    }

    .plan-count {
      font-size: 0.78rem;
      font-weight: 800;
      color: #0077ce;
    }

    .plan-pct {
      font-size: 0.7rem;
      color: #8fa0b4;
      min-width: 2.5rem;
      text-align: right;
    }

    .plan-bar-bg {
      width: 100%;
      height: 6px;
      background: #eef2f7;
      border-radius: 999px;
      overflow: hidden;
    }

    .plan-bar {
      height: 100%;
      border-radius: 999px;
      transition: width 1s ease-out;
    }

    .stacked-bar {
      display: flex;
      height: 10px;
      border-radius: 999px;
      overflow: hidden;
      margin-top: 0.5rem;
      gap: 2px;
    }

    .stacked-segment {
      min-width: 4px;
      border-radius: 999px;
      transition: flex 0.6s ease-out;
    }

    /* ── Empty state ──────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 1.5rem;
      color: #8fa0b4;
      font-size: 0.78rem;
      font-weight: 500;
    }

    /* ── Responsive ───────────────────────────── */
    @media (max-width: 1100px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .bottom-row { grid-template-columns: 1fr; }
    }

    @media (max-width: 680px) {
      .kpi-grid { grid-template-columns: 1fr; }
      .salud-grid { grid-template-columns: 1fr; }
    }

    /* ── Ranking tabla ────────────────────────── */
    .ranking-table-wrap { overflow-x: auto; }

    .ranking-tabla {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }

    .ranking-tabla thead tr { background: #f6f9fd; }

    .ranking-tabla th {
      padding: 0.5rem 0.85rem;
      text-align: left;
      font-size: 0.65rem;
      font-weight: 800;
      color: #8fa0b4;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }

    .ranking-tabla td {
      padding: 0.7rem 0.85rem;
      border-bottom: 1px solid #f0f4f9;
      color: #2d435e;
    }

    .ranking-tabla tr:last-child td { border-bottom: none; }
    .ranking-tabla tr:hover td { background: #f8fafd; }

    .text-center { text-align: center; }

    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.8rem;
      height: 1.8rem;
      border-radius: 50%;
      font-size: 0.72rem;
      font-weight: 800;
      background: #eef2f7;
      color: #5b687d;
    }

    .rank-gold { background: #fef9c3; color: #854d0e; }
    .rank-silver { background: #f1f5f9; color: #475569; }
    .rank-bronze { background: #fef3e2; color: #92400e; }

    .rank-nombre {
      font-weight: 700;
      color: #10223b;
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rating-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stars-container {
      position: relative;
      display: inline-block;
      font-size: 1rem;
      line-height: 1;
      color: #d9e3ef;
    }

    .stars-bg { color: #d9e3ef; letter-spacing: 1px; }

    .stars-fill {
      position: absolute;
      top: 0;
      left: 0;
      overflow: hidden;
      white-space: nowrap;
      color: #f59e0b;
      letter-spacing: 1px;
    }

    .rating-num {
      font-size: 0.82rem;
      font-weight: 800;
      color: #10223b;
    }

    .resenas-badge {
      display: inline-block;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
    }

    .tecnico-score {
      font-size: 0.75rem;
      font-weight: 600;
      color: #5b687d;
    }

    .sin-dato {
      color: #c4d0de;
      font-size: 0.8rem;
    }
  `]
})
export class SuperAdminInicioComponent implements OnInit {
  cargando = true;
  datos: DashboardData | null = null;
  rankingTalleres: RankingItem[] = [];

  readonly coloresPlan = ['#0077ce', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarMetricas();
    this.cargarRanking();
  }

  cargarRanking(): void {
    this.http.get<RankingItem[]>('http://localhost:8000/api/v1/resenas/ranking-talleres', {
      headers: this.authService.obtenerHeadersAuth()
    }).subscribe({
      next: (data) => { this.rankingTalleres = data; },
      error: () => {}
    });
  }

  cargarMetricas(): void {
    this.cargando = true;
    this.http.get<DashboardData>('http://localhost:8000/api/v1/admin/dashboard', {
      headers: this.authService.obtenerHeadersAuth()
    }).subscribe({
      next: (data) => {
        this.datos = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando métricas:', err);
        this.cargando = false;
      }
    });
  }

  get pctPlanes(): number {
    if (!this.datos || this.datos.totales.ingresos_totales_bob === 0) return 0;
    return Math.round((this.datos.totales.ingresos_planes_bob / this.datos.totales.ingresos_totales_bob) * 100);
  }

  get pctComisiones(): number {
    if (!this.datos || this.datos.totales.ingresos_totales_bob === 0) return 0;
    return Math.round((this.datos.totales.ingresos_comisiones_bob / this.datos.totales.ingresos_totales_bob) * 100);
  }
}
