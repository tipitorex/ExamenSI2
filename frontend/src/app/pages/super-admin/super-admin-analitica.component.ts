// frontend/src/app/pages/super-admin/super-admin-analitica.component.ts
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Chart, registerables } from 'chart.js';
import { AnaliticaService, DashboardAnalitica } from '../../services/analitica.service';

Chart.register(...registerables);

@Component({
  selector: 'app-super-admin-analitica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="analitica-dashboard">
      <div class="header">
        <h1>📊 Analítica Operacional</h1>
        <div class="filtros">
          <input type="date" [(ngModel)]="fechaInicio" (change)="cargarDatos()" />
          <span>a</span>
          <input type="date" [(ngModel)]="fechaFin" (change)="cargarDatos()" />
          <button (click)="cargarDatos()" class="btn-primary" [disabled]="isLoading">
            {{ isLoading ? 'Cargando...' : 'Actualizar' }}
          </button>
        </div>
        <div class="update-meta">
          <small>Actualización automática cada 15s</small>
          <small *ngIf="ultimoActualizacion">Última: {{ ultimoActualizacion }}</small>
        </div>
      </div>

      <!-- KPIs Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon">⏱️</div>
          <div class="kpi-info">
            <h3>Tiempo promedio asignación</h3>
            <div class="kpi-value">{{ dashboard?.kpi_generales?.tiempo_promedio_asignacion_minutos || 0 }} min</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🚗</div>
          <div class="kpi-info">
            <h3>Tiempo promedio llegada</h3>
            <div class="kpi-value">{{ dashboard?.kpi_generales?.tiempo_promedio_llegada_minutos || 0 }} min</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">📋</div>
          <div class="kpi-info">
            <h3>Total incidentes</h3>
            <div class="kpi-value">{{ dashboard?.kpi_generales?.total_incidentes_periodo || 0 }}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">✅</div>
          <div class="kpi-info">
            <h3>Tasa de resolución</h3>
            <div class="kpi-value">{{ dashboard?.kpi_generales?.porcentaje_resolucion || 0 }}%</div>
          </div>
        </div>
      </div>

      <!-- 🔥 Mapa de calor: Zonas con más incidentes -->
      <div class="map-card">
        <div class="card-header">
          <h3>🔥 Zonas con más incidentes</h3>
          <span class="badge">Círculo más grande = más incidentes</span>
        </div>
        <div id="mapaIncidentes" class="mapa-container"></div>
      </div>

      <!-- ❌ Casos cancelados + ⏱️ Cumplimiento SLA (dos columnas) -->
      <div class="two-columns">
        <!-- Casos Cancelados -->
        <div class="info-card">
          <h3>❌ Casos Cancelados</h3>
          <div class="cancelados-stats">
            <div class="stat-circle">
              <div class="stat-value">{{ dashboard?.casos_cancelados?.porcentaje_cancelacion || 0 }}%</div>
              <div class="stat-label">Tasa de cancelación</div>
            </div>
            <div class="stat-details">
              <div class="detail-row">
                <span>Total cancelados:</span>
                <strong>{{ dashboard?.casos_cancelados?.total_cancelados || 0 }}</strong>
              </div>
              <div class="detail-row" *ngFor="let item of dashboard?.casos_cancelados?.cancelados_por_estado | keyvalue">
                <span>{{ item.key }}:</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>
          <div class="motivos-section" *ngIf="dashboard?.casos_cancelados?.motivos_cancelacion">
            <h4>Motivos de cancelación</h4>
            <div class="motivos-list">
              <div *ngFor="let motivo of dashboard?.casos_cancelados?.motivos_cancelacion | keyvalue" class="motivo-item">
                <span>{{ motivo.key }}</span>
                <div class="motivo-bar">
                  <div class="motivo-fill" [style.width.%]="(motivo.value / (dashboard?.casos_cancelados?.total_cancelados || 1) * 100)"></div>
                </div>
                <span>{{ motivo.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cumplimiento SLA -->
        <div class="info-card">
          <h3>⏱️ Cumplimiento SLA ({{ dashboard?.cumplimiento_sla?.tiempo_sla_esperado_minutos || 30 }} min)</h3>
          <div class="sla-stats">
            <div class="sla-gauge">
              <div class="gauge-value" [class]="getSlaClass(dashboard?.cumplimiento_sla?.nivel_cumplimiento_porcentaje || 0)">
                {{ dashboard?.cumplimiento_sla?.nivel_cumplimiento_porcentaje || 0 }}%
              </div>
              <div class="gauge-label">Cumplimiento</div>
            </div>
            <div class="sla-details">
              <div class="detail-row success">
                <span>✅ Dentro de SLA:</span>
                <strong>{{ dashboard?.cumplimiento_sla?.incidentes_dentro_sla || 0 }}</strong>
              </div>
              <div class="detail-row danger">
                <span>❌ Fuera de SLA:</span>
                <strong>{{ dashboard?.cumplimiento_sla?.incidentes_fuera_sla || 0 }}</strong>
              </div>
              <div class="detail-row">
                <span>⏱️ Tiempo promedio respuesta:</span>
                <strong>{{ formatearTiempo(dashboard?.cumplimiento_sla?.tiempo_promedio_respuesta_sla_minutos || 0) }}</strong>
              </div>
            </div>
          </div>
          <div class="distribucion-section" *ngIf="dashboard?.cumplimiento_sla?.distribucion_tiempos">
            <h4>Distribución de tiempos</h4>
            <div *ngFor="let rango of dashboard?.cumplimiento_sla?.distribucion_tiempos" class="distribucion-item">
              <span>{{ rango.rango }}</span>
              <div class="distribucion-bar">
                <div class="distribucion-fill" [style.width.%]="rango.porcentaje"></div>
              </div>
              <span>{{ rango.porcentaje }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Gráficos -->
      <div class="charts-grid">
        <div class="chart-card">
          <h3>📈 Tendencia de Incidentes (30 días)</h3>
          <canvas id="tendenciaChart"></canvas>
        </div>
        <div class="chart-card">
          <h3>🥧 Incidentes por Tipo</h3>
          <canvas id="tiposChart"></canvas>
        </div>
      </div>

      <!-- Tabla de Talleres Eficientes -->
      <div class="table-card">
        <h3>🏆 Top Talleres Más Eficientes</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr><th>#</th><th>Taller</th><th>Score</th><th>Tiempo Respuesta</th><th>Tiempo Finalización</th><th>Incidentes</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let taller of dashboard?.talleres_top_eficientes; let i = index">
                <td class="rank">{{ i + 1 }}</td>
                <td class="taller-name"><strong>{{ taller.nombre_taller }}</strong></td>
                <td><div class="score-badge" [class]="getScoreClass(taller.score_eficiencia)">{{ taller.score_eficiencia }} pts</div></td>
                <td>{{ formatearTiempo(taller.tiempo_promedio_respuesta_minutos) }}</td>
                <td>{{ formatearTiempo(taller.tiempo_promedio_finalizacion_minutos) }}</td>
                <td>{{ taller.incidentes_atendidos }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Distribución Geográfica -->
      <div class="table-card">
        <h3>📍 Incidentes por Ciudad</h3>
        <div class="geo-grid">
          <div *ngFor="let ciudad of dashboard?.distribucion_geografica" class="geo-card">
            <div class="ciudad-nombre">{{ ciudad.ciudad }}</div>
            <div class="ciudad-cantidad">{{ ciudad.cantidad }} incidentes</div>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="getPorcentajeCiudad(ciudad.cantidad)"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .analitica-dashboard {
      padding: 24px;
      background: #f5f7fa;
      min-height: 100vh;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .filtros {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .update-meta {
      display: flex;
      gap: 12px;
      align-items: center;
      color: #7f8c8d;
      font-size: 12px;
      margin-top: 8px;
    }
    .btn-primary {
      background: #667eea;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-primary:disabled {
      background: #b0b7d0;
      cursor: not-allowed;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .kpi-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .kpi-icon { font-size: 48px; }
    .kpi-info h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #666;
    }
    .kpi-value {
      font-size: 28px;
      font-weight: bold;
      color: #2c3e50;
    }
    /* Mapa */
    .map-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .card-header h3 { margin: 0; }
    .badge {
      background: #ecf0f1;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      color: #7f8c8d;
    }
    .mapa-container {
      height: 400px;
      border-radius: 12px;
      overflow: hidden;
    }
    /* Dos columnas */
    .two-columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
      margin-bottom: 30px;
    }
    .info-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .info-card h3 {
      margin: 0 0 20px 0;
      color: #2c3e50;
    }
    .cancelados-stats, .sla-stats {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }
    .stat-circle, .sla-gauge {
      text-align: center;
      min-width: 120px;
    }
    .stat-value, .gauge-value {
      font-size: 48px;
      font-weight: bold;
      color: #e74c3c;
    }
    .gauge-value.sla-excellent { color: #27ae60; }
    .gauge-value.sla-good { color: #8bc34a; }
    .gauge-value.sla-average { color: #f39c12; }
    .gauge-value.sla-low { color: #e74c3c; }
    .stat-label, .gauge-label {
      font-size: 14px;
      color: #7f8c8d;
    }
    .stat-details, .sla-details {
      flex: 1;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #ecf0f1;
    }
    .detail-row.success { color: #27ae60; }
    .detail-row.danger { color: #e74c3c; }
    .motivos-section, .distribucion-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
    }
    .motivos-section h4, .distribucion-section h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #7f8c8d;
    }
    .motivo-item, .distribucion-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .motivo-bar, .distribucion-bar {
      flex: 1;
      height: 8px;
      background: #ecf0f1;
      border-radius: 4px;
      overflow: hidden;
    }
    .motivo-fill, .distribucion-fill {
      height: 100%;
      background: linear-gradient(90deg, #3498db, #9b59b6);
      border-radius: 4px;
    }
    /* Gráficos */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 24px;
      margin-bottom: 30px;
    }
    .chart-card, .table-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .chart-card canvas {
      max-height: 350px;
    }
    /* Tabla talleres */
    .table-responsive {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }
    .data-table th, .data-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    .data-table th {
      background: #f8f9fc;
    }
    .rank {
      font-weight: bold;
      color: #3498db;
    }
    .score-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 12px;
    }
    .score-excellent { background: #4caf50; color: white; }
    .score-good { background: #8bc34a; color: white; }
    .score-average { background: #ffc107; color: #333; }
    .score-low { background: #f44336; color: white; }
    /* Distribución geográfica */
    .geo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .geo-card {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .ciudad-nombre {
      font-weight: bold;
      margin-bottom: 8px;
    }
    .ciudad-cantidad {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    .progress-bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s ease;
    }
    @media (max-width: 768px) {
      .charts-grid { grid-template-columns: 1fr; }
      .two-columns { grid-template-columns: 1fr; }
      .mapa-container { height: 300px; }
    }
  `]
})
export class SuperAdminAnaliticaComponent implements OnInit, AfterViewInit, OnDestroy {
  dashboard?: DashboardAnalitica;
  fechaInicio: string = '';
  fechaFin: string = '';
  isLoading = false;
  ultimoActualizacion?: string;
  private autoRefreshTimer?: number;

  private tendenciaChart?: Chart;
  private tiposChart?: Chart;
  private mapa?: L.Map;
  private markersLayer?: L.LayerGroup;

  constructor(private analiticaService: AnaliticaService) {
    const hoy = new Date();
    this.fechaFin = hoy.toISOString().split('T')[0];
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    this.fechaInicio = hace30Dias.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.cargarDatos();
    this.iniciarAutoRefresh();
  }

  ngAfterViewInit() {
    this.inicializarMapa();
  }

  ngOnDestroy() {
    if (this.mapa) this.mapa.remove();
    if (this.tendenciaChart) this.tendenciaChart.destroy();
    if (this.tiposChart) this.tiposChart.destroy();
    this.detenerAutoRefresh();
  }

  iniciarAutoRefresh() {
    this.autoRefreshTimer = window.setInterval(() => {
      if (!this.isLoading) {
        this.cargarDatos();
      }
    }, 15000);
  }

  detenerAutoRefresh() {
    if (this.autoRefreshTimer) {
      window.clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = undefined;
    }
  }

  cargarDatos() {
    this.isLoading = true;
    this.analiticaService.getDashboardAnalitica(this.fechaInicio, this.fechaFin).subscribe({
      next: (data) => {
        this.dashboard = data;
        this.ultimoActualizacion = new Date().toLocaleTimeString();
        this.isLoading = false;
        setTimeout(() => {
          this.crearGraficos();
          this.actualizarMapa();
        }, 100);
      },
      error: (error) => {
        console.error('Error cargando analítica:', error);
        this.isLoading = false;
      }
    });
  }

  private inicializarMapa() {
    if (this.mapa) return;
    // Centro aproximado (Colombia)
    this.mapa = L.map('mapaIncidentes').setView([4.5709, -74.2973], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.mapa);
    this.markersLayer = L.layerGroup().addTo(this.mapa);
  }

  private actualizarMapa() {
    if (!this.mapa || !this.markersLayer || !this.dashboard?.zonas_calientes) return;
    this.markersLayer.clearLayers();
    const zonas = this.dashboard.zonas_calientes;
    if (!zonas.length) return;

    const maxIncidentes = Math.max(...zonas.map(z => z.cantidad), 1);
    zonas.forEach(zona => {
      const radius = 10 + (zona.cantidad / maxIncidentes) * 30;
      const color = this.obtenerColorPorCantidad(zona.cantidad, maxIncidentes);
      const marker = L.circleMarker([zona.latitud, zona.longitud], {
        radius,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7
      }).bindPopup(`
        <strong>📍 ${zona.ciudad || 'Ubicación'}</strong><br>
        🔧 Tipo: ${zona.tipo_incidente || 'No especificado'}<br>
        📊 Incidentes: ${zona.cantidad}
      `);
      this.markersLayer!.addLayer(marker);
    });

    // Ajustar vista para mostrar todos los puntos
    const bounds = L.latLngBounds(zonas.map(z => [z.latitud, z.longitud]));
    this.mapa.fitBounds(bounds);
  }

  private obtenerColorPorCantidad(cantidad: number, max: number): string {
    const ratio = cantidad / max;
    if (ratio >= 0.7) return '#e74c3c'; // rojo
    if (ratio >= 0.4) return '#f39c12'; // naranja
    if (ratio >= 0.2) return '#f1c40f'; // amarillo
    return '#2ecc71'; // verde
  }

  private crearGraficos() {
    if (!this.dashboard) return;
    // Tendencia
    if (this.tendenciaChart) this.tendenciaChart.destroy();
    const ctxTendencia = document.getElementById('tendenciaChart') as HTMLCanvasElement;
    if (ctxTendencia) {
      this.tendenciaChart = new Chart(ctxTendencia, {
        type: 'line',
        data: {
          labels: this.dashboard.tendencia_incidentes.map(i => i.fecha),
          datasets: [{
            label: 'Incidentes por día',
            data: this.dashboard.tendencia_incidentes.map(i => i.cantidad),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: { responsive: true, maintainAspectRatio: true }
      });
    }
    // Tipos
    if (this.tiposChart) this.tiposChart.destroy();
    const ctxTipos = document.getElementById('tiposChart') as HTMLCanvasElement;
    if (ctxTipos) {
      const tiposData = this.dashboard.incidentes_por_tipo;
      this.tiposChart = new Chart(ctxTipos, {
        type: 'doughnut',
        data: {
          labels: tiposData.map(t => this.mapearTipoIncidente(t.tipo)),
          datasets: [{
            data: tiposData.map(t => t.cantidad),
            backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff']
          }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
      });
    }
  }

  private mapearTipoIncidente(tipo: string): string {
    const tipos: Record<string, string> = {
      bateria: '🔋 Batería', llanta: '🛞 Llanta', motor: '🔧 Motor',
      choque: '💥 Choque', otros: '📌 Otros'
    };
    return tipos[tipo] || tipo;
  }

  formatearTiempo(minutos: number): string {
    if (minutos < 60) return `${Math.round(minutos)} min`;
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return `${horas}h ${mins}min`;
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-average';
    return 'score-low';
  }

  getSlaClass(porcentaje: number): string {
    if (porcentaje >= 90) return 'sla-excellent';
    if (porcentaje >= 70) return 'sla-good';
    if (porcentaje >= 50) return 'sla-average';
    return 'sla-low';
  }

  getPorcentajeCiudad(cantidad: number): number {
    const max = Math.max(...(this.dashboard?.distribucion_geografica.map(c => c.cantidad) || [0]));
    return max > 0 ? (cantidad / max) * 100 : 0;
  }
}