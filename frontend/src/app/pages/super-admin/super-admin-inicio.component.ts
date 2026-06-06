import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface DashboardData {
  totales: {
    talleres: number;
    tecnicos: number;
    incidentes: number;
    clientes: number;
    ingresos_totales_usd: number;
  };
  talleres_por_plan: {
    gratuito: number;
    premium: number;
  };
}

@Component({
  selector: 'app-super-admin-inicio',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-inicio">
      <!-- Loading -->
      <div *ngIf="cargando" class="loading">
        Cargando métricas...
      </div>

      <!-- Stats Grid similar a taller -->
      <div class="resumen-grid" *ngIf="!cargando">
        <article class="resumen-card">
          <span>Total Talleres</span>
          <strong>{{ totalTalleres }}</strong>
        </article>
        <article class="resumen-card resumen-card-principal">
          <span>Técnicos</span>
          <strong>{{ totalTecnicos }}</strong>
        </article>
        <article class="resumen-card">
          <span>Incidentes</span>
          <strong>{{ totalIncidentes }}</strong>
        </article>
        <article class="resumen-card">
          <span>Clientes</span>
          <strong>{{ totalClientes }}</strong>
        </article>
        <article class="resumen-card resumen-card-ingresos">
          <span>Ingresos Totales</span>
          <strong>{{ ingresosTotales | currency:'USD':'symbol':'1.2-2' }}</strong>
        </article>
      </div>

      <!-- Distribución de Talleres por Plan -->
      <div class="chart-card" *ngIf="!cargando">
        <h3>Distribución de Talleres por Plan</h3>
        <div class="plan-stats">
          <div class="plan-item">
            <div class="plan-info">
              <span class="plan-color plan-gratuito"></span>
              <span class="plan-name">Plan Gratuito</span>
            </div>
            <div class="plan-count">{{ talleresGratuito }}</div>
            <div class="plan-percent">{{ porcentajeGratuito }}%</div>
          </div>
          <div class="plan-item">
            <div class="plan-info">
              <span class="plan-color plan-premium"></span>
              <span class="plan-name">Plan Premium</span>
            </div>
            <div class="plan-count">{{ talleresPremium }}</div>
            <div class="plan-percent">{{ porcentajePremium }}%</div>
          </div>
        </div>
        
        <div class="progress-bar-container">
          <div class="progress-bar-gratuito" [style.width.%]="porcentajeGratuito"></div>
          <div class="progress-bar-premium" [style.width.%]="porcentajePremium"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-inicio {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: #5f748e;
      font-weight: 500;
    }

    /* Grid de tarjetas estilo taller */
    .resumen-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.65rem;
    }

    .resumen-card {
      border-radius: 1rem;
      background: #fff;
      border: 1px solid #d9e3ef;
      box-shadow: 0 10px 24px rgba(3, 24, 51, 0.06);
      padding: 0.8rem 0.9rem;
      display: flex;
      flex-direction: column;
    }

    .resumen-card span {
      font-size: 0.67rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #5d748f;
      text-transform: uppercase;
    }

    .resumen-card strong {
      margin-top: 0.25rem;
      font-family: 'Manrope', sans-serif;
      font-size: 1.5rem;
      color: #12345a;
    }

    .resumen-card-principal {
      background: linear-gradient(135deg, #dff0ff 0%, #ebf5ff 100%);
      border-color: #b7d4f4;
    }

    .resumen-card-ingresos {
      background: linear-gradient(135deg, #e8f3e8 0%, #d4e8d4 100%);
      border-color: #b8d9b8;
    }

    /* Chart card */
    .chart-card {
      background: #fff;
      border-radius: 1rem;
      border: 1px solid #d9e3ef;
      box-shadow: 0 10px 24px rgba(3, 24, 51, 0.06);
      padding: 1.25rem;
    }

    .chart-card h3 {
      margin: 0 0 1.25rem 0;
      font-family: 'Manrope', sans-serif;
      font-size: 1rem;
      font-weight: 800;
      color: #16293f;
    }

    .plan-stats {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .plan-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
    }

    .plan-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .plan-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .plan-gratuito {
      background: #10b981;
    }

    .plan-premium {
      background: #f59e0b;
    }

    .plan-name {
      font-weight: 500;
      color: #2d435e;
    }

    .plan-count {
      font-weight: 700;
      color: #12345a;
    }

    .plan-percent {
      color: #5f748e;
      min-width: 50px;
      text-align: right;
      font-weight: 600;
    }

    .progress-bar-container {
      display: flex;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 0.5rem;
    }

    .progress-bar-gratuito {
      background: #10b981;
      transition: width 0.3s;
    }

    .progress-bar-premium {
      background: #f59e0b;
      transition: width 0.3s;
    }

    @media (max-width: 720px) {
      .resumen-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SuperAdminInicioComponent implements OnInit {
  cargando = true;
  
  totalTalleres = 0;
  totalTecnicos = 0;
  totalIncidentes = 0;
  totalClientes = 0;
  ingresosTotales = 0;
  
  talleresGratuito = 0;
  talleresPremium = 0;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarMetricas();
  }

  cargarMetricas(): void {
    this.cargando = true;
    this.http.get<DashboardData>('http://localhost:8000/api/v1/admin/dashboard', {
      headers: this.authService.obtenerHeadersAuth()
    }).subscribe({
      next: (data) => {
        this.totalTalleres = data?.totales?.talleres || 0;
        this.totalTecnicos = data?.totales?.tecnicos || 0;
        this.totalIncidentes = data?.totales?.incidentes || 0;
        this.totalClientes = data?.totales?.clientes || 0;
        this.ingresosTotales = data?.totales?.ingresos_totales_usd || 0;
        
        this.talleresGratuito = data?.talleres_por_plan?.gratuito || 0;
        this.talleresPremium = data?.talleres_por_plan?.premium || 0;
        
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando métricas:', err);
        this.cargando = false;
      }
    });
  }

  get totalTalleresPlan(): number {
    return this.talleresGratuito + this.talleresPremium;
  }

  get porcentajeGratuito(): number {
    const total = this.totalTalleresPlan;
    if (total === 0) return 0;
    return Math.round((this.talleresGratuito / total) * 100);
  }

  get porcentajePremium(): number {
    const total = this.totalTalleresPlan;
    if (total === 0) return 0;
    return Math.round((this.talleresPremium / total) * 100);
  }
}