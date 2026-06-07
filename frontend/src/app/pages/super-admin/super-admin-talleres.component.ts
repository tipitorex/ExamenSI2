import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface Taller {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  plan_id: number;
  plan_nombre: string;
  suscripcion_activa_hasta: string | null;
  activo: boolean;
  creado_en: string;
}

@Component({
  selector: 'app-super-admin-talleres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="talleres-container">
      <!-- Hero / Header -->
      <div class="hero">
        <div>
          <h2>Gestión de Talleres</h2>
          <p>Administra todos los talleres registrados en la plataforma.</p>
        </div>
      </div>

      <!-- Barra de control -->
      <div class="barra-control">
        <div class="filtros">
          <div class="busqueda">
            <span class="material-symbols-outlined">search</span>
            <input 
              type="text" 
              [(ngModel)]="busqueda" 
              (input)="cargarTalleres()"
              placeholder="Buscar por nombre o email..."
            />
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="cargando" class="loading">
        Cargando talleres...
      </div>

      <!-- Tabla -->
      <div class="tabla-wrapper" *ngIf="!cargando">
        <table class="tabla-talleres">
          <thead>
            <tr>
              <th>ID</th>
              <th>Taller</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Suscripción</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let taller of talleres">
              <td><strong>{{ taller.id }}</strong></td>
              <td>
                <div class="fila-nombre">
                  <div class="avatar-sm">{{ obtenerIniciales(taller.nombre) }}</div>
                  <span class="nombre-taller">{{ taller.nombre }}</span>
                </div>
              </td>
              <td>{{ taller.email }}</td>
              <td>
                <span class="plan-badge" [class.premium]="taller.plan_nombre === 'premium'">
                  {{ taller.plan_nombre }}
                </span>
              </td>
              <td>
                <span *ngIf="taller.suscripcion_activa_hasta" class="fecha-suscripcion">
                  {{ taller.suscripcion_activa_hasta | date:'dd/MM/yyyy' }}
                </span>
                <span *ngIf="!taller.suscripcion_activa_hasta" class="text-muted">
                  Sin suscripción
                </span>
              </td>
              <td>
                <span class="estado-badge" [class.activo]="taller.activo" [class.inactivo]="!taller.activo">
                  {{ taller.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <div class="acciones-tabla">
                  <button class="btn-icon" (click)="verDetalle(taller.id)" title="Ver detalle">
                    <span class="material-symbols-outlined">visibility</span>
                  </button>
                  <button class="btn-icon" (click)="cambiarEstado(taller)" [title]="taller.activo ? 'Desactivar' : 'Activar'">
                    <span class="material-symbols-outlined">{{ taller.activo ? 'toggle_on' : 'toggle_off' }}</span>
                  </button>
                </div>
              </td>
             </tr>
            <tr *ngIf="talleres.length === 0">
              <td colspan="7" class="tabla-vacia">
                <span class="material-symbols-outlined">inbox</span>
                No hay talleres registrados
              </td>
             </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal de detalle -->
      <div class="modal-backdrop" *ngIf="tallerSeleccionado" (click)="cerrarModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>
              <span class="material-symbols-outlined">business</span>
              Detalle del Taller
            </h3>
            <button type="button" class="btn-cerrar-modal" (click)="cerrarModal()">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <p><strong>ID:</strong> {{ tallerSeleccionado.id }}</p>
            <p><strong>Nombre:</strong> {{ tallerSeleccionado.nombre }}</p>
            <p><strong>Email:</strong> {{ tallerSeleccionado.email }}</p>
            <p><strong>Teléfono:</strong> {{ tallerSeleccionado.telefono || 'No registrado' }}</p>
            <p><strong>Plan:</strong> {{ tallerSeleccionado.plan_nombre }}</p>
            <p><strong>Técnicos:</strong> {{ tallerSeleccionado.tecnicos_count || 0 }}</p>
            <p><strong>Estado:</strong> {{ tallerSeleccionado.activo ? 'Activo' : 'Inactivo' }}</p>
            <p><strong>Creado:</strong> {{ tallerSeleccionado.creado_en | date:'dd/MM/yyyy HH:mm' }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="cerrarModal()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .talleres-container {
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
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .busqueda {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      border: 1px solid #d2dbe8;
      border-radius: 999px;
      background: #fbfdff;
      padding: 0.42rem 0.72rem;
      min-width: min(280px, 100%);
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

    .loading {
      text-align: center;
      padding: 2rem;
      color: #5f748e;
    }

    .tabla-wrapper {
      border-radius: 1rem;
      border: 1px solid #d9e4ef;
      background: #fff;
      box-shadow: 0 10px 26px rgba(3, 22, 49, 0.06);
      overflow: hidden;
      overflow-x: auto;
    }

    .tabla-talleres {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.83rem;
    }

    .tabla-talleres thead {
      background: #f4f8fd;
    }

    .tabla-talleres th {
      text-align: left;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: #5d748f;
      padding: 0.75rem 0.9rem;
      border-bottom: 1px solid #d9e4ef;
    }

    .tabla-talleres td {
      padding: 0.72rem 0.9rem;
      vertical-align: middle;
      border-bottom: 1px solid #ecf1f8;
    }

    .tabla-talleres tbody tr:hover td {
      background: #f7fbff;
    }

    .fila-nombre {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }

    .avatar-sm {
      width: 2.1rem;
      height: 2.1rem;
      border-radius: 999px;
      background: linear-gradient(140deg, #1f78cc, #005ea4);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.65rem;
      flex: 0 0 auto;
    }

    .nombre-taller {
      font-family: 'Manrope', sans-serif;
      font-weight: 700;
      color: #1a2d45;
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

    .estado-badge.activo {
      background: #d1fae5;
      color: #065f46;
    }

    .estado-badge.inactivo {
      background: #fee2e2;
      color: #991b1b;
    }

    .fecha-suscripcion {
      font-size: 0.8rem;
      color: #2d435e;
    }

    .text-muted {
      color: #94a3b8;
      font-size: 0.75rem;
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
    }
  `]
})
export class SuperAdminTalleresComponent implements OnInit {
  talleres: Taller[] = [];
  cargando = true;
  busqueda = '';
  tallerSeleccionado: any = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarTalleres();
  }

  obtenerIniciales(nombre: string): string {
    const partes = nombre.trim().split(' ').filter(Boolean);
    if (partes.length === 0) return 'TL';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }

  cargarTalleres(): void {
    this.cargando = true;
    let url = 'http://localhost:8000/api/v1/admin/talleres?limit=100';
    if (this.busqueda) {
      url += `&busqueda=${this.busqueda}`;
    }
    
    this.http.get<any>(url, {
      headers: this.authService.obtenerHeadersAuth()
    }).subscribe({
      next: (data) => {
        this.talleres = data.talleres || [];
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando talleres:', err);
        this.cargando = false;
      }
    });
  }

  verDetalle(id: number): void {
    this.http.get(`http://localhost:8000/api/v1/admin/talleres/${id}`, {
      headers: this.authService.obtenerHeadersAuth()
    }).subscribe({
      next: (data) => {
        this.tallerSeleccionado = data;
      },
      error: (err) => {
        console.error('Error cargando detalle:', err);
      }
    });
  }

  cambiarEstado(taller: Taller): void {
    const nuevoEstado = !taller.activo;
    const accion = nuevoEstado ? 'activado' : 'desactivado';
    
    this.http.put(`http://localhost:8000/api/v1/admin/talleres/${taller.id}/estado?activo=${nuevoEstado}`, {}, {
      headers: this.authService.obtenerHeadersAuth()
    }).subscribe({
      next: () => {
        taller.activo = nuevoEstado;
        alert(`Taller ${accion} correctamente`);
      },
      error: (err) => {
        console.error('Error cambiando estado:', err);
        alert('Error al cambiar el estado');
      }
    });
  }

  cerrarModal(): void {
    this.tallerSeleccionado = null;
  }
}