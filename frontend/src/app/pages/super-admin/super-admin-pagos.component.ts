import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface Pago {
  id: number;
  taller_id: number;
  taller_nombre: string;
  monto: number;
  fecha: string;
  estado: string;
  plan_id: number;
  plan_nombre: string;
}

@Component({
  selector: 'app-super-admin-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pagos-container">
      <!-- Hero / Header -->
      <div class="hero">
        <div>
          <h2>Historial de Pagos</h2>
          <p>Registro de todas las transacciones de suscripción de los talleres.</p>
        </div>
      </div>

      <!-- Barra de control -->
      <div class="barra-control">
        <div class="filtros">
          <div class="busqueda">
            <span class="material-symbols-outlined">search</span>
            <input 
              type="text" 
              [(ngModel)]="tallerIdFiltro" 
              (input)="cargarPagos()"
              placeholder="Filtrar por ID de taller..."
            />
          </div>
          <select [(ngModel)]="estadoFiltro" (change)="cargarPagos()" class="filter-select">
            <option value="">Todos los estados</option>
            <option value="completado">Completado</option>
            <option value="pendiente">Pendiente</option>
            <option value="fallido">Fallido</option>
          </select>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="cargando" class="loading">
        Cargando pagos...
      </div>

      <!-- Resumen de pagos -->
      <div class="resumen-grid" *ngIf="!cargando && pagos.length > 0">
        <article class="resumen-card">
          <span>Total Pagos</span>
          <strong>{{ pagos.length }}</strong>
        </article>
        <article class="resumen-card resumen-card-principal">
          <span>Monto Total</span>
          <strong>{{ formatearMonto(totalMonto) }}</strong>
        </article>
      </div>

      <!-- Tabla -->
      <div class="tabla-wrapper" *ngIf="!cargando">
        <table class="tabla-pagos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Taller</th>
              <th>Plan</th>
              <th>Monto</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let pago of pagos">
              <td><strong>{{ pago.id }}</strong></td>
              <td>
                <div class="taller-info">
                  <strong>{{ pago.taller_nombre }}</strong>
                  <small class="text-muted">ID: {{ pago.taller_id }}</small>
                </div>
              </td>
              <td>
                <span class="plan-badge" [class.premium]="pago.plan_nombre === 'premium'">
                  {{ pago.plan_nombre }}
                </span>
              </td>
              <td>{{ formatearMonto(pago.monto) }}</td>
              <td>{{ pago.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <span class="estado-badge" 
                      [class.completado]="pago.estado === 'completado'" 
                      [class.pendiente]="pago.estado === 'pendiente'"
                      [class.fallido]="pago.estado === 'fallido'">
                  {{ pago.estado }}
                </span>
              </td>
              <td>
                <div class="acciones-tabla">
                  <button class="btn-icon" (click)="verDetalle(pago)" title="Ver detalle">
                    <span class="material-symbols-outlined">visibility</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="pagos.length === 0">
              <td colspan="7" class="tabla-vacia">
                <span class="material-symbols-outlined">inbox</span>
                No hay pagos registrados
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal de detalle -->
      <div class="modal-backdrop" *ngIf="pagoSeleccionado" (click)="cerrarModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <span class="material-symbols-outlined">receipt</span>
              Detalle del Pago
            </h3>
            <button type="button" class="btn-cerrar-modal" (click)="cerrarModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <p><strong>ID Pago:</strong> {{ pagoSeleccionado.id }}</p>
            <p><strong>Taller:</strong> {{ pagoSeleccionado.taller_nombre }} (ID: {{ pagoSeleccionado.taller_id }})</p>
            <p><strong>Plan:</strong> {{ pagoSeleccionado.plan_nombre }}</p>
            <p><strong>Monto:</strong> {{ formatearMonto(pagoSeleccionado.monto) }}</p>
            <p><strong>Fecha:</strong> {{ pagoSeleccionado.fecha | date:'dd/MM/yyyy HH:mm:ss' }}</p>
            <p><strong>Estado:</strong> {{ pagoSeleccionado.estado }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="cerrarModal()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pagos-container {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .hero {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .hero h2 {
      margin: 0;
      font-family: 'Manrope', sans-serif;
      font-size: clamp(1.6rem, 2.8vw, 2.2rem);
      line-height: 1.05;
      color: #16293f;
    }

    .hero p {
      margin: 0.5rem 0 0;
      color: #5f748e;
      max-width: 540px;
    }

    .barra-control {
      border-radius: 1rem;
      border: 1px solid #d8e1ec;
      background: #fff;
      box-shadow: 0 12px 30px rgba(2, 21, 48, 0.07);
      padding: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.8rem;
      flex-wrap: wrap;
    }

    .filtros {
      display: flex;
      gap: 0.8rem;
      flex-wrap: wrap;
      flex: 1;
    }

    .busqueda {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      border: 1px solid #d2dbe8;
      border-radius: 999px;
      background: #fbfdff;
      padding: 0.42rem 0.72rem;
      min-width: min(220px, 100%);
    }

    .busqueda span {
      color: #7690ad;
    }

    .busqueda input {
      border: 0;
      outline: 0;
      width: 100%;
      background: transparent;
    }

    .filter-select {
      padding: 0.42rem 0.72rem;
      border: 1px solid #d2dbe8;
      border-radius: 999px;
      background: #fbfdff;
      color: #2d435e;
      font-size: 0.85rem;
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: #5f748e;
    }

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

    .tabla-wrapper {
      border-radius: 1rem;
      border: 1px solid #d9e4ef;
      background: #fff;
      box-shadow: 0 10px 26px rgba(3, 22, 49, 0.06);
      overflow: hidden;
      overflow-x: auto;
    }

    .tabla-pagos {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.83rem;
    }

    .tabla-pagos thead {
      background: #f4f8fd;
    }

    .tabla-pagos th {
      text-align: left;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: #5d748f;
      padding: 0.75rem 0.9rem;
      border-bottom: 1px solid #d9e4ef;
    }

    .tabla-pagos td {
      padding: 0.72rem 0.9rem;
      vertical-align: middle;
      border-bottom: 1px solid #ecf1f8;
    }

    .tabla-pagos tbody tr:hover td {
      background: #f7fbff;
    }

    .taller-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .text-muted {
      color: #94a3b8;
      font-size: 0.7rem;
    }

    .plan-badge {
      background: #e2e8f0;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .plan-badge.premium {
      background: #fef3c7;
      color: #d97706;
    }

    .estado-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .estado-badge.completado {
      background: #d1fae5;
      color: #065f46;
    }

    .estado-badge.pendiente {
      background: #fef3c7;
      color: #d97706;
    }

    .estado-badge.fallido {
      background: #fee2e2;
      color: #991b1b;
    }

    .acciones-tabla {
      display: flex;
      gap: 0.22rem;
      align-items: center;
    }

    .btn-icon {
      border: 0;
      background: #edf2f9;
      color: #2b4268;
      border-radius: 0.55rem;
      width: 2rem;
      height: 2rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .btn-icon:hover {
      background: #dbe6f8;
    }

    .tabla-vacia {
      text-align: center;
      padding: 2rem;
      color: #7896b4;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(8, 19, 36, 0.5);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }

    .modal-card {
      width: min(500px, 100%);
      border-radius: 1.2rem;
      background: #fff;
      color: #16293f;
      border: 2px solid #0a6ec0;
      box-shadow: 0 20px 60px rgba(10, 110, 192, 0.15);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      background: #f8fbff;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-header h3 {
      margin: 0;
      font-family: 'Manrope', sans-serif;
      font-size: 1.25rem;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #0a6ec0;
    }

    .btn-cerrar-modal {
      border: 0;
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 999px;
      background: #f0f6ff;
      color: #0a6ec0;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn-cerrar-modal:hover {
      background: #dbe9ff;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .modal-body p {
      margin: 0.5rem 0;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      text-align: right;
    }

    .btn-secondary {
      padding: 0.5rem 1rem;
      background: #edf2f9;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      color: #2d435e;
    }

    .btn-secondary:hover {
      background: #dbe6f8;
    }

    @media (max-width: 720px) {
      .barra-control {
        flex-direction: column;
        align-items: stretch;
      }

      .busqueda {
        width: 100%;
      }

      .resumen-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SuperAdminPagosComponent implements OnInit {
  pagos: Pago[] = [];
  cargando = true;
  tallerIdFiltro = '';
  estadoFiltro = '';
  pagoSeleccionado: Pago | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarPagos();
  }

  cargarPagos(): void {
    this.cargando = true;
    let url = 'http://localhost:8000/api/v1/admin/pagos?limit=100';
    if (this.tallerIdFiltro) {
      url += `&taller_id=${this.tallerIdFiltro}`;
    }
    if (this.estadoFiltro) {
      url += `&estado=${this.estadoFiltro}`;
    }
    
    this.http.get<any>(url, {
      headers: this.authService.obtenerHeadersAuth()
    }).subscribe({
      next: (data) => {
        this.pagos = data.pagos || [];
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando pagos:', err);
        this.cargando = false;
      }
    });
  }

  get totalMonto(): number {
    return this.pagos.reduce((sum, pago) => sum + pago.monto, 0);
  }

  formatearMonto(monto: number): string {
    return 'Bs. ' + monto.toFixed(2);
  }

  verDetalle(pago: Pago): void {
    this.pagoSeleccionado = pago;
  }

  cerrarModal(): void {
    this.pagoSeleccionado = null;
  }
}