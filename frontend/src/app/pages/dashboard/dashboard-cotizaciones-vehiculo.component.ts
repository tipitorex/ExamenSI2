import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface ItemCV {
  nombre: string;
  precio: number | null;
}

interface SolicitudCV {
  id: number;
  cliente_id: number;
  taller_id: number;
  descripcion: string;
  imagen_url: string | null;
  estado: string;
  respuesta_items: { nombre: string; precio: number }[] | null;
  respuesta_monto: number | null;
  respuesta_descripcion: string | null;
  respuesta_tiempo_horas: number | null;
  creado_en: string;
  respondido_en: string | null;
  cliente: { id: number; nombre_completo: string; telefono: string | null } | null;
}

@Component({
  selector: 'app-dashboard-cotizaciones-vehiculo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="cv-container">

  <!-- Header -->
  <div class="cv-header">
    <div>
      <h1 class="cv-title">Cotizaciones de Vehículo</h1>
      <p class="cv-subtitle">Solicitudes de clientes que quieren conocer el costo de una reparación.</p>
    </div>
    <div class="cv-filtros">
      <button class="filtro-btn" [class.active]="filtro === 'todas'"    (click)="filtro='todas'">
        Todas <span class="badge">{{ solicitudes.length }}</span>
      </button>
      <button class="filtro-btn" [class.active]="filtro === 'pendiente'" (click)="filtro='pendiente'">
        Pendientes <span class="badge badge-naranja">{{ contarPor('pendiente') }}</span>
      </button>
      <button class="filtro-btn" [class.active]="filtro === 'respondida'" (click)="filtro='respondida'">
        Respondidas <span class="badge badge-verde">{{ contarPor('respondida') }}</span>
      </button>
    </div>
  </div>

  <!-- Loading -->
  <div *ngIf="cargando" class="cv-loading">
    <div class="spinner"></div><p>Cargando solicitudes…</p>
  </div>

  <!-- Empty -->
  <div *ngIf="!cargando && solicitudesFiltradas.length === 0" class="cv-empty">
    <span class="material-symbols-outlined">car_repair</span>
    <p>No hay solicitudes {{ filtro !== 'todas' ? 'en este estado' : '' }}</p>
  </div>

  <!-- Grid -->
  <div *ngIf="!cargando && solicitudesFiltradas.length > 0" class="cv-grid">
    <div *ngFor="let s of solicitudesFiltradas" class="cv-card" [class.cv-card-respondida]="s.estado === 'respondida'">

      <!-- Top bar -->
      <div class="cv-card-top">
        <div class="cv-card-cliente">
          <div class="avatar">{{ (s.cliente?.nombre_completo || 'C')[0].toUpperCase() }}</div>
          <div>
            <p class="cliente-nombre">{{ s.cliente?.nombre_completo || 'Cliente #' + s.cliente_id }}</p>
            <p class="cliente-tel" *ngIf="s.cliente?.telefono">📞 {{ s.cliente?.telefono }}</p>
          </div>
        </div>
        <span class="estado-badge" [class]="'estado-' + s.estado">{{ s.estado }}</span>
      </div>

      <!-- Imagen -->
      <div class="cv-imagen-wrap" *ngIf="s.imagen_url">
        <img [src]="mediaBase + '/' + s.imagen_url" alt="Foto vehículo" class="cv-imagen"
             (click)="abrirImagen(s.imagen_url!)" />
        <span class="cv-imagen-label">Foto del vehículo (clic para ampliar)</span>
      </div>
      <div class="cv-sin-imagen" *ngIf="!s.imagen_url">
        <span class="material-symbols-outlined">no_photography</span>
        <span>Sin foto adjunta</span>
      </div>

      <!-- Descripción -->
      <div class="cv-descripcion">
        <span class="material-symbols-outlined">description</span>
        <p>{{ s.descripcion }}</p>
      </div>

      <!-- Respuesta existente -->
      <div *ngIf="s.estado === 'respondida'" class="cv-respuesta">
        <div class="cv-respuesta-header">
          <span class="material-symbols-outlined">check_circle</span>
          <span>Tu cotización enviada</span>
        </div>
        <div class="cv-items-tabla" *ngIf="s.respuesta_items && s.respuesta_items.length > 0">
          <div *ngFor="let item of s.respuesta_items" class="cv-item-row">
            <span class="cv-item-nombre">{{ item.nombre }}</span>
            <span class="cv-item-precio">Bs. {{ item.precio.toFixed(2) }}</span>
          </div>
          <div class="cv-item-total">
            <span>Total</span>
            <span>Bs. {{ s.respuesta_monto?.toFixed(2) }}</span>
          </div>
        </div>
        <p class="cv-respuesta-desc" *ngIf="s.respuesta_descripcion">{{ s.respuesta_descripcion }}</p>
        <p class="cv-respuesta-tiempo" *ngIf="s.respuesta_tiempo_horas">
          ⏱ Tiempo estimado: {{ formatHoras(s.respuesta_tiempo_horas) }}
        </p>
        <button class="btn-re-cotizar" (click)="abrirModal(s)">Editar cotización</button>
      </div>

      <!-- Botón responder -->
      <div *ngIf="s.estado === 'pendiente'" class="cv-acciones">
        <p class="cv-fecha">Recibida: {{ formatFecha(s.creado_en) }}</p>
        <button class="btn-cotizar" (click)="abrirModal(s)">
          <span class="material-symbols-outlined">request_quote</span>
          Enviar Cotización
        </button>
      </div>

    </div>
  </div>

</div>

<!-- Modal Cotizar -->
<div *ngIf="modalAbierto" class="modal-overlay" (click)="cerrarModal()">
  <div class="modal-card" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <h3>Enviar Cotización</h3>
      <button class="btn-close" (click)="cerrarModal()">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>

    <!-- Vista previa del vehículo -->
    <div *ngIf="solicitudActual?.imagen_url" class="modal-preview">
      <img [src]="mediaBase + '/' + solicitudActual!.imagen_url" alt="Vehículo" />
    </div>
    <div class="modal-descripcion">
      <span class="material-symbols-outlined">info</span>
      <p>{{ solicitudActual?.descripcion }}</p>
    </div>

    <div class="modal-body">
      <!-- Items -->
      <label class="field-label">Servicios a cobrar *</label>
      <div *ngFor="let item of modalItems; let i = index" class="modal-item-row">
        <input type="text" [(ngModel)]="item.nombre" placeholder="Nombre del servicio" class="input-nombre" />
        <div class="precio-wrap">
          <span class="precio-prefix">Bs.</span>
          <input type="number" [(ngModel)]="item.precio" placeholder="0.00" min="0" step="0.01" class="input-precio" />
        </div>
        <button class="btn-del-item" [disabled]="modalItems.length === 1" (click)="eliminarItem(i)">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
      <button class="btn-add-item" (click)="agregarItem()">
        <span class="material-symbols-outlined">add</span> Agregar servicio
      </button>

      <!-- Total calculado -->
      <div class="modal-total">
        <span>Total calculado</span>
        <strong>Bs. {{ totalModal.toFixed(2) }}</strong>
      </div>

      <!-- Descripción y tiempo -->
      <div class="form-row">
        <div class="form-group">
          <label class="field-label">Descripción / Diagnóstico *</label>
          <textarea [(ngModel)]="modalDescripcion" placeholder="Describe el trabajo a realizar, diagnóstico encontrado..." class="input-textarea" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label class="field-label">Tiempo estimado (horas) *</label>
          <input type="number" [(ngModel)]="modalTiempoHoras" placeholder="Ej: 1.5" min="0.5" step="0.5" class="input-text" />
          <small>1.5 = 1h 30min</small>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-cancelar" (click)="cerrarModal()">Cancelar</button>
      <button class="btn-enviar" [disabled]="enviando" (click)="enviarCotizacion()">
        <span class="material-symbols-outlined">send</span>
        {{ enviando ? 'Enviando…' : 'Enviar Cotización' }}
      </button>
    </div>
  </div>
</div>

<!-- Lightbox imagen -->
<div *ngIf="imagenAmpliada" class="lightbox" (click)="imagenAmpliada = null">
  <img [src]="imagenAmpliada" alt="Vehículo ampliado" />
</div>
  `,
  styles: [`
    .cv-container { padding: 28px 32px; max-width: 1100px; margin: 0 auto; }
    .cv-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 28px; }
    .cv-title { font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0; }
    .cv-subtitle { color: #64748b; margin: 4px 0 0; font-size: 14px; }
    .cv-filtros { display: flex; gap: 8px; flex-wrap: wrap; }
    .filtro-btn { padding: 6px 14px; border-radius: 9999px; border: 1.5px solid #d1d5db; background: #fff; cursor: pointer; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all .15s; }
    .filtro-btn.active { background: #005EA4; border-color: #005EA4; color: #fff; }
    .badge { background: #e5e7eb; color: #374151; border-radius: 9999px; padding: 1px 7px; font-size: 11px; font-weight: 700; }
    .filtro-btn.active .badge { background: rgba(255,255,255,0.25); color: #fff; }
    .badge-naranja { background: #fed7aa; color: #9a3412; }
    .badge-verde { background: #d1fae5; color: #065f46; }
    .cv-loading, .cv-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 64px; color: #64748b; }
    .cv-empty .material-symbols-outlined { font-size: 56px; color: #cbd5e1; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #005EA4; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .cv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
    .cv-card { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,.07); border: 1.5px solid #e5e7eb; overflow: hidden; display: flex; flex-direction: column; }
    .cv-card-respondida { border-color: #bbf7d0; }
    .cv-card-top { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: #005EA4; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; }
    .cv-card-cliente { display: flex; align-items: center; gap: 10px; }
    .cliente-nombre { font-weight: 600; font-size: 14px; margin: 0; }
    .cliente-tel { font-size: 12px; color: #64748b; margin: 0; }
    .estado-badge { padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
    .estado-pendiente { background: #fed7aa; color: #9a3412; }
    .estado-respondida { background: #d1fae5; color: #065f46; }
    .estado-cerrada { background: #e5e7eb; color: #374151; }
    .cv-imagen-wrap { position: relative; padding: 12px 16px 0; }
    .cv-imagen { width: 100%; max-height: 200px; object-fit: cover; border-radius: 10px; cursor: zoom-in; }
    .cv-imagen-label { font-size: 11px; color: #94a3b8; display: block; margin-top: 4px; }
    .cv-sin-imagen { display: flex; align-items: center; gap: 8px; padding: 12px 16px; color: #94a3b8; font-size: 13px; }
    .cv-descripcion { display: flex; gap: 8px; padding: 12px 16px; background: #f8fafc; margin: 12px 16px; border-radius: 8px; }
    .cv-descripcion .material-symbols-outlined { color: #64748b; font-size: 18px; flex-shrink: 0; margin-top: 1px; }
    .cv-descripcion p { font-size: 13px; color: #374151; margin: 0; line-height: 1.5; }
    .cv-respuesta { margin: 0 16px 16px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 14px; }
    .cv-respuesta-header { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #065f46; margin-bottom: 10px; }
    .cv-respuesta-header .material-symbols-outlined { font-size: 18px; }
    .cv-items-tabla { background: #fff; border-radius: 8px; overflow: hidden; margin-bottom: 10px; border: 1px solid #d1fae5; }
    .cv-item-row { display: flex; justify-content: space-between; padding: 7px 12px; font-size: 13px; border-bottom: 1px solid #f0fdf4; }
    .cv-item-nombre { color: #374151; }
    .cv-item-precio { font-weight: 600; color: #065f46; }
    .cv-item-total { display: flex; justify-content: space-between; padding: 8px 12px; font-weight: 700; font-size: 14px; background: #dcfce7; color: #065f46; }
    .cv-respuesta-desc { font-size: 13px; color: #374151; margin: 6px 0; }
    .cv-respuesta-tiempo { font-size: 12px; color: #64748b; margin: 4px 0 10px; }
    .btn-re-cotizar { font-size: 12px; color: #005EA4; background: none; border: 1px solid #005EA4; padding: 4px 12px; border-radius: 6px; cursor: pointer; }
    .cv-acciones { padding: 12px 16px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: auto; }
    .cv-fecha { font-size: 12px; color: #94a3b8; margin: 0; }
    .btn-cotizar { display: flex; align-items: center; gap: 6px; background: #005EA4; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-cotizar:hover { background: #004a87; }
    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal-card { background: #fff; border-radius: 20px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 16px; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; background: #fff; z-index: 1; }
    .modal-header h3 { margin: 0; font-size: 18px; font-weight: 700; }
    .btn-close { background: none; border: none; cursor: pointer; color: #64748b; }
    .modal-preview { padding: 16px 24px 0; }
    .modal-preview img { width: 100%; max-height: 180px; object-fit: cover; border-radius: 12px; }
    .modal-descripcion { display: flex; gap: 8px; margin: 12px 24px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #374151; }
    .modal-descripcion .material-symbols-outlined { color: #64748b; font-size: 16px; flex-shrink: 0; }
    .modal-descripcion p { margin: 0; }
    .modal-body { padding: 16px 24px; display: flex; flex-direction: column; gap: 14px; }
    .field-label { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; display: block; }
    .modal-item-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
    .input-nombre { flex: 1; padding: 8px 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; }
    .precio-wrap { display: flex; align-items: center; border: 1.5px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .precio-prefix { padding: 0 8px; background: #f1f5f9; font-size: 13px; color: #64748b; height: 100%; display: flex; align-items: center; }
    .input-precio { width: 80px; padding: 8px 8px; border: none; font-size: 13px; outline: none; }
    .btn-del-item { background: none; border: none; cursor: pointer; color: #ef4444; flex-shrink: 0; }
    .btn-del-item:disabled { color: #d1d5db; }
    .btn-add-item { display: flex; align-items: center; gap: 4px; background: none; border: 1.5px dashed #d1d5db; border-radius: 8px; padding: 8px 14px; font-size: 13px; color: #64748b; cursor: pointer; width: 100%; justify-content: center; }
    .modal-total { display: flex; justify-content: space-between; align-items: center; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px 14px; font-size: 15px; font-weight: 700; color: #1e40af; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; }
    .input-textarea, .input-text { padding: 8px 10px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 13px; font-family: inherit; resize: vertical; }
    .input-text { resize: none; }
    small { color: #94a3b8; font-size: 11px; margin-top: 3px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e5e7eb; position: sticky; bottom: 0; background: #fff; }
    .btn-cancelar { padding: 9px 18px; border: 1.5px solid #e5e7eb; border-radius: 9px; background: #fff; font-size: 14px; cursor: pointer; }
    .btn-enviar { display: flex; align-items: center; gap: 6px; padding: 9px 18px; background: #005EA4; color: #fff; border: none; border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-enviar:disabled { background: #93c5fd; }
    /* Lightbox */
    .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,.85); display: flex; align-items: center; justify-content: center; z-index: 2000; cursor: zoom-out; padding: 20px; }
    .lightbox img { max-width: 100%; max-height: 90vh; border-radius: 8px; }
  `],
})
export class DashboardCotizacionesVehiculoComponent implements OnInit {
  solicitudes: SolicitudCV[] = [];
  cargando = true;
  filtro: 'todas' | 'pendiente' | 'respondida' = 'todas';

  modalAbierto = false;
  solicitudActual: SolicitudCV | null = null;
  modalItems: ItemCV[] = [{ nombre: '', precio: null }];
  modalDescripcion = '';
  modalTiempoHoras: number | null = null;
  enviando = false;
  imagenAmpliada: string | null = null;

  private readonly apiUrl = 'http://localhost:8000/api/v1';
  readonly mediaBase = 'http://localhost:8000';

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() { this.cargar(); }

  private headers(): HttpHeaders {
    const token = this.auth.obtenerToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  cargar() {
    this.cargando = true;
    this.http.get<SolicitudCV[]>(
      `${this.apiUrl}/cotizaciones-vehiculo/taller/pendientes`,
      { headers: this.headers() }
    ).subscribe({
      next: data => { this.solicitudes = data; this.cargando = false; },
      error: () => { this.cargando = false; },
    });
  }

  get solicitudesFiltradas(): SolicitudCV[] {
    if (this.filtro === 'todas') return this.solicitudes;
    return this.solicitudes.filter(s => s.estado === this.filtro);
  }

  contarPor(estado: string): number {
    return this.solicitudes.filter(s => s.estado === estado).length;
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  formatHoras(h: number): string {
    const horas = Math.floor(h);
    const min = Math.round((h - horas) * 60);
    return min > 0 ? `${horas}h ${min}min` : `${horas}h`;
  }

  abrirModal(s: SolicitudCV) {
    this.solicitudActual = s;
    if (s.respuesta_items && s.respuesta_items.length > 0) {
      this.modalItems = s.respuesta_items.map(i => ({ nombre: i.nombre, precio: i.precio }));
    } else {
      this.modalItems = [{ nombre: '', precio: null }];
    }
    this.modalDescripcion = s.respuesta_descripcion ?? '';
    this.modalTiempoHoras = s.respuesta_tiempo_horas ?? null;
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.solicitudActual = null;
    this.modalItems = [{ nombre: '', precio: null }];
    this.modalDescripcion = '';
    this.modalTiempoHoras = null;
  }

  agregarItem() { this.modalItems.push({ nombre: '', precio: null }); }
  eliminarItem(i: number) { if (this.modalItems.length > 1) this.modalItems.splice(i, 1); }

  get totalModal(): number {
    return this.modalItems.reduce((s, i) => s + (i.precio || 0), 0);
  }

  enviarCotizacion() {
    const items = this.modalItems.filter(i => i.nombre.trim() && i.precio && i.precio > 0);
    if (items.length === 0) { alert('Agrega al menos un servicio con nombre y precio'); return; }
    if (!this.modalDescripcion.trim()) { alert('Escribe un diagnóstico o descripción'); return; }
    if (!this.modalTiempoHoras || this.modalTiempoHoras <= 0) { alert('Ingresa el tiempo estimado en horas'); return; }

    this.enviando = true;
    const payload = {
      items: items.map(i => ({ nombre: i.nombre.trim(), precio: i.precio! })),
      descripcion: this.modalDescripcion.trim(),
      tiempo_horas: this.modalTiempoHoras,
    };

    this.http.post<SolicitudCV>(
      `${this.apiUrl}/cotizaciones-vehiculo/${this.solicitudActual!.id}/responder`,
      payload,
      { headers: this.headers() }
    ).subscribe({
      next: updated => {
        const idx = this.solicitudes.findIndex(s => s.id === updated.id);
        if (idx !== -1) this.solicitudes[idx] = updated;
        this.enviando = false;
        this.cerrarModal();
      },
      error: () => { this.enviando = false; alert('Error al enviar la cotización'); },
    });
  }

  abrirImagen(url: string) {
    this.imagenAmpliada = this.mediaBase + '/' + url;
  }
}
