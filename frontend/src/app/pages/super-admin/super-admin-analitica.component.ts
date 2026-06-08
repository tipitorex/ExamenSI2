import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import * as L from 'leaflet';

interface PuntoMapa {
  id: number;
  lat: number;
  lng: number;
  tipo: string;
  estado: string;
  fecha: string;
  zona: string;
}

interface TallerItem {
  id: number;
  nombre: string;
}

interface RankingItem {
  taller_id: number;
  taller_nombre: string;
  promedio_puntuacion: number;
  total_resenas: number;
  promedio_tecnico: number | null;
}

interface CanceladoItem {
  id: number;
  clasificacion: string;
  descripcion: string;
  creado_en: string;
  tipo_cancelador: 'cliente' | 'taller' | 'sistema';
  nombre_cancelador: string;
  motivo: string | null;
}

interface AnalyticsData {
  filtro_taller: { id: number | null; nombre: string | null };
  kpis_tiempos: {
    tiempo_reporte_asignacion_min: number;
    tiempo_asignacion_encamino_min: number;
    tiempo_total_respuesta_min: number;
  };
  sla: {
    total_finalizados: number;
    dentro_sla: number;
    porcentaje: number;
    sla_minutos_objetivo: number;
  };
  incidentes_por_tipo: Array<{ tipo: string; count: number; porcentaje: number }>;
  cancelados: {
    total: number;
    recientes: CanceladoItem[];
  };
  talleres_eficientes: Array<{
    id: number;
    nombre: string;
    total_atendidos: number;
    tiempo_respuesta_avg_min: number;
    sla_porcentaje: number;
  }>;
  zonas: {
    distribucion: Array<{ zona: string; count: number; porcentaje: number }>;
    puntos_mapa: PuntoMapa[];
  };
  tendencia_sla_semanal: Array<{
    dia: string;
    es_hoy: boolean;
    porcentaje_sla: number;
    total_finalizados: number;
  }>;
}

@Component({
  selector: 'app-super-admin-analitica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="analitica-wrap">

      <!-- Filtro principal por taller (siempre visible) -->
      <div class="filtro-taller-bar">
        <div class="filtro-taller-inner">
          <span class="material-symbols-outlined filtro-icon">store</span>
          <span class="filtro-label">Ver analítica de:</span>
          <select class="filtro-select" [(ngModel)]="tallerIdFiltro" (ngModelChange)="onCambioFiltroTaller()">
            <option value="">Todos los talleres</option>
            <option *ngFor="let t of talleresFiltro" [value]="t.id">{{ t.nombre }}</option>
          </select>
          <span *ngIf="tallerIdFiltro" class="filtro-chip">
            <span class="material-symbols-outlined" style="font-size:0.85rem;">filter_alt</span>
            Filtrado
            <button class="filtro-clear" (click)="limpiarFiltroTaller()">✕</button>
          </span>
        </div>
      </div>

      <!-- Estado cargando -->
      <div *ngIf="cargando" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando analítica operacional...</p>
      </div>

      <!-- Error -->
      <div *ngIf="error && !cargando" class="error-state">
        <span class="material-symbols-outlined">error</span>
        <p>{{ error }}</p>
        <button (click)="cargarAnalytics()">Reintentar</button>
      </div>

      <!-- Contenido principal -->
      <ng-container *ngIf="datos && !cargando">

        <!-- Cabecera -->
        <div class="page-header">
          <div>
            <h2 class="page-title">Analítica Operacional</h2>
            <p class="page-subtitle">
              KPIs en tiempo real · Santa Cruz de la Sierra
              <ng-container *ngIf="datos.filtro_taller.nombre">
                · <strong style="color:#0077ce;">{{ datos.filtro_taller.nombre }}</strong>
              </ng-container>
            </p>
          </div>
          <div class="header-actions">
            <div class="sla-badge" [class.sla-ok]="datos.sla.porcentaje >= 95" [class.sla-warn]="datos.sla.porcentaje >= 80 && datos.sla.porcentaje < 95" [class.sla-danger]="datos.sla.porcentaje < 80">
              <span class="material-symbols-outlined">task_alt</span>
              Meta SLA: {{ datos.sla.sla_minutos_objetivo }} min
            </div>
            <button class="btn-reload" (click)="cargarAnalytics()">
              <span class="material-symbols-outlined">refresh</span>
              Actualizar
            </button>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid">

          <div class="kpi-card">
            <div class="kpi-top">
              <div class="kpi-icon" style="background: #dbeafe; color: #1d4ed8;">
                <span class="material-symbols-outlined">assignment_late</span>
              </div>
              <span class="kpi-meta">Reporte → Taller</span>
            </div>
            <div class="kpi-valor">
              {{ datos.kpis_tiempos.tiempo_reporte_asignacion_min }}
              <span class="kpi-unidad">min</span>
            </div>
            <p class="kpi-desc">Tiempo promedio de asignación</p>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <div class="kpi-icon" style="background: #d1fae5; color: #065f46;">
                <span class="material-symbols-outlined">directions_car</span>
              </div>
              <span class="kpi-meta">Asignación → En Camino</span>
            </div>
            <div class="kpi-valor">
              {{ datos.kpis_tiempos.tiempo_asignacion_encamino_min }}
              <span class="kpi-unidad">min</span>
            </div>
            <p class="kpi-desc">Tiempo hasta salida del técnico</p>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <div class="kpi-icon" style="background: #fef3c7; color: #92400e;">
                <span class="material-symbols-outlined">timer</span>
              </div>
              <span class="kpi-meta">Tiempo Total Respuesta</span>
            </div>
            <div class="kpi-valor">
              {{ datos.kpis_tiempos.tiempo_total_respuesta_min }}
              <span class="kpi-unidad">min</span>
            </div>
            <p class="kpi-desc">Desde reporte hasta técnico en ruta</p>
          </div>

          <div class="kpi-card kpi-card-sla" [class.kpi-sla-ok]="datos.sla.porcentaje >= 95" [class.kpi-sla-warn]="datos.sla.porcentaje >= 80 && datos.sla.porcentaje < 95" [class.kpi-sla-danger]="datos.sla.porcentaje < 80">
            <div class="kpi-top">
              <div class="kpi-icon" style="background: rgba(255,255,255,0.25); color: white;">
                <span class="material-symbols-outlined">verified</span>
              </div>
              <span class="kpi-meta" style="color: rgba(255,255,255,0.85);">
                Meta: {{ datos.sla.sla_minutos_objetivo }} min
              </span>
            </div>
            <div class="kpi-valor" style="color: white;">
              {{ datos.sla.porcentaje }}
              <span class="kpi-unidad" style="color: rgba(255,255,255,0.8);">%</span>
            </div>
            <p class="kpi-desc" style="color: rgba(255,255,255,0.8);">
              Cumplimiento SLA · {{ datos.sla.dentro_sla }}/{{ datos.sla.total_finalizados }} servicios
            </p>
          </div>

        </div>

        <!-- Fila: Tendencia SLA + Tipos -->
        <div class="charts-row">

          <!-- Tendencia SLA semanal -->
          <div class="card span-2">
            <div class="card-header">
              <h3 class="card-title">Tendencia SLA Semanal</h3>
              <div class="leyenda">
                <span class="leyenda-punto" style="background:#0077ce;"></span> Esta semana
              </div>
            </div>
            <div class="sla-chart-wrap">
              <div class="sla-chart">
                <div
                  *ngFor="let d of datos.tendencia_sla_semanal"
                  class="sla-col"
                  [class.sla-col-hoy]="d.es_hoy"
                  [title]="d.total_finalizados > 0 ? d.porcentaje_sla + '% SLA · ' + d.total_finalizados + ' servicios' : 'Sin datos'">
                  <span class="sla-pct-label">
                    {{ d.total_finalizados > 0 ? d.porcentaje_sla + '%' : '' }}
                  </span>
                  <div class="sla-bar-bg">
                    <div
                      class="sla-bar"
                      [class.sla-bar-nodata]="d.total_finalizados === 0"
                      [style.height.%]="d.total_finalizados > 0 ? d.porcentaje_sla : 8">
                    </div>
                  </div>
                  <span class="sla-dia" [class.sla-dia-hoy]="d.es_hoy">{{ d.dia }}</span>
                </div>
              </div>
              <!-- Línea de meta 95% -->
              <div class="meta-line">
                <span class="meta-label">Meta 95%</span>
              </div>
            </div>
          </div>

          <!-- Incidentes por tipo -->
          <div class="card">
            <h3 class="card-title">Incidentes por Tipo</h3>
            <div class="tipos-list">
              <div *ngFor="let t of datos.incidentes_por_tipo.slice(0, 6)" class="tipo-row">
                <div class="tipo-header">
                  <span class="tipo-emoji">{{ emojiTipo(t.tipo) }}</span>
                  <span class="tipo-nombre">{{ nombreTipo(t.tipo) }}</span>
                  <span class="tipo-stats">{{ t.count }} · <strong>{{ t.porcentaje }}%</strong></span>
                </div>
                <div class="tipo-bar-bg">
                  <div class="tipo-bar" [style.width.%]="t.porcentaje" [style.background]="colorTipo(t.tipo)"></div>
                </div>
              </div>
              <div *ngIf="datos.incidentes_por_tipo.length === 0" class="empty-state">
                Sin datos de clasificación aún
              </div>
            </div>
          </div>

        </div>

        <!-- Fila: Mapa + Zonas -->
        <div class="map-row">

          <!-- Mapa de incidentes -->
          <div class="card card-mapa span-2">
            <div class="card-header">
              <h3 class="card-title">
                <span class="material-symbols-outlined" style="color:#0077ce; vertical-align: middle;">map</span>
                Mapa de Incidentes · Santa Cruz de la Sierra
              </h3>
              <span class="badge-total">{{ datos.zonas.puntos_mapa.length }} reportes</span>
            </div>
            <div class="leyenda-mapa">
              <span *ngFor="let item of leyendaMapa" class="leyenda-item">
                <span class="leyenda-dot" [style.background]="item.color"></span>
                {{ item.label }}
              </span>
            </div>
            <div id="mapa-analitica" class="mapa-container"></div>
          </div>

          <!-- Distribución por zona -->
          <div class="card">
            <h3 class="card-title">Distribución por Zona</h3>
            <div class="zonas-list">
              <div *ngFor="let z of datos.zonas.distribucion" class="zona-row">
                <div class="zona-header">
                  <span class="zona-icono">{{ iconoZona(z.zona) }}</span>
                  <span class="zona-nombre">{{ z.zona }}</span>
                  <span class="zona-count">{{ z.count }}</span>
                  <span class="zona-pct">{{ z.porcentaje }}%</span>
                </div>
                <div class="zona-bar-bg">
                  <div class="zona-bar" [style.width.%]="z.porcentaje"></div>
                </div>
              </div>
              <div *ngIf="datos.zonas.distribucion.length === 0" class="empty-state">
                Sin incidentes con coordenadas registradas
              </div>
            </div>

            <!-- Resumen de estados en zonas -->
            <div class="zonas-resumen">
              <div class="resumen-item">
                <span class="resumen-label">Total en mapa</span>
                <strong>{{ datos.zonas.puntos_mapa.length }}</strong>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">Cancelados</span>
                <strong class="resumen-danger">{{ datos.cancelados.total }}</strong>
              </div>
              <div class="resumen-item">
                <span class="resumen-label">Finalizados</span>
                <strong class="resumen-ok">{{ datos.sla.total_finalizados }}</strong>
              </div>
            </div>
          </div>

        </div>

        <!-- Fila: Talleres + Cancelados + Ranking -->
        <div class="bottom-row">

          <!-- Talleres más eficientes -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Talleres más Eficientes</h3>
              <span class="card-subtitle">Por cumplimiento SLA</span>
            </div>
            <div *ngIf="datos.talleres_eficientes.length === 0" class="empty-state">
              Sin datos de talleres aún
            </div>
            <table *ngIf="datos.talleres_eficientes.length > 0" class="tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Taller</th>
                  <th>Atendidos</th>
                  <th>T. Respuesta</th>
                  <th>SLA</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of datos.talleres_eficientes; let i = index">
                  <td>
                    <span class="rank" [class.rank-gold]="i === 0" [class.rank-silver]="i === 1" [class.rank-bronze]="i === 2">
                      {{ i + 1 }}
                    </span>
                  </td>
                  <td class="taller-nombre">{{ t.nombre }}</td>
                  <td class="text-center">{{ t.total_atendidos }}</td>
                  <td class="text-center">{{ t.tiempo_respuesta_avg_min }} min</td>
                  <td>
                    <span class="sla-chip" [class.sla-chip-ok]="t.sla_porcentaje >= 95" [class.sla-chip-warn]="t.sla_porcentaje >= 80 && t.sla_porcentaje < 95" [class.sla-chip-danger]="t.sla_porcentaje < 80">
                      {{ t.sla_porcentaje }}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Emergencias canceladas -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title" style="color: #b91c1c;">
                <span class="material-symbols-outlined" style="vertical-align:middle; font-size:1.1rem;">cancel</span>
                Emergencias Canceladas
              </h3>
              <span class="badge-error">{{ datos.cancelados.total }} total</span>
            </div>
            <div *ngIf="datos.cancelados.recientes.length === 0" class="empty-state">
              No hay emergencias canceladas
            </div>
            <div class="cancelados-list">
              <div *ngFor="let c of datos.cancelados.recientes" class="cancelado-item">
                <div class="cancelado-icon">
                  <span class="material-symbols-outlined">cancel</span>
                </div>
                <div class="cancelado-body">
                  <div class="cancelado-top-row">
                    <p class="cancelado-id">INC-{{ c.id }}</p>
                    <span class="tipo-incidente-chip">
                      {{ emojiTipo(c.clasificacion) }} {{ nombreTipo(c.clasificacion) }}
                    </span>
                  </div>
                  <div class="cancelador-row">
                    <span class="cancelador-chip"
                      [class.chip-cliente]="c.tipo_cancelador === 'cliente'"
                      [class.chip-taller]="c.tipo_cancelador === 'taller'">
                      <span class="material-symbols-outlined" style="font-size:0.8rem;">
                        {{ c.tipo_cancelador === 'cliente' ? 'person' : 'store' }}
                      </span>
                      {{ c.tipo_cancelador === 'cliente' ? 'Cliente' : 'Taller' }}: {{ c.nombre_cancelador }}
                    </span>
                  </div>
                  <p *ngIf="c.motivo" class="cancelado-motivo">
                    <span class="material-symbols-outlined" style="font-size:0.8rem;vertical-align:middle;">chat_bubble</span>
                    {{ c.motivo }}
                  </p>
                  <p class="cancelado-fecha">{{ formatFecha(c.creado_en) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Ranking por Opiniones -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title" style="color:#92400e;">
                <span class="material-symbols-outlined" style="vertical-align:middle;font-size:1.05rem;">star</span>
                Ranking Opiniones
              </h3>
              <span class="badge-total">{{ rankingTalleres.length }} calificados</span>
            </div>
            <div *ngIf="rankingTalleres.length === 0" class="empty-state">
              Aún no hay reseñas
            </div>
            <div class="ranking-list">
              <div *ngFor="let t of rankingTalleres; let i = index" class="ranking-item">
                <span class="rank-pos"
                  [class.rank-gold]="i === 0"
                  [class.rank-silver]="i === 1"
                  [class.rank-bronze]="i === 2">
                  {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1 }}
                </span>
                <div class="ranking-body">
                  <p class="ranking-nombre">{{ t.taller_nombre }}</p>
                  <div class="ranking-stars-row">
                    <div class="stars-container">
                      <span class="stars-bg">★★★★★</span>
                      <span class="stars-fill" [style.width.%]="(t.promedio_puntuacion / 5) * 100">★★★★★</span>
                    </div>
                    <span class="ranking-score">{{ t.promedio_puntuacion | number:'1.1-1' }}</span>
                    <span class="ranking-count">({{ t.total_resenas }})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .analitica-wrap {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* ── Loading / Error ──────────────────────── */
    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      gap: 1rem;
      color: #5f748e;
    }

    .spinner {
      width: 2.5rem;
      height: 2.5rem;
      border: 3px solid #d9e3ef;
      border-top-color: #0077ce;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-state .material-symbols-outlined { font-size: 2.5rem; color: #b91c1c; }
    .error-state button {
      padding: 0.5rem 1.25rem;
      background: #0077ce;
      color: white;
      border: 0;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 700;
    }

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
      font-size: 1.45rem;
      font-weight: 800;
      color: #10223b;
    }

    .page-subtitle {
      margin: 0.15rem 0 0;
      font-size: 0.8rem;
      color: #5b687d;
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .sla-badge {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .sla-badge .material-symbols-outlined { font-size: 1rem; }

    .sla-ok { background: #dcfce7; color: #166534; }
    .sla-warn { background: #fef9c3; color: #854d0e; }
    .sla-danger { background: #fee2e2; color: #991b1b; }

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
      grid-template-columns: repeat(4, 1fr);
      gap: 0.85rem;
    }

    .kpi-card {
      background: #fff;
      border: 1px solid #d9e3ef;
      border-radius: 1rem;
      padding: 1rem;
      box-shadow: 0 6px 20px rgba(3, 24, 51, 0.05);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      transition: box-shadow 0.2s;
    }

    .kpi-card:hover { box-shadow: 0 10px 28px rgba(3, 24, 51, 0.1); }

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
    }

    .kpi-icon .material-symbols-outlined { font-size: 1.2rem; }

    .kpi-meta {
      font-size: 0.65rem;
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

    .kpi-card-sla { border: none; }
    .kpi-sla-ok { background: linear-gradient(135deg, #0077ce, #005ea4); }
    .kpi-sla-warn { background: linear-gradient(135deg, #d97706, #b45309); }
    .kpi-sla-danger { background: linear-gradient(135deg, #dc2626, #b91c1c); }

    /* ── Cards ────────────────────────────────── */
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
      margin: 0 0 0.85rem;
      font-family: 'Manrope', sans-serif;
      font-size: 0.9rem;
      font-weight: 800;
      color: #16293f;
    }

    .card-header .card-title { margin: 0; }

    .card-subtitle {
      font-size: 0.7rem;
      color: #8fa0b4;
      font-weight: 600;
    }

    .badge-total {
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
    }

    .badge-error {
      background: #fee2e2;
      color: #991b1b;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
    }

    /* ── Layouts de filas ─────────────────────── */
    .charts-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 0.85rem;
    }

    .map-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 0.85rem;
    }

    .bottom-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.85rem;
    }

    /* ── SLA Chart ────────────────────────────── */
    .sla-chart-wrap {
      position: relative;
    }

    .sla-chart {
      display: flex;
      align-items: flex-end;
      gap: 0.4rem;
      height: 160px;
      padding: 0 0.5rem 0;
    }

    .sla-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      height: 100%;
      cursor: default;
    }

    .sla-pct-label {
      font-size: 0.6rem;
      font-weight: 700;
      color: #8fa0b4;
      min-height: 0.8rem;
    }

    .sla-col-hoy .sla-pct-label { color: #0077ce; }

    .sla-bar-bg {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: flex-end;
    }

    .sla-bar {
      width: 100%;
      background: #0077ce;
      border-radius: 4px 4px 0 0;
      transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      min-height: 4px;
    }

    .sla-bar-nodata { background: #e2e8f0; }
    .sla-col-hoy .sla-bar:not(.sla-bar-nodata) { background: #005ea4; box-shadow: 0 0 0 2px rgba(0,119,206,0.25); }

    .sla-dia {
      font-size: 0.65rem;
      font-weight: 700;
      color: #8fa0b4;
      text-transform: uppercase;
    }

    .sla-dia-hoy { color: #0077ce; }

    .meta-line {
      display: flex;
      align-items: center;
      margin-top: 0.4rem;
    }

    .meta-label {
      font-size: 0.65rem;
      font-weight: 600;
      color: #10b981;
      background: #dcfce7;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
    }

    .leyenda {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
      color: #7e92a8;
    }

    .leyenda-punto {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    /* ── Tipos de incidente ───────────────────── */
    .tipos-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .tipo-row { display: flex; flex-direction: column; gap: 0.3rem; }

    .tipo-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .tipo-emoji { font-size: 0.95rem; }

    .tipo-nombre {
      flex: 1;
      font-size: 0.78rem;
      font-weight: 600;
      color: #2d435e;
    }

    .tipo-stats {
      font-size: 0.72rem;
      color: #8fa0b4;
    }

    .tipo-bar-bg {
      width: 100%;
      height: 6px;
      background: #eef2f7;
      border-radius: 999px;
      overflow: hidden;
    }

    .tipo-bar {
      height: 100%;
      border-radius: 999px;
      transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    /* ── Mapa ─────────────────────────────────── */
    .card-mapa { padding-bottom: 0; }

    .leyenda-mapa {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .leyenda-item {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.68rem;
      font-weight: 600;
      color: #5b687d;
    }

    .leyenda-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .mapa-container {
      height: 360px;
      border-radius: 0 0 1rem 1rem;
      overflow: hidden;
    }

    /* ── Zonas ────────────────────────────────── */
    .zonas-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      margin-bottom: 1rem;
    }

    .zona-row { display: flex; flex-direction: column; gap: 0.3rem; }

    .zona-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .zona-icono { font-size: 1rem; }

    .zona-nombre {
      flex: 1;
      font-size: 0.78rem;
      font-weight: 700;
      color: #2d435e;
    }

    .zona-count {
      font-size: 0.78rem;
      font-weight: 700;
      color: #0077ce;
    }

    .zona-pct {
      font-size: 0.7rem;
      color: #8fa0b4;
      min-width: 2.5rem;
      text-align: right;
    }

    .zona-bar-bg {
      width: 100%;
      height: 7px;
      background: #eef2f7;
      border-radius: 999px;
      overflow: hidden;
    }

    .zona-bar {
      height: 100%;
      background: linear-gradient(90deg, #0077ce, #3b9ee8);
      border-radius: 999px;
      transition: width 1s ease-out;
    }

    .zonas-resumen {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-top: 1px solid #eef2f7;
      margin-top: 0.5rem;
    }

    .resumen-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
    }

    .resumen-label {
      font-size: 0.65rem;
      font-weight: 600;
      color: #8fa0b4;
      text-transform: uppercase;
    }

    .resumen-item strong { font-size: 1.1rem; font-weight: 800; color: #10223b; }
    .resumen-ok { color: #166534 !important; }
    .resumen-danger { color: #991b1b !important; }

    /* ── Tabla talleres ───────────────────────── */
    .tabla {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }

    .tabla thead tr {
      background: #f6f9fd;
      border-radius: 0.5rem;
    }

    .tabla th {
      padding: 0.5rem 0.75rem;
      text-align: left;
      font-size: 0.65rem;
      font-weight: 800;
      color: #8fa0b4;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .tabla td {
      padding: 0.65rem 0.75rem;
      border-bottom: 1px solid #f0f4f9;
      color: #2d435e;
      font-weight: 500;
    }

    .tabla tr:last-child td { border-bottom: none; }
    .tabla tr:hover td { background: #f8fafd; }

    .text-center { text-align: center; }

    .taller-nombre {
      font-weight: 700 !important;
      color: #10223b !important;
      max-width: 160px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rank {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      font-size: 0.7rem;
      font-weight: 800;
      background: #eef2f7;
      color: #5b687d;
    }

    .rank-gold { background: #fef9c3; color: #854d0e; }
    .rank-silver { background: #f1f5f9; color: #475569; }
    .rank-bronze { background: #fef3e2; color: #92400e; }

    .sla-chip {
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
    }

    .sla-chip-ok { background: #dcfce7; color: #166534; }
    .sla-chip-warn { background: #fef9c3; color: #854d0e; }
    .sla-chip-danger { background: #fee2e2; color: #991b1b; }

    /* ── Filtro Taller ────────────────────────── */
    .filtro-taller-bar {
      background: #fff;
      border: 1px solid #d9e3ef;
      border-radius: 0.85rem;
      padding: 0.75rem 1.15rem;
      box-shadow: 0 2px 8px rgba(3, 24, 51, 0.04);
    }

    .filtro-taller-inner {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .filtro-icon {
      font-size: 1.15rem;
      color: #0077ce;
    }

    .filtro-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #2d435e;
      white-space: nowrap;
    }

    .filtro-select {
      flex: 1;
      min-width: 220px;
      max-width: 360px;
      padding: 0.4rem 0.75rem;
      border: 1px solid #c8d8ea;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #2d435e;
      background: #f8fafd;
      outline: none;
      cursor: pointer;
      appearance: auto;
    }

    .filtro-select:focus { border-color: #0077ce; }

    .filtro-chip {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
    }

    .filtro-clear {
      background: none;
      border: none;
      color: #1d4ed8;
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0;
      line-height: 1;
      font-weight: 700;
    }

    /* ── Cancelados ───────────────────────────── */
    .cancelados-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .cancelado-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #fff8f8;
      border: 1px solid #fde8e8;
      border-radius: 0.65rem;
    }

    .cancelado-icon {
      flex-shrink: 0;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: #fee2e2;
      color: #b91c1c;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cancelado-icon .material-symbols-outlined { font-size: 1.1rem; }

    .cancelado-body { min-width: 0; flex: 1; }

    .cancelado-top-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.3rem;
    }

    .cancelado-id {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 800;
      color: #10223b;
    }

    .tipo-incidente-chip {
      font-size: 0.65rem;
      font-weight: 700;
      background: #f1f5f9;
      color: #475569;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
    }

    .cancelador-row {
      margin-bottom: 0.25rem;
    }

    .cancelador-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
    }

    .chip-cliente {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .chip-taller {
      background: #dcfce7;
      color: #166534;
    }

    .cancelado-motivo {
      margin: 0.2rem 0;
      font-size: 0.7rem;
      color: #5b687d;
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cancelado-fecha {
      margin: 0;
      font-size: 0.65rem;
      color: #8fa0b4;
      font-weight: 600;
    }

    /* ── Ranking Opiniones ────────────────────── */
    .ranking-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .ranking-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.55rem 0.65rem;
      border-radius: 0.65rem;
      border: 1px solid #f0f4f9;
      transition: background 0.15s;
    }

    .ranking-item:hover { background: #fafbfd; }

    .rank-pos {
      width: 1.7rem;
      height: 1.7rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 800;
      flex-shrink: 0;
      background: #eef2f7;
      color: #5b687d;
    }

    .rank-gold { background: #fef9c3; }
    .rank-silver { background: #f1f5f9; }
    .rank-bronze { background: #fef3e2; }

    .ranking-body { min-width: 0; flex: 1; }

    .ranking-nombre {
      margin: 0 0 0.2rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #10223b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ranking-stars-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .stars-container {
      position: relative;
      display: inline-block;
      font-size: 0.9rem;
      line-height: 1;
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

    .ranking-score {
      font-size: 0.78rem;
      font-weight: 800;
      color: #10223b;
    }

    .ranking-count {
      font-size: 0.68rem;
      color: #8fa0b4;
      font-weight: 500;
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
    @media (max-width: 1200px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .charts-row, .map-row { grid-template-columns: 1fr; }
      .bottom-row { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 780px) {
      .kpi-grid { grid-template-columns: 1fr; }
      .bottom-row { grid-template-columns: 1fr; }
    }
  `]
})
export class SuperAdminAnaliticaComponent implements OnInit, OnDestroy {
  cargando = true;
  error: string | null = null;
  datos: AnalyticsData | null = null;

  // Filtro por taller
  tallerIdFiltro: number | string = '';
  talleresFiltro: TallerItem[] = [];

  // Ranking por opiniones
  rankingTalleres: RankingItem[] = [];

  private map: L.Map | null = null;
  private markers: L.Marker[] = [];

  readonly leyendaMapa = [
    { label: 'Batería', color: '#f59e0b' },
    { label: 'Llanta', color: '#3b82f6' },
    { label: 'Motor', color: '#ef4444' },
    { label: 'Choque', color: '#991b1b' },
    { label: 'Grúa', color: '#8b5cf6' },
    { label: 'Llaves', color: '#10b981' },
    { label: 'Otros', color: '#6b7280' },
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarTalleresFiltro();
    this.cargarAnalytics();
    this.cargarRankingOpiniones();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  cargarTalleresFiltro(): void {
    this.http.get<{ talleres: TallerItem[] }>(
      'http://localhost:8000/api/v1/admin/talleres?limit=100',
      { headers: this.authService.obtenerHeadersAuth() }
    ).subscribe({
      next: (res) => { this.talleresFiltro = res.talleres || []; },
      error: () => {}
    });
  }

  cargarRankingOpiniones(): void {
    this.http.get<RankingItem[]>(
      'http://localhost:8000/api/v1/resenas/ranking-talleres',
      { headers: this.authService.obtenerHeadersAuth() }
    ).subscribe({
      next: (data) => { this.rankingTalleres = data; },
      error: () => {}
    });
  }

  onCambioFiltroTaller(): void {
    this.cargarAnalytics();
  }

  limpiarFiltroTaller(): void {
    this.tallerIdFiltro = '';
    this.cargarAnalytics();
  }

  cargarAnalytics(): void {
    this.cargando = true;
    this.error = null;
    const params = this.tallerIdFiltro ? `?taller_id=${this.tallerIdFiltro}` : '';
    this.http.get<AnalyticsData>(`http://localhost:8000/api/v1/admin/analytics${params}`, {
      headers: this.authService.obtenerHeadersAuth()
    }).subscribe({
      next: (data) => {
        this.datos = data;
        this.cargando = false;
        setTimeout(() => {
          this.inicializarMapa();
          this.actualizarMarcadores();
        }, 80);
      },
      error: (err) => {
        console.error('Error cargando analytics:', err);
        this.error = 'No se pudieron cargar los datos. Verifica la conexión.';
        this.cargando = false;
      }
    });
  }

  private inicializarMapa(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    const contenedor = document.getElementById('mapa-analitica');
    if (!contenedor) return;

    this.map = L.map('mapa-analitica').setView([-17.7833, -63.1822], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);
  }

  private actualizarMarcadores(): void {
    if (!this.map || !this.datos) return;
    this.markers.forEach(m => m.remove());
    this.markers = [];

    this.datos.zonas.puntos_mapa.forEach(punto => {
      const color = this.colorTipo(punto.tipo);
      const emoji = this.emojiTipo(punto.tipo);
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.28);border:2px solid white;">${emoji}</div>`,
        iconSize: [32, 32],
        popupAnchor: [0, -18]
      });

      const fecha = new Date(punto.fecha).toLocaleString('es-BO', {
        timeZone: 'America/La_Paz',
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });

      const marker = L.marker([punto.lat, punto.lng], { icon })
        .addTo(this.map!)
        .bindPopup(`
          <div style="padding:8px;min-width:170px;font-family:sans-serif;">
            <b style="color:#10223b;">Incidente #${punto.id}</b><br>
            <span style="font-size:12px;color:#5b687d;">Tipo: <b>${this.nombreTipo(punto.tipo)}</b></span><br>
            <span style="font-size:12px;color:#5b687d;">Estado: ${punto.estado}</span><br>
            <span style="font-size:12px;color:#5b687d;">Zona: ${punto.zona}</span><br>
            <span style="font-size:11px;color:#8fa0b4;">${fecha}</span>
          </div>
        `);
      this.markers.push(marker);
    });

    if (this.markers.length > 0 && this.map) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.15));
    }
  }

  colorTipo(tipo: string): string {
    const mapa: Record<string, string> = {
      bateria: '#f59e0b',
      llanta: '#3b82f6',
      motor: '#ef4444',
      choque: '#991b1b',
      grua: '#8b5cf6',
      llaves: '#10b981',
    };
    return mapa[tipo?.toLowerCase()] || '#6b7280';
  }

  emojiTipo(tipo: string): string {
    const mapa: Record<string, string> = {
      bateria: '🔋',
      llanta: '🔧',
      motor: '⚙️',
      choque: '💥',
      grua: '🚛',
      llaves: '🔑',
    };
    return mapa[tipo?.toLowerCase()] || '⚠️';
  }

  nombreTipo(tipo: string): string {
    const mapa: Record<string, string> = {
      bateria: 'Batería',
      llanta: 'Llanta',
      motor: 'Motor',
      choque: 'Choque',
      grua: 'Grúa',
      llaves: 'Llaves',
      sin_clasificar: 'Sin clasificar',
    };
    return mapa[tipo?.toLowerCase()] || tipo;
  }

  iconoZona(zona: string): string {
    const mapa: Record<string, string> = {
      Norte: '⬆️', Sur: '⬇️', Este: '➡️', Oeste: '⬅️'
    };
    return mapa[zona] || '📍';
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
