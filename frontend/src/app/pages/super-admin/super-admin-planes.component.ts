import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface Plan {
  id: number;
  nombre: string;
  descripcion: string;
  precio_mensual: number;
  precio_anual: number;
  limite_tecnicos: number;
  limite_incidentes_mensual: number;
  activo: boolean;
}

@Component({
  selector: 'app-super-admin-planes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="planes-container">
      <!-- Hero / Header -->
      <div class="hero">
        <div>
          <h2>Gestión de Planes</h2>
          <p>Administra los planes de suscripción disponibles para los talleres.</p>
        </div>
        <button class="btn-primary" (click)="abrirModalEditar(null)">
          <span class="material-symbols-outlined">add</span>
          Nuevo Plan
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="cargando" class="loading">
        Cargando planes...
      </div>

      <!-- Grid de Planes -->
      <div class="planes-grid" *ngIf="!cargando">
        <div class="plan-card" *ngFor="let plan of planes" [class.inactivo]="!plan.activo">
          <div class="plan-header">
            <h3>{{ plan.nombre | uppercase }}</h3>
            <div class="plan-actions">
              <button class="btn-icon" (click)="abrirModalEditar(plan)" title="Editar">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </div>
          </div>
          <div class="plan-price">
            <span class="price">{{ plan.precio_mensual | currency:'USD':'symbol':'1.2-2' }}</span>
            <span class="period">/mes</span>
          </div>
          <div class="plan-price-annual">
            <span>{{ plan.precio_anual | currency:'USD':'symbol':'1.2-2' }}</span>
            <span>/año</span>
          </div>
          <div class="plan-features">
            <div class="feature">
              <span class="feature-label">👥 Técnicos:</span>
              <span class="feature-value">{{ plan.limite_tecnicos === 999 ? 'Ilimitados' : plan.limite_tecnicos }}</span>
            </div>
            <div class="feature">
              <span class="feature-label">📋 Incidentes/mes:</span>
              <span class="feature-value">{{ plan.limite_incidentes_mensual === 999 ? 'Ilimitados' : plan.limite_incidentes_mensual }}</span>
            </div>
          </div>
          <div class="plan-status">
            <span class="status-badge" [class.activo]="plan.activo" [class.inactivo]="!plan.activo">
              {{ plan.activo ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          <button class="btn-toggle" (click)="toggleActivo(plan)">
            {{ plan.activo ? 'Desactivar' : 'Activar' }}
          </button>
        </div>
      </div>

      <!-- Modal Editar/Crear Plan -->
      <div class="modal-backdrop" *ngIf="modalAbierto" (click)="cerrarModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <span class="material-symbols-outlined">plans</span>
              {{ planEditando ? 'Editar Plan' : 'Nuevo Plan' }}
            </h3>
            <button type="button" class="btn-cerrar-modal" (click)="cerrarModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Nombre del Plan</label>
              <input type="text" [(ngModel)]="formData.nombre" class="form-control" placeholder="Ej: Premium">
            </div>
            <div class="form-group">
              <label>Descripción</label>
              <textarea [(ngModel)]="formData.descripcion" class="form-control" rows="2" placeholder="Descripción del plan"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Precio Mensual (USD)</label>
                <input type="number" [(ngModel)]="formData.precio_mensual" class="form-control" step="0.01">
              </div>
              <div class="form-group">
                <label>Precio Anual (USD)</label>
                <input type="number" [(ngModel)]="formData.precio_anual" class="form-control" step="0.01">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Límite de Técnicos</label>
                <input type="number" [(ngModel)]="formData.limite_tecnicos" class="form-control" placeholder="999 = Ilimitado">
              </div>
              <div class="form-group">
                <label>Límite de Incidentes/mes</label>
                <input type="number" [(ngModel)]="formData.limite_incidentes_mensual" class="form-control" placeholder="999 = Ilimitado">
              </div>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="formData.activo">
                Plan Activo
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="cerrarModal()">Cancelar</button>
            <button type="button" class="btn-primary" (click)="guardarPlan()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .planes-container {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .btn-primary {
      background: linear-gradient(135deg, #0a6ec0 0%, #005ea4 100%);
      color: white;
      padding: 0.6rem 1rem;
      border: none;
      border-radius: 0.7rem;
      cursor: pointer;
      font-weight: 700;
      font-size: 0.78rem;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      box-shadow: 0 10px 24px rgba(0, 80, 150, 0.25);
    }

    .btn-primary:hover {
      filter: brightness(1.05);
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: #5f748e;
    }

    .planes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .plan-card {
      border-radius: 1rem;
      background: #fff;
      border: 1px solid #d9e3ef;
      box-shadow: 0 10px 24px rgba(3, 24, 51, 0.06);
      padding: 1.25rem;
      transition: all 0.2s;
    }

    .plan-card.inactivo {
      opacity: 0.6;
      background: #f8fafc;
    }

    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .plan-header h3 {
      margin: 0;
      font-family: 'Manrope', sans-serif;
      font-size: 1rem;
      font-weight: 800;
      color: #16293f;
    }

    .plan-actions {
      display: flex;
      gap: 0.5rem;
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

    .plan-price {
      margin-bottom: 0.25rem;
    }

    .price {
      font-size: 2rem;
      font-weight: bold;
      color: #0a6ec0;
      font-family: 'Manrope', sans-serif;
    }

    .period {
      color: #5f748e;
    }

    .plan-price-annual {
      color: #5f748e;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .plan-features {
      border-top: 1px solid #e2e8f0;
      padding-top: 1rem;
      margin-top: 1rem;
    }

    .feature {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0;
      font-size: 0.85rem;
    }

    .feature-label {
      color: #5f748e;
    }

    .feature-value {
      font-weight: 600;
      color: #2d435e;
    }

    .plan-status {
      margin: 1rem 0;
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .status-badge.activo {
      background: #d1fae5;
      color: #065f46;
    }

    .status-badge.inactivo {
      background: #fee2e2;
      color: #991b1b;
    }

    .btn-toggle {
      width: 100%;
      padding: 0.5rem;
      background: #f8fafc;
      border: 1px solid #d9e3ef;
      border-radius: 0.5rem;
      cursor: pointer;
      margin-top: 1rem;
      font-weight: 600;
      color: #2d435e;
    }

    .btn-toggle:hover {
      background: #edf2f9;
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
      width: min(520px, 100%);
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

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      text-align: right;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
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

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.25rem;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      color: #4d5f7a;
    }

    .form-control {
      width: 100%;
      padding: 0.68rem 0.75rem;
      border: 1.5px solid #d9e4ef;
      border-radius: 0.72rem;
      background: #f8fafd;
      font-size: 0.9rem;
    }

    .form-control:focus {
      outline: none;
      border-color: #0a6ec0;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(10, 110, 192, 0.1);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: normal;
      text-transform: none;
    }

    @media (max-width: 720px) {
      .planes-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SuperAdminPlanesComponent implements OnInit {
  planes: Plan[] = [];
  cargando = true;
  modalAbierto = false;
  planEditando: Plan | null = null;
  
  formData: Partial<Plan> = {
    nombre: '',
    descripcion: '',
    precio_mensual: 0,
    precio_anual: 0,
    limite_tecnicos: 2,
    limite_incidentes_mensual: 10,
    activo: true
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarPlanes();
  }

  cargarPlanes(): void {
    this.cargando = true;
    this.http.get<any[]>('http://localhost:8000/api/v1/admin/planes', {
      headers: this.authService.obtenerHeadersAuth()
    }).subscribe({
      next: (data) => {
        this.planes = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando planes:', err);
        this.cargando = false;
      }
    });
  }

  abrirModalEditar(plan: Plan | null): void {
    if (plan) {
      this.planEditando = plan;
      this.formData = { ...plan };
    } else {
      this.planEditando = null;
      this.formData = {
        nombre: '',
        descripcion: '',
        precio_mensual: 0,
        precio_anual: 0,
        limite_tecnicos: 2,
        limite_incidentes_mensual: 10,
        activo: true
      };
    }
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.planEditando = null;
  }

  guardarPlan(): void {
    if (!this.formData.nombre) {
      alert('El nombre del plan es requerido');
      return;
    }

    const url = this.planEditando 
      ? `http://localhost:8000/api/v1/admin/planes/${this.planEditando.id}`
      : 'http://localhost:8000/api/v1/admin/planes';
    
    const metodo = this.planEditando ? 'put' : 'post';

    this.http[metodo](url, this.formData, {
      headers: this.authService.obtenerHeadersAuth()
    }).subscribe({
      next: () => {
        alert(this.planEditando ? 'Plan actualizado correctamente' : 'Plan creado correctamente');
        this.cerrarModal();
        this.cargarPlanes();
      },
      error: (err) => {
        console.error('Error guardando plan:', err);
        alert('Error al guardar el plan');
      }
    });
  }

  toggleActivo(plan: Plan): void {
    const nuevoEstado = !plan.activo;
    const accion = nuevoEstado ? 'activado' : 'desactivado';
    
    this.http.put(`http://localhost:8000/api/v1/admin/planes/${plan.id}`, { activo: nuevoEstado }, {
      headers: this.authService.obtenerHeadersAuth()
    }).subscribe({
      next: () => {
        plan.activo = nuevoEstado;
        alert(`Plan ${accion} correctamente`);
      },
      error: (err) => {
        console.error('Error cambiando estado:', err);
        alert('Error al cambiar el estado del plan');
      }
    });
  }
}